package models

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestLocationOptionalAddress(t *testing.T) {
	body := `{"latitude":1.5,"longitude":103.6,"address":"Mid Valley"}`
	var loc Location
	if err := json.Unmarshal([]byte(body), &loc); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if loc.Address != "Mid Valley" {
		t.Fatalf("want address Mid Valley got %q", loc.Address)
	}
	// address must be omitted when empty
	out, _ := json.Marshal(Location{Latitude: 1.0, Longitude: 2.0})
	if string(out) != `{"latitude":1,"longitude":2}` {
		t.Fatalf("want no address field got %s", string(out))
	}
}

func TestRouteRequestModeOptional(t *testing.T) {
	body := `{"origin":{"latitude":1,"longitude":2},"destination":{"latitude":3,"longitude":4}}`
	var req RouteRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if req.Mode != "" {
		t.Fatalf("expected empty mode (omitted), got %q", req.Mode)
	}

	// marshal direction: empty Mode must NOT appear in output (omitempty)
	out, err := json.Marshal(RouteRequest{
		Origin:      Location{Latitude: 1, Longitude: 2},
		Destination: Location{Latitude: 3, Longitude: 4},
	})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if strings.Contains(string(out), `"mode"`) {
		t.Fatalf("mode should be omitted when empty, got %s", string(out))
	}
}

func TestRouteOptionJSON(t *testing.T) {
	opt := RouteOption{
		RouteID:        "route_x",
		Mode:           "fast",
		Reasoning:      "Fast EV.",
		RecommendedFor: []string{"time-critical trips"},
		Recommended:    true,
		DataSource:     "google_routes",
	}
	b, err := json.Marshal(opt)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	for _, want := range []string{`"routeId":"route_x"`, `"reasoning":"Fast EV."`, `"recommendedFor":["time-critical trips"]`, `"recommended":true`, `"dataSource":"google_routes"`} {
		if !strings.Contains(string(b), want) {
			t.Errorf("missing %s in %s", want, string(b))
		}
	}
}

func TestRouteCalculateResponseShape(t *testing.T) {
	resp := RouteCalculateResponse{
		Options:      []RouteOption{{Mode: "fast"}, {Mode: "eco"}, {Mode: "cheap"}},
		RankerSource: "gemini",
		Peak:         true,
	}
	b, _ := json.Marshal(resp)
	for _, want := range []string{`"options":[`, `"rankerSource":"gemini"`, `"peak":true`} {
		if !strings.Contains(string(b), want) {
			t.Errorf("missing %s in %s", want, string(b))
		}
	}
}
