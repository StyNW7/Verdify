package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/verdify/backend/config"
	"github.com/verdify/backend/db"
	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
	"github.com/verdify/backend/services/ranker"
	"github.com/verdify/backend/services/routes"
)

// ── fake agent ────────────────────────────────────────────────────────────────

type stubRerouteAgent struct {
	result *ranker.RerouteResult
	err    error
	calls  int
}

func (s *stubRerouteAgent) Run(_ context.Context, _ ranker.RerouteInput) (*ranker.RerouteResult, error) {
	s.calls++
	return s.result, s.err
}

// ── helpers ───────────────────────────────────────────────────────────────────

func newRerouteApp(agent ranker.RerouteRunner) *App {
	return &App{
		Cfg:          config.Load(),
		Store:        db.NewStore(),
		Ranker:       &fakeRanker{source: "gemini"},
		Builder:      routes.NewCandidateBuilder(&fakeFetcher{}),
		Places:       fakePlaces{},
		RerouteAgent: agent,
		StartTime:    services.NowUTC(),
	}
}

func seedBookingWithHistory(app *App, id, status string, history []models.RerouteEvent) {
	_ = app.Store.CreateBooking(context.Background(), models.Booking{
		ID:             id,
		UserID:         "u_test",
		RouteID:        "rt_test",
		Status:         status,
		RerouteHistory: history,
	})
}

func doReroute(t *testing.T, mux http.Handler, bookingID string, lat, lon float64) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(models.RerouteRequest{
		CurrentLocation: models.Location{Latitude: lat, Longitude: lon},
		Reason:          "missed_stop",
	})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+bookingID+"/reroute", bytes.NewReader(body))
	mux.ServeHTTP(rr, req)
	return rr
}

func decodeRerouteData(t *testing.T, rr *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var env models.APIResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &env); err != nil {
		t.Fatalf("unmarshal: %v body=%s", err, rr.Body.String())
	}
	data, _ := env.Data.(map[string]any)
	return data
}

// ── 400: out-of-bounds coordinates ───────────────────────────────────────────

func TestRerouteHandler_400_LatitudeTooHigh(t *testing.T) {
	app := newRerouteApp(&stubRerouteAgent{})
	rr := doReroute(t, app.Routes(), "bk_x", 91.0, 103.8)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestRerouteHandler_400_LongitudeTooLow(t *testing.T) {
	app := newRerouteApp(&stubRerouteAgent{})
	rr := doReroute(t, app.Routes(), "bk_x", 1.48, -181.0)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400 got %d body=%s", rr.Code, rr.Body.String())
	}
}

// ── 404: booking not in store ─────────────────────────────────────────────────

func TestRerouteHandler_404_BookingNotFound(t *testing.T) {
	app := newRerouteApp(&stubRerouteAgent{})
	rr := doReroute(t, app.Routes(), "bk_ghost", 1.48, 103.76)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("want 404 got %d body=%s", rr.Code, rr.Body.String())
	}
}

// ── 409: only confirmed / in_progress allowed ─────────────────────────────────

func TestRerouteHandler_409_CompletedBooking(t *testing.T) {
	app := newRerouteApp(&stubRerouteAgent{})
	seedBookingWithHistory(app, "bk_done", "completed", nil)
	rr := doReroute(t, app.Routes(), "bk_done", 1.48, 103.76)
	if rr.Code != http.StatusConflict {
		t.Fatalf("want 409 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestRerouteHandler_409_CancelledBooking(t *testing.T) {
	app := newRerouteApp(&stubRerouteAgent{})
	seedBookingWithHistory(app, "bk_cancelled", "cancelled", nil)
	rr := doReroute(t, app.Routes(), "bk_cancelled", 1.48, 103.76)
	if rr.Code != http.StatusConflict {
		t.Fatalf("want 409 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestRerouteHandler_409_DraftBooking(t *testing.T) {
	app := newRerouteApp(&stubRerouteAgent{})
	seedBookingWithHistory(app, "bk_draft", "draft", nil)
	rr := doReroute(t, app.Routes(), "bk_draft", 1.48, 103.76)
	if rr.Code != http.StatusConflict {
		t.Fatalf("want 409 got %d body=%s", rr.Code, rr.Body.String())
	}
}

// ── cap: 3 history entries → abort without calling agent ─────────────────────

func TestRerouteHandler_Cap_AbortsWithoutCallingAgent(t *testing.T) {
	agent := &stubRerouteAgent{}
	app := newRerouteApp(agent)

	history := []models.RerouteEvent{
		{Action: "reroute", AgentSource: "gemini"},
		{Action: "reroute", AgentSource: "gemini"},
		{Action: "wait_and_continue", AgentSource: "gemini"},
	}
	seedBookingWithHistory(app, "bk_cap", "confirmed", history)

	rr := doReroute(t, app.Routes(), "bk_cap", 1.48, 103.76)
	if rr.Code != http.StatusOK {
		t.Fatalf("cap want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	if agent.calls != 0 {
		t.Errorf("agent must not be called when cap is hit; got %d calls", agent.calls)
	}
	data := decodeRerouteData(t, rr)
	if action, _ := data["action"].(string); action != "abort" {
		t.Errorf("action = %q want abort", action)
	}
	if src, _ := data["agentSource"].(string); src != "cap" {
		t.Errorf("agentSource = %q want cap", src)
	}
}

// ── cap: exactly 2 history entries still calls the agent ─────────────────────

func TestRerouteHandler_TwoReroutes_StillCallsAgent(t *testing.T) {
	agent := &stubRerouteAgent{
		result: &ranker.RerouteResult{Action: "wait_and_continue", UserMessage: "stay put", Source: "fallback"},
	}
	app := newRerouteApp(agent)

	history := []models.RerouteEvent{
		{Action: "reroute", AgentSource: "gemini"},
		{Action: "reroute", AgentSource: "gemini"},
	}
	seedBookingWithHistory(app, "bk_two", "confirmed", history)

	rr := doReroute(t, app.Routes(), "bk_two", 1.48, 103.76)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	if agent.calls != 1 {
		t.Errorf("agent must be called exactly once; got %d", agent.calls)
	}
}

// ── happy path: agent returns wait_and_continue ───────────────────────────────

func TestRerouteHandler_HappyPath_WaitAndContinue(t *testing.T) {
	agent := &stubRerouteAgent{result: &ranker.RerouteResult{
		Action:      "wait_and_continue",
		UserMessage: "Stay at the stop, next bus in 3 min.",
		Source:      "gemini",
	}}
	app := newRerouteApp(agent)
	seedBookingWithHistory(app, "bk_wait", "confirmed", nil)

	rr := doReroute(t, app.Routes(), "bk_wait", 1.48, 103.76)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	data := decodeRerouteData(t, rr)
	if action, _ := data["action"].(string); action != "wait_and_continue" {
		t.Errorf("action = %q want wait_and_continue", action)
	}
	if src, _ := data["agentSource"].(string); src != "gemini" {
		t.Errorf("agentSource = %q want gemini", src)
	}
	if data["newRoute"] != nil {
		t.Error("newRoute must be nil for wait_and_continue")
	}

	// Verify history entry appended.
	b, ok, _ := app.Store.GetBooking(context.Background(), "bk_wait")
	if !ok {
		t.Fatal("booking not found after reroute")
	}
	if len(b.RerouteHistory) != 1 {
		t.Errorf("history len = %d want 1", len(b.RerouteHistory))
	}
	if b.RerouteHistory[0].Action != "wait_and_continue" {
		t.Errorf("history[0].action = %q want wait_and_continue", b.RerouteHistory[0].Action)
	}
}

// ── happy path: agent returns abort ──────────────────────────────────────────

func TestRerouteHandler_HappyPath_Abort(t *testing.T) {
	agent := &stubRerouteAgent{result: &ranker.RerouteResult{
		Action:      "abort",
		UserMessage: "No route available. Please contact support.",
		Source:      "fallback",
	}}
	app := newRerouteApp(agent)
	seedBookingWithHistory(app, "bk_abort", "in_progress", nil)

	rr := doReroute(t, app.Routes(), "bk_abort", 1.48, 103.76)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	data := decodeRerouteData(t, rr)
	if action, _ := data["action"].(string); action != "abort" {
		t.Errorf("action = %q want abort", action)
	}
	if data["newRoute"] != nil {
		t.Error("newRoute must be nil for abort")
	}
}

// ── happy path: agent returns reroute with candidate ─────────────────────────

func TestRerouteHandler_HappyPath_Reroute(t *testing.T) {
	cand := &models.RouteCandidate{
		ID:            "cand_recomputed",
		Mode:          "eco",
		TotalDistance: 14.2,
		TotalDuration: 28,
		TotalCarbon:   300.0,
		DataSource:    "fallback_synthetic",
	}
	agent := &stubRerouteAgent{result: &ranker.RerouteResult{
		Action:       "reroute",
		UserMessage:  "Updated route from your current location.",
		NewCandidate: cand,
		Reasoning:    "step irrecoverable",
		Source:       "gemini",
	}}
	app := newRerouteApp(agent)
	seedBookingWithHistory(app, "bk_reroute", "confirmed", nil)

	rr := doReroute(t, app.Routes(), "bk_reroute", 1.48, 103.76)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	data := decodeRerouteData(t, rr)
	if action, _ := data["action"].(string); action != "reroute" {
		t.Errorf("action = %q want reroute", action)
	}
	if src, _ := data["agentSource"].(string); src != "gemini" {
		t.Errorf("agentSource = %q want gemini", src)
	}
	if data["newRoute"] == nil {
		t.Error("newRoute must be present for reroute action")
	}

	// ActiveRouteID must be updated on the booking.
	b, ok, _ := app.Store.GetBooking(context.Background(), "bk_reroute")
	if !ok {
		t.Fatal("booking not found after reroute")
	}
	if b.ActiveRouteID == "" {
		t.Error("ActiveRouteID must be set after a reroute action")
	}
	if len(b.RerouteHistory) != 1 {
		t.Errorf("history len = %d want 1", len(b.RerouteHistory))
	}
	if b.RerouteHistory[0].NewRouteID != b.ActiveRouteID {
		t.Errorf("history[0].newRouteId %q != activeRouteId %q", b.RerouteHistory[0].NewRouteID, b.ActiveRouteID)
	}
	// JourneyProgress must be reset to step 0 with a fresh timestamp.
	if b.JourneyProgress.CurrentStepIndex != 0 {
		t.Errorf("JourneyProgress.CurrentStepIndex = %d want 0", b.JourneyProgress.CurrentStepIndex)
	}
	if b.JourneyProgress.UpdatedAt.IsZero() {
		t.Error("JourneyProgress.UpdatedAt must not be zero after a reroute")
	}
	// Response must carry journeyProgress so the client sees the reset.
	jp, ok := data["journeyProgress"].(map[string]any)
	if !ok || jp == nil {
		t.Fatal("response must include journeyProgress field")
	}
	if jp["currentStepIndex"].(float64) != 0 {
		t.Fatalf("response journeyProgress.currentStepIndex = %v, want 0", jp["currentStepIndex"])
	}
	if jp["updatedAt"] == "" || jp["updatedAt"] == nil {
		t.Fatalf("response journeyProgress.updatedAt is empty")
	}
}

// ── no-op paths must not reset journey progress ───────────────────────────────

func TestRerouteHandler_NoProgress_WaitAndContinue(t *testing.T) {
	agent := &stubRerouteAgent{result: &ranker.RerouteResult{
		Action:      "wait_and_continue",
		UserMessage: "Stay at the stop.",
		Source:      "gemini",
	}}
	app := newRerouteApp(agent)
	// Seed a booking with an existing non-zero progress step and a known timestamp.
	seededAt := services.NowUTC()
	_ = app.Store.CreateBooking(context.Background(), models.Booking{
		ID:     "bk_wait_prog",
		UserID: "u_test",
		Status: "confirmed",
		JourneyProgress: models.JourneyProgress{
			CurrentStepIndex: 3,
			UpdatedAt:        seededAt,
		},
	})

	rr := doReroute(t, app.Routes(), "bk_wait_prog", 1.48, 103.76)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	after, _, _ := app.Store.GetBooking(context.Background(), "bk_wait_prog")
	if after.JourneyProgress.CurrentStepIndex != 3 {
		t.Errorf("wait_and_continue must not reset progress: got %d want 3", after.JourneyProgress.CurrentStepIndex)
	}
	if !after.JourneyProgress.UpdatedAt.Equal(seededAt) {
		t.Errorf("wait_and_continue must not touch UpdatedAt: got %v want %v", after.JourneyProgress.UpdatedAt, seededAt)
	}
}

func TestRerouteHandler_NoProgress_Abort(t *testing.T) {
	agent := &stubRerouteAgent{result: &ranker.RerouteResult{
		Action:      "abort",
		UserMessage: "No route available.",
		Source:      "fallback",
	}}
	app := newRerouteApp(agent)
	seededAt := services.NowUTC()
	_ = app.Store.CreateBooking(context.Background(), models.Booking{
		ID:     "bk_abort_prog",
		UserID: "u_test",
		Status: "confirmed",
		JourneyProgress: models.JourneyProgress{
			CurrentStepIndex: 2,
			UpdatedAt:        seededAt,
		},
	})

	rr := doReroute(t, app.Routes(), "bk_abort_prog", 1.48, 103.76)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body=%s", rr.Code, rr.Body.String())
	}
	after, _, _ := app.Store.GetBooking(context.Background(), "bk_abort_prog")
	if after.JourneyProgress.CurrentStepIndex != 2 {
		t.Errorf("abort must not reset progress: got %d want 2", after.JourneyProgress.CurrentStepIndex)
	}
	if !after.JourneyProgress.UpdatedAt.Equal(seededAt) {
		t.Errorf("abort must not touch UpdatedAt: got %v want %v", after.JourneyProgress.UpdatedAt, seededAt)
	}
}

// ── reasoning must not surface in response as a user-visible primary field ────
// (it IS present in the envelope for debug, but userMessage is the UI string)

func TestRerouteHandler_UserMessage_IsPresent(t *testing.T) {
	wantMsg := "Stay at the stop."
	agent := &stubRerouteAgent{result: &ranker.RerouteResult{
		Action:      "wait_and_continue",
		UserMessage: wantMsg,
		Reasoning:   "internal log only",
		Source:      "gemini",
	}}
	app := newRerouteApp(agent)
	seedBookingWithHistory(app, "bk_msg", "confirmed", nil)

	rr := doReroute(t, app.Routes(), "bk_msg", 1.48, 103.76)
	data := decodeRerouteData(t, rr)
	if got, _ := data["userMessage"].(string); got != wantMsg {
		t.Errorf("userMessage = %q want %q", got, wantMsg)
	}
}
