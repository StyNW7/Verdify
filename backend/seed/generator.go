package seed

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"time"

	"github.com/verdify/backend/models"
)

const (
	minBookingsPerPersona = 3
	maxBookingsPerPersona = 7
)

// bookingCountForPersona derives a deterministic booking count in the
// inclusive range [minBookingsPerPersona, maxBookingsPerPersona] from the
// persona's email, so each persona has a varied-but-stable history size.
func bookingCountForPersona(email string) int {
	h := hashSeed(email, -1)
	span := maxBookingsPerPersona - minBookingsPerPersona + 1
	return minBookingsPerPersona + int(h[0])%span
}

// shuffledPool returns a deterministic Fisher-Yates permutation of pool
// seeded from the persona's email. Callers take the first N entries to draw
// N booking fixtures without replacement, guaranteeing every booking in a
// persona's history references a distinct fixture.
func shuffledPool(email string, pool []FixtureKey) []FixtureKey {
	out := make([]FixtureKey, len(pool))
	copy(out, pool)
	h := hashSeed(email, -2)
	for i := len(out) - 1; i > 0; i-- {
		j := int(h[i%len(h)]) % (i + 1)
		out[i], out[j] = out[j], out[i]
	}
	return out
}

// GenerateBookingsForPersona returns a deterministic slice of bookings for
// persona, distributed across the trailing ~30 days from now. Each booking's
// RouteSnapshot is sourced from a recorded Routes-API fixture (see
// backend/seed/fixtures.go); no synthetic geometry is fabricated.
//
// Determinism: identical (persona, now) input produces byte-identical output.
// Per-booking variation comes from a SHA-256 of persona.Email + index — no
// time.Now and no rand.Seed.
//
// Fail-fast on missing fixtures: at the top of every call, the function
// validates that PoolByCity references only fixtures that exist on disk. A
// missing fixture is a programmer error (someone added a key to a pool but
// did not record the fixture), not a silent synthetic fallback.
func GenerateBookingsForPersona(p Persona, now time.Time) []models.Booking {
	if err := AssertFixtureCoverage(); err != nil {
		panic(fmt.Sprintf("seed: %v", err))
	}

	now = now.UTC()
	pool := PoolByCity[p.BaseCity]
	if len(pool) == 0 {
		panic(fmt.Sprintf("seed: no fixture pool for base city %q (persona %s)", p.BaseCity, p.Email))
	}

	count := bookingCountForPersona(p.Email)
	if count > len(pool) {
		count = len(pool)
	}
	shuffled := shuffledPool(p.Email, pool)
	bookings := make([]models.Booking, 0, count)

	for i := 0; i < count; i++ {
		h := hashSeed(p.Email, i)

		key := shuffled[i]
		fixture, ok := fixtureFor(key)
		if !ok {
			panic(fmt.Sprintf("seed: fixture %s missing despite coverage check", key))
		}

		daysAgo := int(h[2])%30 + 1
		hourOffset := int(h[3]) % 14
		createdAt := now.AddDate(0, 0, -daysAgo).Add(time.Duration(hourOffset) * time.Hour)

		status := pickStatus(i, h)
		snapshot := materialiseSnapshot(fixture, key, createdAt, h)
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
			JourneyProgress:  models.JourneyProgress{CurrentStepIndex: 0},
			RerouteHistory:   nil,
			CreatedAt:        createdAt,
			CompletedAt:      completedAt,
		})
	}

	return bookings
}

// pickStatus distributes statuses so each persona has at least one completed,
// up to two confirmed (the upcoming-trip slot), and an occasional cancelled.
// Index-driven, so deterministic. The i==2 slot is reserved as completed so
// the at-least-one-completed invariant holds even at the minimum persona
// booking count.
func pickStatus(i int, h [32]byte) string {
	if i == 0 || i == 1 {
		return "confirmed"
	}
	if i == 2 {
		return "completed"
	}
	if int(h[7])%9 == 0 {
		return "cancelled"
	}
	return "completed"
}

// materialiseSnapshot clones the cached fixture and rewrites the per-booking
// fields that vary across bookings: RouteID (per-booking opaque tag),
// CreatedAt, and the per-step Departure/Arrival timestamps anchored to the
// booking's CreatedAt.
func materialiseSnapshot(fixture models.RouteOption, key FixtureKey, createdAt time.Time, h [32]byte) models.RouteOption {
	snap := fixture
	snap.RouteID = fmt.Sprintf("route_seed_%02X%02X%02X", h[14], h[15], h[16])
	snap.CreatedAt = createdAt

	if len(fixture.Steps) > 0 {
		steps := make([]models.TransportSegment, len(fixture.Steps))
		cursor := createdAt
		for i, s := range fixture.Steps {
			step := s
			step.Departure = cursor
			dur := step.Duration
			if dur < 1 {
				dur = 1
			}
			step.Arrival = cursor.Add(time.Duration(dur) * time.Minute)
			cursor = step.Arrival
			steps[i] = step
		}
		snap.Steps = steps
	}
	return snap
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
