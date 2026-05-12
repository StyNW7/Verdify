package routes

import (
	"testing"

	"github.com/verdify/backend/models"
)

// Two KL coordinates roughly 10 km apart.
var (
	origin = models.Location{Latitude: 3.1390, Longitude: 101.6869}
	dest   = models.Location{Latitude: 3.0738, Longitude: 101.6068}
)

func TestSyntheticCandidates_ReturnsThreeInFixedOrder(t *testing.T) {
	cs := SyntheticCandidates(origin, dest)
	if len(cs) != 3 {
		t.Fatalf("want 3 candidates got %d", len(cs))
	}
	wantIDs := []string{"cand_fast", "cand_eco", "cand_cheap"}
	for i, c := range cs {
		if c.ID != wantIDs[i] {
			t.Errorf("position %d: want %q got %q", i, wantIDs[i], c.ID)
		}
	}
}

func TestSyntheticCandidates_FastIsShortest(t *testing.T) {
	cs := SyntheticCandidates(origin, dest)
	fast, eco, cheap := cs[0], cs[1], cs[2]
	if fast.TotalDuration >= eco.TotalDuration || fast.TotalDuration >= cheap.TotalDuration {
		t.Errorf("fast must be shortest: fast=%d eco=%d cheap=%d",
			fast.TotalDuration, eco.TotalDuration, cheap.TotalDuration)
	}
	if eco.TotalCarbon >= fast.TotalCarbon || eco.TotalCarbon >= cheap.TotalCarbon {
		t.Errorf("eco must be lowest carbon: fast=%v eco=%v cheap=%v",
			fast.TotalCarbon, eco.TotalCarbon, cheap.TotalCarbon)
	}
}

func TestSyntheticCandidateForMode(t *testing.T) {
	c, ok := SyntheticCandidateForMode(origin, dest, "fast")
	if !ok || c.ID != "cand_fast" {
		t.Fatalf("want cand_fast got %+v ok=%v", c, ok)
	}
	if _, ok := SyntheticCandidateForMode(origin, dest, "bogus"); ok {
		t.Fatal("bogus mode must return ok=false")
	}
}
