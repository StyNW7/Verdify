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
