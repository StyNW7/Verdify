package db

import (
	"context"
	"log"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/verdify/backend/models"
	"google.golang.org/api/iterator"
)

// BackfillJourneyProgress writes a zero-value JourneyProgress to every
// confirmed+paid booking that has never been touched by the PATCH progress
// endpoint (identified by UpdatedAt.IsZero on the embedded struct). Safe to
// call multiple times — bookings with an existing non-zero UpdatedAt are
// skipped. Uses batched writes (≤500 per batch) to stay within Firestore limits.
//
// Operational note: records written by this function keep UpdatedAt as
// time.Time{} (zero). Because the skip check tests !IsZero(), they are
// re-queried and re-written on every boot. The final state is unchanged
// (still {0, zero}), so the operation is idempotent per spec, but not free.
// Acceptable for TB1; revisit if Firestore write costs become a concern.
//
// For MemoryStore and test environments this is a no-op because all in-memory
// bookings are constructed with a sensible default in the handlers and seed
// generator.
func BackfillJourneyProgress(ctx context.Context, client *firestore.Client) error {
	books := client.Collection(bookingsCollection)

	q := books.Where("status", "==", "confirmed").Where("paymentStatus", "==", "completed")
	iter := q.Documents(ctx)
	defer iter.Stop()

	zero := models.JourneyProgress{CurrentStepIndex: 0, UpdatedAt: time.Time{}}

	batch := client.Batch()
	count := 0
	patched := 0

	for {
		snap, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return err
		}

		var b models.Booking
		if err := snap.DataTo(&b); err != nil {
			log.Printf("backfill: skip %s (decode error: %v)", snap.Ref.ID, err)
			continue
		}

		if !b.JourneyProgress.UpdatedAt.IsZero() {
			continue
		}

		batch.Set(snap.Ref, map[string]any{
			"journeyProgress": zero,
		}, firestore.MergeAll)
		count++
		patched++

		if count == 500 {
			if _, err := batch.Commit(ctx); err != nil {
				return err
			}
			batch = client.Batch()
			count = 0
		}
	}

	if count > 0 {
		if _, err := batch.Commit(ctx); err != nil {
			return err
		}
	}

	log.Printf("event=backfill_journey_progress patched=%d", patched)
	return nil
}
