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

	routeReq := models.RouteRequest{Origin: models.Location{Latitude: 1.4854, Longitude: 103.7618}, Destination: models.Location{Latitude: 1.3521, Longitude: 103.8198}, Mode: "smart"}
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
