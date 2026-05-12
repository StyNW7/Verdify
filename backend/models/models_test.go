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
