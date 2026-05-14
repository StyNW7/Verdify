package seed

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"math"
	"time"

	"github.com/verdify/backend/models"
)

// bookingsPerPersona is the target count emitted by GenerateBookingsForPersona;
// the actual count varies by ±1 because confirmed-vs-cancelled distribution is
// derived from a hash of the persona email.
const bookingsPerPersona = 12

// GenerateBookingsForPersona returns a deterministic slice of synthetic
// bookings for persona, distributed across the trailing ~30 days from now.
// The function makes NO network calls; route snapshots are tagged
// dataSource=fallback_synthetic and contain no polylines.
//
// Determinism: identical (persona, now) input produces byte-identical output.
// Variation across personas comes from a SHA-256 of persona.Email mixed with
// a per-booking index — no time.Now, no rand.Seed.
func GenerateBookingsForPersona(p Persona, now time.Time) []models.Booking {
	now = now.UTC()
	bookings := make([]models.Booking, 0, bookingsPerPersona)

	homePlaces := PlacesByCity(p.BaseCity)
	if len(homePlaces) == 0 {
		homePlaces = Places
	}

	for i := 0; i < bookingsPerPersona; i++ {
		h := hashSeed(p.Email, i)

		origin := pickHomeBiased(homePlaces, h, 0)
		destination := pickAway(origin, h, 1)

		daysAgo := int(h[2])%30 + 1
		hourOffset := int(h[3]) % 14
		createdAt := now.AddDate(0, 0, -daysAgo).Add(time.Duration(hourOffset) * time.Hour)

		status := pickStatus(i, h)
		snapshot := buildSnapshot(origin, destination, createdAt, h)
		points := snapshot.GreenPointsEstimate

		var actualPoints int
		var completedAt *time.Time
		if status == "completed" {
			actualPoints = points
			ca := createdAt.Add(time.Duration(snapshot.TotalDuration) * time.Minute)
			completedAt = &ca
		}

		paymentStatus := "paid"
		if status == "cancelled" {
			paymentStatus = "refunded"
		}

		bookings = append(bookings, models.Booking{
			ID:               fmt.Sprintf("seed_%s_%02d", emailKey(p.Email), i),
			UserID:           p.Email,
			RouteID:          snapshot.RouteID,
			ActiveRouteID:    snapshot.RouteID,
			RouteSnapshot:    snapshot,
			Passengers:       1 + int(h[4])%3,
			Status:           status,
			QRCode:           "",
			BookingReference: fmt.Sprintf("VFY-%s-%02X%02X", emailKey(p.Email)[:3], h[5], h[6]),
			EstimatedPoints:  points,
			ActualPoints:     actualPoints,
			PaymentStatus:    paymentStatus,
			RerouteHistory:   nil,
			CreatedAt:        createdAt,
			CompletedAt:      completedAt,
		})
	}

	return bookings
}

// pickStatus distributes statuses so each persona has at least one completed,
// up to two confirmed (the upcoming-trip slot), and an occasional cancelled.
// Index-driven, so deterministic.
func pickStatus(i int, h [32]byte) string {
	if i == 0 || i == 1 {
		return "confirmed"
	}
	if int(h[7])%9 == 0 {
		return "cancelled"
	}
	return "completed"
}

func pickHomeBiased(home []Place, h [32]byte, off int) Place {
	if int(h[off])%4 == 0 {
		return Places[int(h[off+8])%len(Places)]
	}
	return home[int(h[off+8])%len(home)]
}

func pickAway(origin Place, h [32]byte, off int) Place {
	for attempt := 0; attempt < 8; attempt++ {
		idx := int(h[off]+byte(attempt)) % len(Places)
		if Places[idx].Name != origin.Name {
			return Places[idx]
		}
	}
	return Places[(int(h[off])+1)%len(Places)]
}

// buildSnapshot fabricates a RouteOption with plausible distance/duration/
// carbon numbers. Distance is the great-circle distance plus a small
// hash-driven perturbation; duration assumes a mixed-mode 35 km/h average;
// carbon and points scale linearly off distance.
func buildSnapshot(origin, destination Place, createdAt time.Time, h [32]byte) models.RouteOption {
	distKm := haversineKM(origin.Loc, destination.Loc)
	if distKm < 1.5 {
		distKm = 1.5
	}
	jitter := 1.0 + float64(int(h[10])%20-10)/100.0
	distKm = round2(distKm * jitter)

	durationMin := int(math.Round(distKm/35.0*60.0)) + 5
	carbonGrams := round2(distKm * 45.0)
	baselineGrams := round2(distKm * 180.0)
	savedGrams := round2(baselineGrams - carbonGrams)
	savingsPct := int(math.Round((savedGrams / baselineGrams) * 100))
	estCost := round2(2.0 + distKm*0.55)
	points := int(math.Round(distKm*1.4)) + 5

	steps := []models.TransportSegment{
		{
			Type:          "walking",
			StartLocation: origin.Loc,
			EndLocation:   midpoint(origin.Loc, destination.Loc, 0.1),
			Distance:      round2(distKm * 0.08),
			Duration:      6,
			CarbonPerKm:   0,
			TotalCarbon:   0,
			EstimatedCost: 0,
			Departure:     createdAt,
			Arrival:       createdAt.Add(6 * time.Minute),
			Instruction:   fmt.Sprintf("Walk to nearest stop near %s", origin.Name),
		},
		{
			Type:          transitMode(h[11]),
			StartLocation: midpoint(origin.Loc, destination.Loc, 0.1),
			EndLocation:   midpoint(origin.Loc, destination.Loc, 0.9),
			Distance:      round2(distKm * 0.84),
			Duration:      durationMin - 12,
			CarbonPerKm:   45,
			TotalCarbon:   carbonGrams,
			EstimatedCost: estCost,
			Departure:     createdAt.Add(6 * time.Minute),
			Arrival:       createdAt.Add(time.Duration(durationMin-6) * time.Minute),
			TransitLine:   transitLine(h[12]),
			DepartureStop: origin.Name + " Station",
			ArrivalStop:   destination.Name + " Station",
			Headsign:      "Towards " + destination.Name,
			StopCount:     2 + int(h[13])%6,
			Instruction:   fmt.Sprintf("Board %s towards %s", transitLine(h[12]), destination.Name),
		},
		{
			Type:          "walking",
			StartLocation: midpoint(origin.Loc, destination.Loc, 0.9),
			EndLocation:   destination.Loc,
			Distance:      round2(distKm * 0.08),
			Duration:      6,
			CarbonPerKm:   0,
			TotalCarbon:   0,
			EstimatedCost: 0,
			Departure:     createdAt.Add(time.Duration(durationMin-6) * time.Minute),
			Arrival:       createdAt.Add(time.Duration(durationMin) * time.Minute),
			Instruction:   fmt.Sprintf("Walk to %s", destination.Name),
		},
	}

	return models.RouteOption{
		RouteID:              fmt.Sprintf("route_seed_%02X%02X%02X", h[14], h[15], h[16]),
		Mode:                 pickMode(h[17]),
		TotalDistance:        distKm,
		TotalDuration:        durationMin,
		CarbonEstimate:       carbonGrams,
		CarbonBaseline:       baselineGrams,
		CarbonSavedGrams:     savedGrams,
		CarbonSavingsPercent: savingsPct,
		CarbonEstimateKg:     round2(carbonGrams / 1000.0),
		EstimatedCost:        estCost,
		GreenPointsEstimate:  points,
		Steps:                steps,
		Polyline:             "",
		Reasoning:            "Synthetic seed snapshot.",
		RecommendedFor:       []string{"demo"},
		Recommended:          true,
		DataSource:           "fallback_synthetic",
		CreatedAt:            createdAt,
	}
}

func transitMode(b byte) string {
	switch int(b) % 5 {
	case 0:
		return "lrt"
	case 1:
		return "mrt"
	case 2:
		return "bus"
	case 3:
		return "ets"
	default:
		return "ev_taxi"
	}
}

func transitLine(b byte) string {
	lines := []string{"Kelana Jaya Line", "Kajang Line", "Putrajaya Line", "RapidKL Bus T200", "ETS Gold", "Causeway Link CW2"}
	return lines[int(b)%len(lines)]
}

func pickMode(b byte) string {
	switch int(b) % 3 {
	case 0:
		return "fast"
	case 1:
		return "eco"
	default:
		return "cheap"
	}
}

func hashSeed(email string, idx int) [32]byte {
	buf := make([]byte, 0, len(email)+8)
	buf = append(buf, []byte(email)...)
	var idxBuf [8]byte
	binary.BigEndian.PutUint64(idxBuf[:], uint64(idx))
	buf = append(buf, idxBuf[:]...)
	return sha256.Sum256(buf)
}

// emailKey strips the "@verdify.demo" suffix and any non-alphanumeric chars
// so it can be slugged into a Firestore doc id.
func emailKey(email string) string {
	out := make([]byte, 0, len(email))
	for i := 0; i < len(email); i++ {
		c := email[i]
		if c == '@' {
			break
		}
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			out = append(out, c)
		}
	}
	return string(out)
}

func haversineKM(a, b models.Location) float64 {
	const r = 6371.0
	la1 := a.Latitude * math.Pi / 180
	la2 := b.Latitude * math.Pi / 180
	dla := (b.Latitude - a.Latitude) * math.Pi / 180
	dlo := (b.Longitude - a.Longitude) * math.Pi / 180
	h := math.Sin(dla/2)*math.Sin(dla/2) + math.Cos(la1)*math.Cos(la2)*math.Sin(dlo/2)*math.Sin(dlo/2)
	return 2 * r * math.Asin(math.Sqrt(h))
}

func midpoint(a, b models.Location, t float64) models.Location {
	return models.Location{
		Latitude:  a.Latitude + (b.Latitude-a.Latitude)*t,
		Longitude: a.Longitude + (b.Longitude-a.Longitude)*t,
	}
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
