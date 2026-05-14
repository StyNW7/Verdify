package journeyprogress

import (
	"testing"
	"time"

	"github.com/verdify/backend/models"
)

func TestClampStepIndex(t *testing.T) {
	cases := []struct {
		name      string
		requested int
		total     int
		want      int
	}{
		{"within range", 2, 5, 2},
		{"at lower bound", 0, 5, 0},
		{"at upper bound", 4, 5, 4},
		{"below zero clamped to 0", -1, 5, 0},
		{"above max clamped to last", 10, 5, 4},
		{"zero total returns 0", 3, 0, 0},
		{"negative total returns 0", 1, -3, 0},
		{"single step", 0, 1, 0},
		{"single step over max", 5, 1, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := ClampStepIndex(tc.requested, tc.total)
			if got != tc.want {
				t.Errorf("ClampStepIndex(%d, %d) = %d, want %d", tc.requested, tc.total, got, tc.want)
			}
		})
	}
}

func TestValidateTransition(t *testing.T) {
	cases := []struct {
		name      string
		current   int
		requested int
		isReroute bool
		wantErr   bool
	}{
		{"forward accepted", 1, 2, false, false},
		{"same value no-op accepted", 3, 3, false, false},
		{"backward rejected outside reroute", 3, 2, false, true},
		{"backward to 0 rejected outside reroute", 5, 0, false, true},
		{"backward accepted on reroute", 3, 2, true, false},
		{"backward to 0 accepted on reroute", 5, 0, true, false},
		{"forward on reroute also fine", 1, 2, true, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateTransition(tc.current, tc.requested, tc.isReroute)
			if (err != nil) != tc.wantErr {
				t.Errorf("ValidateTransition(%d, %d, reroute=%v) err=%v, wantErr=%v",
					tc.current, tc.requested, tc.isReroute, err, tc.wantErr)
			}
			if err != nil && err != ErrMonotonicViolation {
				t.Errorf("unexpected error type: %v", err)
			}
		})
	}
}

func TestCanMarkCompleted(t *testing.T) {
	now := time.Now().UTC()
	cases := []struct {
		name       string
		progress   models.JourneyProgress
		totalSteps int
		want       bool
	}{
		{
			name:       "zero UpdatedAt bypasses guard (backfilled)",
			progress:   models.JourneyProgress{CurrentStepIndex: 0, UpdatedAt: time.Time{}},
			totalSteps: 5,
			want:       true,
		},
		{
			name:       "at final step allowed",
			progress:   models.JourneyProgress{CurrentStepIndex: 4, UpdatedAt: now},
			totalSteps: 5,
			want:       true,
		},
		{
			name:       "not at final step rejected",
			progress:   models.JourneyProgress{CurrentStepIndex: 3, UpdatedAt: now},
			totalSteps: 5,
			want:       false,
		},
		{
			name:       "step 0 of 1 is final",
			progress:   models.JourneyProgress{CurrentStepIndex: 0, UpdatedAt: now},
			totalSteps: 1,
			want:       true,
		},
		{
			name:       "zero totalSteps allows completion",
			progress:   models.JourneyProgress{CurrentStepIndex: 0, UpdatedAt: now},
			totalSteps: 0,
			want:       true,
		},
		{
			name:       "step 0 of 5 not final",
			progress:   models.JourneyProgress{CurrentStepIndex: 0, UpdatedAt: now},
			totalSteps: 5,
			want:       false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := CanMarkCompleted(tc.progress, tc.totalSteps)
			if got != tc.want {
				t.Errorf("CanMarkCompleted(%+v, %d) = %v, want %v",
					tc.progress, tc.totalSteps, got, tc.want)
			}
		})
	}
}
