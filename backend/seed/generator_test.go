package seed

import (
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
		if len(got) < 10 || len(got) > 14 {
			t.Errorf("persona %s: got %d bookings, want 10..14", p.Email, len(got))
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
		if confirmed > 3 {
			t.Errorf("persona %s: want at most 3 confirmed, got %d", p.Email, confirmed)
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

func TestGenerateBookingsForPersona_Deterministic(t *testing.T) {
	p := Personas[3]
	first := GenerateBookingsForPersona(p, fixedNow)
	second := GenerateBookingsForPersona(p, fixedNow)
	if !reflect.DeepEqual(first, second) {
		t.Errorf("generator not deterministic for persona %s", p.Email)
	}
}

func TestGenerateBookingsForPersona_SnapshotIsSynthetic(t *testing.T) {
	p := Personas[0]
	bookings := GenerateBookingsForPersona(p, fixedNow)
	for _, b := range bookings {
		if b.RouteSnapshot.DataSource != "fallback_synthetic" {
			t.Errorf("booking %s: DataSource = %q, want fallback_synthetic", b.ID, b.RouteSnapshot.DataSource)
		}
		if b.RouteSnapshot.Polyline != "" {
			t.Errorf("booking %s: synthetic snapshot should have empty Polyline, got %q", b.ID, b.RouteSnapshot.Polyline)
		}
		if len(b.RouteSnapshot.Steps) == 0 {
			t.Errorf("booking %s: snapshot has no steps", b.ID)
		}
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
