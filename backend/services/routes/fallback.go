package routes

import (
	"math"
	"time"

	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services/pricing"
)

// SyntheticCandidates returns three deterministic, mode-aligned candidates
// derived from the great-circle distance only. Used both as the v0
// hardcoded data path AND as the per-mode fallback when a live Google
// Routes API call fails.
func SyntheticCandidates(origin, destination models.Location) []models.RouteCandidate {
	distance := haversineKM(origin.Latitude, origin.Longitude, destination.Latitude, destination.Longitude)
	if distance < 3 {
		distance = 3
	}
	now := time.Now().UTC()

	fastDistance := pricing.Round2(distance)
	ecoDistance := pricing.Round2(distance * 1.12)
	cheapDistance := pricing.Round2(distance * 1.22)

	fast := models.RouteCandidate{
		ID:            "cand_fast",
		Label:         "Fast EV taxi",
		TotalDistance: fastDistance,
		TotalDuration: int(math.Round((fastDistance/42.0)*60.0)) + 8,
		TotalCarbon:   fastDistance * 80,
		Congestion:    0.78,
		Steps: []models.TransportSegment{
			synthSegment("ev_taxi", origin, destination, fastDistance,
				int(math.Round((fastDistance/42.0)*60.0))+8, 80, now),
		},
	}

	ecoMidA := midpoint(origin, destination, 0.2)
	ecoMidB := midpoint(origin, destination, 0.8)
	eco := models.RouteCandidate{
		ID:            "cand_eco",
		Label:         "Eco transit mix",
		TotalDistance: ecoDistance,
		TotalDuration: int(math.Round((ecoDistance/30.0)*60.0)) + 18,
		TotalCarbon:   ecoDistance * 40,
		Congestion:    0.40,
		Steps: []models.TransportSegment{
			synthSegment("walking", origin, ecoMidA, pricing.Round2(ecoDistance*0.08), 8, 0, now),
			synthSegment("lrt", ecoMidA, ecoMidB, pricing.Round2(ecoDistance*0.84),
				int(math.Round((ecoDistance*0.84/33.0)*60.0))+4, 40, now),
			synthSegment("walking", ecoMidB, destination, pricing.Round2(ecoDistance*0.08), 7, 0, now),
		},
	}

	cheapMid := midpoint(origin, destination, 0.55)
	cheap := models.RouteCandidate{
		ID:            "cand_cheap",
		Label:         "Cheap bus + EV bypass",
		TotalDistance: cheapDistance,
		TotalDuration: int(math.Round((cheapDistance/31.0)*60.0)) + 10,
		TotalCarbon:   (cheapDistance * 0.55 * 60) + (cheapDistance * 0.45 * 80),
		Congestion:    0.25,
		Steps: []models.TransportSegment{
			synthSegment("bus", origin, cheapMid, pricing.Round2(cheapDistance*0.55),
				int(math.Round((cheapDistance*0.55/26.0)*60.0))+4, 60, now),
			synthSegment("ev_taxi", cheapMid, destination, pricing.Round2(cheapDistance*0.45),
				int(math.Round((cheapDistance*0.45/38.0)*60.0))+4, 80, now),
		},
	}

	return []models.RouteCandidate{fast, eco, cheap}
}

// SyntheticCandidateForMode returns just the candidate matching the requested mode.
func SyntheticCandidateForMode(origin, dest models.Location, mode string) (models.RouteCandidate, bool) {
	all := SyntheticCandidates(origin, dest)
	wantID := candidateIDForMode(mode)
	if wantID == "" {
		return models.RouteCandidate{}, false
	}
	for _, c := range all {
		if c.ID == wantID {
			return c, true
		}
	}
	return models.RouteCandidate{}, false
}

func candidateIDForMode(mode string) string {
	switch mode {
	case "fast":
		return "cand_fast"
	case "eco":
		return "cand_eco"
	case "cheap":
		return "cand_cheap"
	}
	return ""
}

func synthSegment(kind string, start, end models.Location, distance float64, duration int, carbonPerKM float64, depart time.Time) models.TransportSegment {
	return models.TransportSegment{
		Type:          kind,
		StartLocation: start,
		EndLocation:   end,
		Distance:      distance,
		Duration:      duration,
		CarbonPerKm:   carbonPerKM,
		TotalCarbon:   pricing.Round2(distance * carbonPerKM),
		Departure:     depart,
		Arrival:       depart.Add(time.Duration(duration) * time.Minute),
	}
}

func midpoint(a, b models.Location, ratio float64) models.Location {
	return models.Location{
		Latitude:  a.Latitude + (b.Latitude-a.Latitude)*ratio,
		Longitude: a.Longitude + (b.Longitude-a.Longitude)*ratio,
	}
}

func haversineKM(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	dLat := deg2rad(lat2 - lat1)
	dLon := deg2rad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(deg2rad(lat1))*math.Cos(deg2rad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

func deg2rad(d float64) float64 {
	return d * (math.Pi / 180)
}
