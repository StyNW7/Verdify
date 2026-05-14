package seed

import (
	"fmt"
	"reflect"
	"testing"
	"time"
)

var fixedNow = time.Date(2026, 5, 14, 9, 0, 0, 0, time.UTC)

// Peninsular + East Malaysia (incl. Singapore border) bounding box. Anything
// outside this rectangle indicates the generator handed back a coordinate
// from outside the curated catalogue.
const (
	minLat = 1.0
	maxLat = 7.5
	minLng = 99.0
	maxLng = 120.0
)

func TestGenerateBookingsForPersona_CountInRange(t *testing.T) {
	for _, p := range Personas {
		got := GenerateBookingsForPersona(p, fixedNow)
		if len(got) < minBookingsPerPersona || len(got) > maxBookingsPerPersona {
			t.Errorf("persona %s: got %d bookings, want %d..%d",
				p.Email, len(got), minBookingsPerPersona, maxBookingsPerPersona)
		}
	}
}

func TestGenerateBookingsForPersona_UserIDMatches(t *testing.T) {
	p := Personas[0]
	bookings := GenerateBookingsForPersona(p, fixedNow)
	if len(bookings) == 0 {
		t.Fatal("expected at least one booking")
	}
	for _, b := range bookings {
		if b.UserID != p.Email {
			t.Errorf("booking %s: UserID = %q, want %q", b.ID, b.UserID, p.Email)
		}
	}
}

func TestGenerateBookingsForPersona_StatusMix(t *testing.T) {
	for _, p := range Personas {
		bookings := GenerateBookingsForPersona(p, fixedNow)
		var completed, confirmed, cancelled int
		for _, b := range bookings {
			switch b.Status {
			case "completed":
				completed++
			case "confirmed":
				confirmed++
			case "cancelled":
				cancelled++
			default:
				t.Errorf("persona %s: unexpected status %q", p.Email, b.Status)
			}
		}
		if completed < 1 {
			t.Errorf("persona %s: want >=1 completed, got %d", p.Email, completed)
		}
		if confirmed != 2 {
			t.Errorf("persona %s: want exactly 2 confirmed, got %d", p.Email, confirmed)
		}
		if cancelled > 3 {
			t.Errorf("persona %s: want at most 3 cancelled, got %d", p.Email, cancelled)
		}
	}
}

func TestGenerateBookingsForPersona_CoordsInBoundingBox(t *testing.T) {
	for _, p := range Personas {
		bookings := GenerateBookingsForPersona(p, fixedNow)
		for _, b := range bookings {
			for _, loc := range []struct {
				name string
				lat  float64
				lng  float64
			}{
				{"origin", b.RouteSnapshot.Steps[0].StartLocation.Latitude, b.RouteSnapshot.Steps[0].StartLocation.Longitude},
				{"destination", b.RouteSnapshot.Steps[len(b.RouteSnapshot.Steps)-1].EndLocation.Latitude, b.RouteSnapshot.Steps[len(b.RouteSnapshot.Steps)-1].EndLocation.Longitude},
			} {
				if loc.lat < minLat || loc.lat > maxLat {
					t.Errorf("persona %s booking %s: %s lat %f outside [%f,%f]", p.Email, b.ID, loc.name, loc.lat, minLat, maxLat)
				}
				if loc.lng < minLng || loc.lng > maxLng {
					t.Errorf("persona %s booking %s: %s lng %f outside [%f,%f]", p.Email, b.ID, loc.name, loc.lng, minLng, maxLng)
				}
			}
		}
	}
}

func TestGenerateBookingsForPersona_BookingsAreUnique(t *testing.T) {
	for _, p := range Personas {
		bookings := GenerateBookingsForPersona(p, fixedNow)
		seen := make(map[string]int, len(bookings))
		for _, b := range bookings {
			steps := b.RouteSnapshot.Steps
			if len(steps) == 0 {
				continue
			}
			start := steps[0].StartLocation
			end := steps[len(steps)-1].EndLocation
			key := fmt.Sprintf("%.5f,%.5f->%.5f,%.5f",
				start.Latitude, start.Longitude, end.Latitude, end.Longitude)
			seen[key]++
		}
		for route, count := range seen {
			if count > 1 {
				t.Errorf("persona %s: route %q appears %d times, want unique fixtures per persona",
					p.Email, route, count)
			}
		}
	}
}

func TestGenerateBookingsForPersona_Deterministic(t *testing.T) {
	p := Personas[3]
	first := GenerateBookingsForPersona(p, fixedNow)
	second := GenerateBookingsForPersona(p, fixedNow)
	if !reflect.DeepEqual(first, second) {
		t.Errorf("generator not deterministic for persona %s", p.Email)
	}
}

func TestGenerateBookingsForPersona_SnapshotIsFromFixture(t *testing.T) {
	p := Personas[0]
	bookings := GenerateBookingsForPersona(p, fixedNow)
	for _, b := range bookings {
		if b.RouteSnapshot.DataSource != "google_routes" {
			t.Errorf("booking %s: DataSource = %q, want google_routes", b.ID, b.RouteSnapshot.DataSource)
		}
		if b.RouteSnapshot.Polyline == "" {
			t.Errorf("booking %s: fixture snapshot should have a polyline, got empty", b.ID)
		}
		if len(b.RouteSnapshot.Steps) < 1 {
			t.Errorf("booking %s: want >=1 steps, got %d", b.ID, len(b.RouteSnapshot.Steps))
		}
		if b.RouteSnapshot.TotalDistance <= 0 {
			t.Errorf("booking %s: TotalDistance must be > 0, got %f", b.ID, b.RouteSnapshot.TotalDistance)
		}
		if b.RouteSnapshot.CarbonSavedGrams <= 0 {
			t.Errorf("booking %s: CarbonSavedGrams must be > 0, got %f", b.ID, b.RouteSnapshot.CarbonSavedGrams)
		}
	}
}

func TestFixtureCoverageIsComplete(t *testing.T) {
	if err := AssertFixtureCoverage(); err != nil {
		t.Fatalf("fixture coverage check failed: %v", err)
	}
}

func TestGenerateBookingsForPersona_CompletedHasCompletedAt(t *testing.T) {
	p := Personas[0]
	for _, b := range GenerateBookingsForPersona(p, fixedNow) {
		if b.Status == "completed" && b.CompletedAt == nil {
			t.Errorf("booking %s: completed booking missing CompletedAt", b.ID)
		}
		if b.Status != "completed" && b.CompletedAt != nil {
			t.Errorf("booking %s: status=%s but CompletedAt set", b.ID, b.Status)
		}
	}
}
