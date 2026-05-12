package routes

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/verdify/backend/models"
)

const apiURL = "https://routes.googleapis.com/directions/v2:computeRoutes"

type Client struct {
	apiKey     string
	httpClient *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *Client) Enabled() bool {
	return c.apiKey != ""
}

type waypoint struct {
	Location struct {
		LatLng struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"latLng"`
	} `json:"location"`
}

type request struct {
	Origin                   waypoint `json:"origin"`
	Destination              waypoint `json:"destination"`
	TravelMode               string   `json:"travelMode"`
	RoutingPreference        string   `json:"routingPreference,omitempty"`
	ComputeAlternativeRoutes bool     `json:"computeAlternativeRoutes"`
}

type respRoute struct {
	Polyline struct {
		EncodedPolyline string `json:"encodedPolyline"`
	} `json:"polyline"`
	DistanceMeters int    `json:"distanceMeters"`
	Duration       string `json:"duration"`
}

type respBody struct {
	Routes []respRoute `json:"routes"`
}

// Compute satisfies RouteFetcher.
func (c *Client) Compute(ctx context.Context, origin, dest models.Location, travelMode, routingPreference string) (*Geometry, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("routes API not configured")
	}

	req := request{
		TravelMode:               travelMode,
		RoutingPreference:        routingPreference,
		ComputeAlternativeRoutes: false,
	}
	req.Origin.Location.LatLng.Latitude = origin.Latitude
	req.Origin.Location.LatLng.Longitude = origin.Longitude
	req.Destination.Location.LatLng.Latitude = dest.Latitude
	req.Destination.Location.LatLng.Longitude = dest.Longitude

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Goog-Api-Key", c.apiKey)
	httpReq.Header.Set("X-Goog-FieldMask", "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("routes API returned %d: %s", resp.StatusCode, string(respBytes))
	}

	var rb respBody
	if err := json.Unmarshal(respBytes, &rb); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	if len(rb.Routes) == 0 {
		return nil, fmt.Errorf("no routes returned")
	}
	r := rb.Routes[0]
	return &Geometry{
		EncodedPolyline: r.Polyline.EncodedPolyline,
		DistanceMeters:  r.DistanceMeters,
		DurationSeconds: parseGoogleDuration(r.Duration),
	}, nil
}

func parseGoogleDuration(s string) int {
	s = strings.TrimSpace(s)
	if strings.HasSuffix(s, "s") {
		if v, err := strconv.Atoi(s[:len(s)-1]); err == nil {
			return v
		}
	}
	return 0
}
