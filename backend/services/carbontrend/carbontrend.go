// Package carbontrend buckets a user's completed bookings into per-day carbon
// savings for the dashboard's weekly-trend graph. Pure logic — no Firestore,
// no clocks, no globals. Time zone is supplied by the caller (production
// passes Asia/Kuala_Lumpur; tests pin a fixed location for determinism).
package carbontrend

import (
	"time"

	"github.com/verdify/backend/models"
)

// DayBucket is one slot of the weekly trend. Date is the local date in the
// caller-supplied location, formatted YYYY-MM-DD; DayLabel is the 3-letter
// English weekday (Mon..Sun); Kg is the sum of carbon-saved kilograms for
// that local date.
type DayBucket struct {
	Date     string  `json:"date"`
	DayLabel string  `json:"dayLabel"`
	Kg       float64 `json:"kg"`
}

// BucketCarbonByDay returns exactly `days` entries, oldest-first, ending on
// the local-date of `now` in `location`. Each booking with status "completed"
// is bucketed by the local date of CompletedAt (falling back to CreatedAt
// when CompletedAt is nil). Bookings whose local date falls outside the
// window are silently dropped. Days with no qualifying bookings yield Kg=0
// rather than being omitted.
//
// The function is total: nil/empty input returns a fully zero-filled window.
// Callers should never see fewer than `days` entries.
func BucketCarbonByDay(bookings []models.Booking, now time.Time, location *time.Location, days int) []DayBucket {
	if location == nil {
		location = time.UTC
	}
	if days <= 0 {
		return []DayBucket{}
	}

	// Window anchor: start-of-day for `now` in the local location, then walk
	// back `days-1` calendar days. Using year/month/day collapses any
	// sub-day component without DST surprises.
	localNow := now.In(location)
	endDay := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, location)
	startDay := endDay.AddDate(0, 0, -(days - 1))

	out := make([]DayBucket, days)
	indexByKey := make(map[string]int, days)
	for i := 0; i < days; i++ {
		d := startDay.AddDate(0, 0, i)
		key := d.Format("2006-01-02")
		out[i] = DayBucket{
			Date:     key,
			DayLabel: d.Format("Mon"),
			Kg:       0,
		}
		indexByKey[key] = i
	}

	for _, b := range bookings {
		if b.Status != "completed" {
			continue
		}
		ts := b.CreatedAt
		if b.CompletedAt != nil {
			ts = *b.CompletedAt
		}
		key := ts.In(location).Format("2006-01-02")
		idx, ok := indexByKey[key]
		if !ok {
			continue
		}
		out[idx].Kg += b.RouteSnapshot.CarbonSavedGrams / 1000.0
	}

	return out
}
