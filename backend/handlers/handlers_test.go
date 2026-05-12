package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/verdify/backend/config"
	"github.com/verdify/backend/models"
)

type routeResponseEnvelope struct {
	Success bool `json:"success"`
	Data    struct {
		RouteID        string  `json:"routeId"`
		Mode           string  `json:"mode"`
		TotalDuration  int     `json:"totalDuration"`
		CarbonEstimate float64 `json:"carbonEstimate"`
		Steps          []struct {
			Type string `json:"type"`
		} `json:"steps"`
	} `json:"data"`
}

func TestHealth(t *testing.T) {
	app := New(config.Load())
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d", rr.Code)
	}
}

func TestRouteAndBookingFlow(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()

	reg := models.AuthRegisterRequest{Email: "demo@verdify.dev", Password: "pass123", Phone: "+601234"}
	body, _ := json.Marshal(reg)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("register want 201 got %d body=%s", rr.Code, rr.Body.String())
	}

	var regResp models.APIResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &regResp)
	userID := regResp.Data.(map[string]any)["userId"].(string)

	routeReq := models.RouteRequest{Origin: models.Location{Latitude: 1.4854, Longitude: 103.7618}, Destination: models.Location{Latitude: 1.3521, Longitude: 103.8198}, Mode: ""}
	body, _ = json.Marshal(routeReq)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("route want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	_ = json.Unmarshal(rr.Body.Bytes(), &regResp)
	routeID := regResp.Data.(map[string]any)["routeId"].(string)

	bReq := models.CreateBookingRequest{UserID: userID, RouteID: routeID}
	body, _ = json.Marshal(bReq)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/bookings/create", bytes.NewReader(body))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("booking want 201 got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestExplicitModesMapToDistinctRouteProfiles(t *testing.T) {
	app := New(config.Load())
	mux := app.Routes()

	origin := models.Location{Latitude: 1.4854, Longitude: 103.7618}
	destination := models.Location{Latitude: 1.3521, Longitude: 103.8198}

	fast := callRoute(t, mux, models.RouteRequest{
		Origin: origin, Destination: destination, Mode: "fast",
	})
	eco := callRoute(t, mux, models.RouteRequest{
		Origin: origin, Destination: destination, Mode: "eco",
	})
	cheap := callRoute(t, mux, models.RouteRequest{
		Origin: origin, Destination: destination, Mode: "cheap",
	})

	if fast.Data.TotalDuration >= eco.Data.TotalDuration || fast.Data.TotalDuration >= cheap.Data.TotalDuration {
		t.Fatalf("fast should be shortest, got fast=%d eco=%d cheap=%d", fast.Data.TotalDuration, eco.Data.TotalDuration, cheap.Data.TotalDuration)
	}
	if eco.Data.CarbonEstimate >= fast.Data.CarbonEstimate || eco.Data.CarbonEstimate >= cheap.Data.CarbonEstimate {
		t.Fatalf("eco should be lowest carbon, got fast=%.2f eco=%.2f cheap=%.2f", fast.Data.CarbonEstimate, eco.Data.CarbonEstimate, cheap.Data.CarbonEstimate)
	}
	if len(fast.Data.Steps) != 1 || fast.Data.Steps[0].Type != "ev_taxi" {
		t.Fatalf("fast should be direct ev_taxi, got steps=%v", fast.Data.Steps)
	}
	if len(eco.Data.Steps) != 3 || eco.Data.Steps[1].Type != "lrt" {
		t.Fatalf("eco should be walk+lrt+walk, got steps=%v", eco.Data.Steps)
	}
	if len(cheap.Data.Steps) != 2 || cheap.Data.Steps[0].Type != "bus" {
		t.Fatalf("cheap should start with bus segment, got steps=%v", cheap.Data.Steps)
	}
}

func callRoute(t *testing.T, mux http.Handler, payload models.RouteRequest) routeResponseEnvelope {
	t.Helper()

	body, _ := json.Marshal(payload)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/routes/calculate", bytes.NewReader(body))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("route want 200 got %d body=%s", rr.Code, rr.Body.String())
	}

	var out routeResponseEnvelope
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatalf("unmarshal route response: %v", err)
	}
	return out
}
