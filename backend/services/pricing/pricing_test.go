package pricing

import (
	"math"
	"testing"
	"time"
)

func TestEstimateStepCost(t *testing.T) {
	cases := []struct {
		kind string
		km   float64
		want float64
	}{
		{"walking", 5, 0},
		{"bus", 10, 1.6 + 10*0.18},
		{"lrt", 10, 2.4 + 10*0.22},
		{"mrt", 10, 2.4 + 10*0.22},
		{"rts", 10, 2.4 + 10*0.22},
		{"ev_taxi", 10, 4.5 + 10*0.88},
		{"evTaxi", 10, 4.5 + 10*0.88},
		{"unknown", 10, 1.2 + 10*0.25},
	}
	for _, c := range cases {
		got := EstimateStepCost(c.kind, c.km)
		if math.Abs(got-c.want) > 1e-9 {
			t.Errorf("EstimateStepCost(%q,%v)=%v want %v", c.kind, c.km, got, c.want)
		}
	}
}

func TestBaselineCarbonGrams(t *testing.T) {
	if got := BaselineCarbonGrams(10); got != 2000 {
		t.Fatalf("want 2000 got %v", got)
	}
}

func TestCarbonSavingsPercent(t *testing.T) {
	cases := []struct {
		base, actual float64
		want         int
	}{
		{1000, 400, 60},
		{1000, 1000, 0},
		{1000, 1500, 0}, // negative → clamped 0
		{0, 100, 0},     // zero baseline → 0
		{100, 0, 99},    // 100% saving → clamped to 99
	}
	for _, c := range cases {
		if got := CarbonSavingsPercent(c.base, c.actual); got != c.want {
			t.Errorf("CarbonSavingsPercent(%v,%v)=%v want %v", c.base, c.actual, got, c.want)
		}
	}
}

func TestPointsEstimate(t *testing.T) {
	if PointsEstimate(0, 1000, 500) != 0 {
		t.Fatal("zero distance must return 0")
	}
	if PointsEstimate(10, 0, 500) != 0 {
		t.Fatal("zero baseline must return 0")
	}
	if PointsEstimate(10, 1000, 0) != 0 {
		t.Fatal("zero actual must return 0")
	}
	got := PointsEstimate(10, 2000, 1000)
	if got != 30 {
		t.Fatalf("want 30 got %v", got)
	}
}

func TestIsPeakHour(t *testing.T) {
	tz := time.FixedZone("MY", 8*3600)
	peak := []int{7, 8, 12, 17, 18}
	off := []int{0, 6, 9, 10, 13, 14, 16, 19, 22}
	for _, h := range peak {
		ts := time.Date(2026, 5, 12, h, 30, 0, 0, tz)
		if !IsPeakHour(ts) {
			t.Errorf("hour %d should be peak", h)
		}
	}
	for _, h := range off {
		ts := time.Date(2026, 5, 12, h, 30, 0, 0, tz)
		if IsPeakHour(ts) {
			t.Errorf("hour %d should NOT be peak", h)
		}
	}
}

func TestRound2(t *testing.T) {
	if Round2(1.235) != 1.24 {
		t.Fatalf("want 1.24 got %v", Round2(1.235))
	}
}

func TestEstimateStepCostForParty_PerPassenger(t *testing.T) {
	cases := []struct {
		name       string
		kind       string
		km         float64
		passengers int
		want       float64
	}{
		{"walking is free regardless of passengers", "walking", 5, 4, 0},
		{"bus scales linearly with passengers", "bus", 10, 3, (1.6 + 10*0.18) * 3},
		{"lrt scales linearly with passengers", "lrt", 10, 2, (2.4 + 10*0.22) * 2},
		{"mrt scales linearly with passengers", "mrt", 10, 5, (2.4 + 10*0.22) * 5},
		{"rts scales linearly with passengers", "rts", 10, 4, (2.4 + 10*0.22) * 4},
		{"ferry scales linearly with passengers (default rate)", "ferry", 8, 3, (1.2 + 8*0.25) * 3},
		{"unknown type scales linearly with passengers", "unknown", 10, 2, (1.2 + 10*0.25) * 2},
		{"zero passengers normalizes to 1", "bus", 10, 0, 1.6 + 10*0.18},
		{"negative passengers normalizes to 1", "bus", 10, -3, 1.6 + 10*0.18},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := EstimateStepCostForParty(c.kind, c.km, c.passengers)
			if math.Abs(got-c.want) > 1e-9 {
				t.Errorf("EstimateStepCostForParty(%q,%v,%d)=%v want %v", c.kind, c.km, c.passengers, got, c.want)
			}
		})
	}
}

func TestEstimateStepCostForParty_EVTaxiCapacity(t *testing.T) {
	const km = 10.0
	base := 4.5 + km*0.88 // one standard car fare for the leg
	cases := []struct {
		name       string
		passengers int
		want       float64
	}{
		{"1 pax fits in one standard car", 1, base},
		{"2 pax fits in one standard car", 2, base},
		{"4 pax fills one standard car exactly", 4, base},
		{"5 pax triggers XL upgrade", 5, base * 1.5},
		{"6 pax fills the XL exactly", 6, base * 1.5},
		{"8 pax splits into two standard cars", 8, base * 2},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := EstimateStepCostForParty("ev_taxi", km, c.passengers)
			if math.Abs(got-c.want) > 1e-9 {
				t.Errorf("ev_taxi pax=%d got %v want %v", c.passengers, got, c.want)
			}
			gotAlias := EstimateStepCostForParty("evTaxi", km, c.passengers)
			if math.Abs(gotAlias-c.want) > 1e-9 {
				t.Errorf("evTaxi alias pax=%d got %v want %v", c.passengers, gotAlias, c.want)
			}
		})
	}
}

func TestEstimateStepCostForParty_MixedRoute(t *testing.T) {
	// walk + ev_taxi + rts + walk for 3 passengers.
	// walk = 0; ev_taxi = one car flat (3 ≤ 4); rts = per-passenger × 3; walk = 0.
	const passengers = 3
	walk1 := EstimateStepCostForParty("walking", 0.4, passengers)
	taxi := EstimateStepCostForParty("ev_taxi", 12, passengers)
	rts := EstimateStepCostForParty("rts", 6, passengers)
	walk2 := EstimateStepCostForParty("walking", 0.2, passengers)

	wantTaxi := 4.5 + 12*0.88               // one car flat
	wantRTS := (2.4 + 6*0.22) * passengers  // per-passenger × 3
	wantTotal := wantTaxi + wantRTS
	gotTotal := walk1 + taxi + rts + walk2

	if math.Abs(walk1) > 1e-9 || math.Abs(walk2) > 1e-9 {
		t.Errorf("walking legs must be 0, got %v and %v", walk1, walk2)
	}
	if math.Abs(taxi-wantTaxi) > 1e-9 {
		t.Errorf("ev_taxi leg for 3 pax = %v want %v (one flat car)", taxi, wantTaxi)
	}
	if math.Abs(rts-wantRTS) > 1e-9 {
		t.Errorf("rts leg for 3 pax = %v want %v (per-passenger × 3)", rts, wantRTS)
	}
	if math.Abs(gotTotal-wantTotal) > 1e-9 {
		t.Errorf("mixed route total = %v want %v", gotTotal, wantTotal)
	}
}

func TestEstimateStepCostForParty_MixedLeg_DefaultPassengers(t *testing.T) {
	// Single-passenger default must match the legacy EstimateStepCost output.
	cases := []struct {
		kind string
		km   float64
	}{
		{"walking", 5},
		{"bus", 10},
		{"lrt", 10},
		{"rts", 10},
		{"ev_taxi", 10},
	}
	for _, c := range cases {
		legacy := EstimateStepCost(c.kind, c.km)
		party := EstimateStepCostForParty(c.kind, c.km, 1)
		if math.Abs(legacy-party) > 1e-9 {
			t.Errorf("%s: party-of-1 (%v) should match legacy (%v)", c.kind, party, legacy)
		}
	}
}
