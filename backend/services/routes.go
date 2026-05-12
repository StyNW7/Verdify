package services

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

const routesAPIURL = "https://routes.googleapis.com/directions/v2:computeRoutes"

type RoutesClient struct {
	apiKey     string
	httpClient *http.Client
}

func NewRoutesClient(apiKey string) *RoutesClient {
	return &RoutesClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (rc *RoutesClient) Enabled() bool {
	return rc.apiKey != ""
}

type routesWaypoint struct {
	Location struct {
		LatLng struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"latLng"`
	} `json:"location"`
}

type routesRequest struct {
	Origin                   routesWaypoint `json:"origin"`
	Destination              routesWaypoint `json:"destination"`
	TravelMode               string         `json:"travelMode"`
	RoutingPreference        string         `json:"routingPreference,omitempty"`
	ComputeAlternativeRoutes bool           `json:"computeAlternativeRoutes"`
}

type routesResponseRoute struct {
	Polyline struct {
		EncodedPolyline string `json:"encodedPolyline"`
	} `json:"polyline"`
	DistanceMeters int    `json:"distanceMeters"`
	Duration       string `json:"duration"`
}

type routesResponse struct {
	Routes []routesResponseRoute `json:"routes"`
}

type RouteGeometry struct {
	EncodedPolyline string
	DistanceMeters  int
	DurationSeconds int
}

func (rc *RoutesClient) ComputeRoute(ctx context.Context, origin, destination models.Location, travelMode string) (*RouteGeometry, error) {
	if !rc.Enabled() {
		return nil, fmt.Errorf("routes API not configured")
	}

	req := routesRequest{
		TravelMode:               travelMode,
		ComputeAlternativeRoutes: false,
	}
	req.Origin.Location.LatLng.Latitude = origin.Latitude
	req.Origin.Location.LatLng.Longitude = origin.Longitude
	req.Destination.Location.LatLng.Latitude = destination.Latitude
	req.Destination.Location.LatLng.Longitude = destination.Longitude

	if travelMode == "DRIVE" {
		req.RoutingPreference = "TRAFFIC_AWARE"
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, routesAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Goog-Api-Key", rc.apiKey)
	httpReq.Header.Set("X-Goog-FieldMask", "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration")

	resp, err := rc.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("routes API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var routesResp routesResponse
	if err := json.Unmarshal(respBody, &routesResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if len(routesResp.Routes) == 0 {
		return nil, fmt.Errorf("no routes found")
	}

	route := routesResp.Routes[0]

	return &RouteGeometry{
		EncodedPolyline: route.Polyline.EncodedPolyline,
		DistanceMeters:  route.DistanceMeters,
		DurationSeconds: parseGoogleDuration(route.Duration),
	}, nil
}

// parseGoogleDuration parses Google's duration format like "600s" into seconds.
func parseGoogleDuration(s string) int {
	s = strings.TrimSpace(s)
	if strings.HasSuffix(s, "s") {
		v, err := strconv.Atoi(s[:len(s)-1])
		if err == nil {
			return v
		}
	}
	return 0
}
