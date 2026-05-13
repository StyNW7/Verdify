package ranker

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/verdify/backend/models"
)

// ── fakes ─────────────────────────────────────────────────────────────────────

type fakeRecomputer struct {
	cand *models.RouteCandidate
	err  error
}

func (f *fakeRecomputer) Recompute(_ context.Context, _, _ models.Location, _ string) (*models.RouteCandidate, error) {
	return f.cand, f.err
}

type fakeBookingStore struct {
	booking models.Booking
	ok      bool
	route   models.Route
	routeOK bool
}

func (f *fakeBookingStore) GetBooking(_ string) (models.Booking, bool) { return f.booking, f.ok }
func (f *fakeBookingStore) GetRoute(_ string) (models.Route, bool)     { return f.route, f.routeOK }

func disabledAgent(store BookingReader, rc RouteRecomputer) *RerouteAgent {
	return &RerouteAgent{Enabled: false, store: store, routes: rc}
}

func stubBooking() models.Booking {
	return models.Booking{ID: "bk_test", RouteID: "rt_test", Status: "confirmed"}
}

func stubCandidate() *models.RouteCandidate {
	return &models.RouteCandidate{ID: "cand_new", Mode: "eco", TotalDistance: 12.0, TotalDuration: 25}
}

// ── fallback: booking found, recompute succeeds → reroute ─────────────────────

func TestRerouteAgent_Fallback_CandidateFound(t *testing.T) {
	agent := disabledAgent(
		&fakeBookingStore{booking: stubBooking(), ok: true},
		&fakeRecomputer{cand: stubCandidate()},
	)
	result, err := agent.Run(context.Background(), RerouteInput{BookingID: "bk_test"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Action != "reroute" {
		t.Errorf("action = %q want reroute", result.Action)
	}
	if result.Source != "fallback" {
		t.Errorf("source = %q want fallback", result.Source)
	}
	if result.NewCandidate == nil {
		t.Error("NewCandidate must be non-nil when action=reroute")
	}
}

// ── fallback: recompute errors → abort ────────────────────────────────────────

func TestRerouteAgent_Fallback_RecomputeError(t *testing.T) {
	agent := disabledAgent(
		&fakeBookingStore{booking: stubBooking(), ok: true},
		&fakeRecomputer{err: errors.New("routes api down")},
	)
	result, err := agent.Run(context.Background(), RerouteInput{BookingID: "bk_test"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Action != "abort" {
		t.Errorf("action = %q want abort", result.Action)
	}
	if result.Source != "fallback" {
		t.Errorf("source = %q want fallback", result.Source)
	}
	if result.NewCandidate != nil {
		t.Error("NewCandidate must be nil on abort")
	}
}

// ── fallback: recompute returns nil candidate → abort ─────────────────────────

func TestRerouteAgent_Fallback_NilCandidate(t *testing.T) {
	agent := disabledAgent(
		&fakeBookingStore{booking: stubBooking(), ok: true},
		&fakeRecomputer{cand: nil},
	)
	result, err := agent.Run(context.Background(), RerouteInput{BookingID: "bk_test"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Action != "abort" {
		t.Errorf("action = %q want abort", result.Action)
	}
}

// ── fallback: booking not found → graceful abort (no error returned) ──────────

func TestRerouteAgent_Fallback_BookingNotFound(t *testing.T) {
	agent := disabledAgent(
		&fakeBookingStore{ok: false},
		&fakeRecomputer{cand: stubCandidate()},
	)
	result, err := agent.Run(context.Background(), RerouteInput{BookingID: "bk_missing"})
	if err != nil {
		t.Fatalf("fallback must not bubble an error: %v", err)
	}
	if result.Action != "abort" {
		t.Errorf("action = %q want abort", result.Action)
	}
	if result.Source != "fallback" {
		t.Errorf("source = %q want fallback", result.Source)
	}
}

// ── buildResult: unknown action → downgrade to abort ─────────────────────────

func TestBuildResult_UnknownAction_DowngradesToAbort(t *testing.T) {
	a := &RerouteAgent{}
	r := a.buildResult(&agentDecision{Action: "teleport", UserMessage: "beam me up"}, nil, "gemini")
	if r.Action != "abort" {
		t.Errorf("action = %q want abort", r.Action)
	}
}

// ── buildResult: reroute with nil candidate → downgrade to abort ─────────────

func TestBuildResult_RerouteNilCandidate_DowngradesToAbort(t *testing.T) {
	a := &RerouteAgent{}
	r := a.buildResult(&agentDecision{Action: "reroute", UserMessage: "take this route"}, nil, "gemini")
	if r.Action != "abort" {
		t.Errorf("action = %q want abort (no candidate to attach)", r.Action)
	}
	if r.NewCandidate != nil {
		t.Error("NewCandidate must be nil after downgrade")
	}
}

// ── buildResult: reroute with valid candidate → keeps candidate ───────────────

func TestBuildResult_Reroute_AttachesCandidate(t *testing.T) {
	a := &RerouteAgent{}
	cand := stubCandidate()
	r := a.buildResult(&agentDecision{Action: "reroute", UserMessage: "new route ready"}, cand, "gemini")
	if r.Action != "reroute" {
		t.Errorf("action = %q want reroute", r.Action)
	}
	if r.NewCandidate != cand {
		t.Error("NewCandidate must be the provided candidate pointer")
	}
	if r.Source != "gemini" {
		t.Errorf("source = %q want gemini", r.Source)
	}
}

// ── buildResult: userMessage truncated at 160 chars ──────────────────────────

func TestBuildResult_TruncatesUserMessageAt160(t *testing.T) {
	a := &RerouteAgent{}
	long := strings.Repeat("a", 200)
	r := a.buildResult(&agentDecision{Action: "abort", UserMessage: long}, nil, "gemini")
	if len(r.UserMessage) != 160 {
		t.Errorf("userMessage len = %d want 160", len(r.UserMessage))
	}
}

// ── buildResult: empty userMessage → default for each action ─────────────────

func TestBuildResult_EmptyMessage_UsesDefault(t *testing.T) {
	a := &RerouteAgent{}
	cases := []struct {
		action string
	}{
		{"reroute"},
		{"wait_and_continue"},
		{"abort"},
	}
	for _, tc := range cases {
		var cand *models.RouteCandidate
		if tc.action == "reroute" {
			cand = stubCandidate()
		}
		r := a.buildResult(&agentDecision{Action: tc.action, UserMessage: ""}, cand, "gemini")
		if r.UserMessage == "" {
			t.Errorf("action=%s: userMessage must not be empty when input is blank", tc.action)
		}
	}
}
