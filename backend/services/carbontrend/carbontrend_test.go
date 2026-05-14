package carbontrend

import (
	"testing"
	"time"

	"github.com/verdify/backend/models"
)

func mustKL(t *testing.T) *time.Location {
	t.Helper()
	loc, err := time.LoadLocation("Asia/Kuala_Lumpur")
	if err != nil {
		t.Fatalf("load Asia/Kuala_Lumpur: %v", err)
	}
	return loc
}

func completedBookingAt(at time.Time, kg float64) models.Booking {
	ca := at
	return models.Booking{
		Status:        "completed",
		CreatedAt:     at,
		CompletedAt:   &ca,
		RouteSnapshot: models.RouteOption{CarbonSavedGrams: kg * 1000},
	}
}

func TestBucketCarbonByDay_EmptyInput_SevenZeroBuckets(t *testing.T) {
	kl := mustKL(t)
	now := time.Date(2026, 5, 14, 10, 0, 0, 0, kl)

	got := BucketCarbonByDay(nil, now, kl, 7)

	if len(got) != 7 {
		t.Fatalf("want 7 buckets, got %d", len(got))
	}
	wantDates := []string{
		"2026-05-08",
		"2026-05-09",
		"2026-05-10",
		"2026-05-11",
		"2026-05-12",
		"2026-05-13",
		"2026-05-14",
	}
	wantLabels := []string{"Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"}
	for i, b := range got {
		if b.Date != wantDates[i] {
			t.Errorf("bucket[%d].Date = %q want %q", i, b.Date, wantDates[i])
		}
		if b.DayLabel != wantLabels[i] {
			t.Errorf("bucket[%d].DayLabel = %q want %q", i, b.DayLabel, wantLabels[i])
		}
		if b.Kg != 0 {
			t.Errorf("bucket[%d].Kg = %v want 0", i, b.Kg)
		}
	}
}

func TestBucketCarbonByDay_LateNightMYBucketsToSameDay(t *testing.T) {
	kl := mustKL(t)
	now := time.Date(2026, 5, 14, 10, 0, 0, 0, kl)

	// 23:30 MY on 2026-05-12 → must bucket under day index 4 ("2026-05-12"),
	// not the next day. UTC equivalent is 15:30Z which decodes as 2026-05-12
	// once converted back into KL.
	completedAt := time.Date(2026, 5, 12, 23, 30, 0, 0, kl)
	bookings := []models.Booking{completedBookingAt(completedAt, 4.2)}

	got := BucketCarbonByDay(bookings, now, kl, 7)

	if got[4].Date != "2026-05-12" {
		t.Fatalf("bucket[4].Date = %q want 2026-05-12", got[4].Date)
	}
	if got[4].Kg != 4.2 {
		t.Errorf("bucket[4].Kg = %v want 4.2", got[4].Kg)
	}
	if got[5].Kg != 0 {
		t.Errorf("bucket[5].Kg = %v want 0 (no spillover into next day)", got[5].Kg)
	}
}

func TestBucketCarbonByDay_NonCompletedExcluded(t *testing.T) {
	kl := mustKL(t)
	now := time.Date(2026, 5, 14, 10, 0, 0, 0, kl)
	at := time.Date(2026, 5, 13, 9, 0, 0, 0, kl)

	confirmed := models.Booking{
		Status:        "confirmed",
		CreatedAt:     at,
		RouteSnapshot: models.RouteOption{CarbonSavedGrams: 1234},
	}
	cancelled := models.Booking{
		Status:        "cancelled",
		CreatedAt:     at,
		RouteSnapshot: models.RouteOption{CarbonSavedGrams: 5678},
	}

	got := BucketCarbonByDay([]models.Booking{confirmed, cancelled}, now, kl, 7)

	for i, b := range got {
		if b.Kg != 0 {
			t.Errorf("bucket[%d].Kg = %v want 0", i, b.Kg)
		}
	}
}

func TestBucketCarbonByDay_TwoCompletedSameDaySumed(t *testing.T) {
	kl := mustKL(t)
	now := time.Date(2026, 5, 14, 10, 0, 0, 0, kl)
	morning := time.Date(2026, 5, 13, 8, 30, 0, 0, kl)
	evening := time.Date(2026, 5, 13, 19, 15, 0, 0, kl)

	bookings := []models.Booking{
		completedBookingAt(morning, 1.5),
		completedBookingAt(evening, 2.25),
	}

	got := BucketCarbonByDay(bookings, now, kl, 7)

	if got[5].Date != "2026-05-13" {
		t.Fatalf("bucket[5].Date = %q want 2026-05-13", got[5].Date)
	}
	if got[5].Kg != 3.75 {
		t.Errorf("bucket[5].Kg = %v want 3.75", got[5].Kg)
	}
}

func TestBucketCarbonByDay_OlderThanWindowExcluded(t *testing.T) {
	kl := mustKL(t)
	now := time.Date(2026, 5, 14, 10, 0, 0, 0, kl)
	// 2026-05-07 is one day BEFORE the window start (2026-05-08).
	old := time.Date(2026, 5, 7, 12, 0, 0, 0, kl)
	bookings := []models.Booking{completedBookingAt(old, 9.9)}

	got := BucketCarbonByDay(bookings, now, kl, 7)

	for i, b := range got {
		if b.Kg != 0 {
			t.Errorf("bucket[%d].Kg = %v want 0 (older than window)", i, b.Kg)
		}
	}
}

func TestBucketCarbonByDay_NowAtMYMidnight_NoOffByOne(t *testing.T) {
	kl := mustKL(t)
	// Midnight at the start of 2026-05-14 in KL.
	now := time.Date(2026, 5, 14, 0, 0, 0, 0, kl)

	// A completed booking at 00:00:00 KL on the last bucket day should land
	// on day 6, not roll over.
	at := time.Date(2026, 5, 14, 0, 0, 0, 0, kl)
	bookings := []models.Booking{completedBookingAt(at, 1.1)}

	got := BucketCarbonByDay(bookings, now, kl, 7)

	if len(got) != 7 {
		t.Fatalf("want 7 buckets, got %d", len(got))
	}
	if got[0].Date != "2026-05-08" {
		t.Errorf("bucket[0].Date = %q want 2026-05-08", got[0].Date)
	}
	if got[6].Date != "2026-05-14" {
		t.Errorf("bucket[6].Date = %q want 2026-05-14", got[6].Date)
	}
	if got[6].Kg != 1.1 {
		t.Errorf("bucket[6].Kg = %v want 1.1", got[6].Kg)
	}
}

func TestBucketCarbonByDay_FallsBackToCreatedAtWhenCompletedAtNil(t *testing.T) {
	kl := mustKL(t)
	now := time.Date(2026, 5, 14, 10, 0, 0, 0, kl)
	at := time.Date(2026, 5, 11, 14, 0, 0, 0, kl)

	// status=="completed" but CompletedAt is nil — should bucket by CreatedAt.
	bookings := []models.Booking{{
		Status:        "completed",
		CreatedAt:     at,
		RouteSnapshot: models.RouteOption{CarbonSavedGrams: 2000},
	}}

	got := BucketCarbonByDay(bookings, now, kl, 7)

	if got[3].Date != "2026-05-11" {
		t.Fatalf("bucket[3].Date = %q want 2026-05-11", got[3].Date)
	}
	if got[3].Kg != 2.0 {
		t.Errorf("bucket[3].Kg = %v want 2.0", got[3].Kg)
	}
}
