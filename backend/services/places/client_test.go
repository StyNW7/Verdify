package places

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAutocomplete_HappyPath(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Goog-Api-Key"); got != "test_key" {
			t.Errorf("missing api key got %q", got)
		}
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body["input"] != "mid valley" {
			t.Errorf("input echoed wrong: %v", body["input"])
		}
		if body["sessionToken"] != "session-abc" {
			t.Errorf("session token echoed wrong: %v", body["sessionToken"])
		}
		_, _ = w.Write([]byte(`{
			"suggestions": [
				{
					"placePrediction": {
						"placeId": "ChIJ_one",
						"structuredFormat": {
							"mainText": {"text": "Mid Valley Megamall"},
							"secondaryText": {"text": "Mid Valley City, KL"}
						},
						"text": {"text": "Mid Valley Megamall, Mid Valley City, KL"}
					}
				}
			]
		}`))
	}))
	defer srv.Close()

	c := NewClient("test_key")
	c.autocompleteURL = srv.URL

	preds, err := c.Autocomplete(context.Background(), "mid valley", "session-abc")
	if err != nil {
		t.Fatalf("Autocomplete: %v", err)
	}
	if len(preds) != 1 {
		t.Fatalf("want 1 prediction got %d", len(preds))
	}
	p := preds[0]
	if p.PlaceID != "ChIJ_one" || p.PrimaryText != "Mid Valley Megamall" ||
		p.SecondaryText != "Mid Valley City, KL" || !strings.Contains(p.FullText, "Mid Valley Megamall") {
		t.Errorf("prediction shape wrong: %+v", p)
	}
}

func TestDetails_HappyPath(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.URL.Path, "/places/ChIJ_one") {
			t.Errorf("path missing place id: %s", r.URL.Path)
		}
		if r.URL.Query().Get("sessionToken") != "session-abc" {
			t.Errorf("missing session token")
		}
		_, _ = w.Write([]byte(`{
			"id": "ChIJ_one",
			"formattedAddress": "Mid Valley Megamall, Mid Valley City, KL",
			"location": {"latitude": 3.118, "longitude": 101.6772}
		}`))
	}))
	defer srv.Close()

	c := NewClient("test_key")
	c.detailsURLPrefix = srv.URL + "/places"

	d, err := c.Details(context.Background(), "ChIJ_one", "session-abc")
	if err != nil {
		t.Fatalf("Details: %v", err)
	}
	if d.PlaceID != "ChIJ_one" || d.Location.Latitude != 3.118 || d.Location.Longitude != 101.6772 {
		t.Errorf("details wrong: %+v", d)
	}
}

func TestAutocomplete_UpstreamError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"boom"}`))
	}))
	defer srv.Close()

	c := NewClient("test_key")
	c.autocompleteURL = srv.URL
	if _, err := c.Autocomplete(context.Background(), "x", "s"); err == nil {
		t.Fatal("want error on 500")
	}
}
