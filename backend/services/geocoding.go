package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const geocodeAPIURL = "https://maps.googleapis.com/maps/api/geocode/json"

type GeocodingClient struct {
	apiKey     string
	httpClient *http.Client
}

func NewGeocodingClient(apiKey string) *GeocodingClient {
	return &GeocodingClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (gc *GeocodingClient) Enabled() bool {
	return gc.apiKey != ""
}

type GeocodeSuggestion struct {
	FormattedAddress string  `json:"formattedAddress"`
	Latitude         float64 `json:"latitude"`
	Longitude        float64 `json:"longitude"`
	PlaceID          string  `json:"placeId"`
}

type geocodeResponse struct {
	Results []struct {
		FormattedAddress string `json:"formatted_address"`
		Geometry         struct {
			Location struct {
				Lat float64 `json:"lat"`
				Lng float64 `json:"lng"`
			} `json:"location"`
		} `json:"geometry"`
		PlaceID string `json:"place_id"`
	} `json:"results"`
	Status string `json:"status"`
}

func (gc *GeocodingClient) Autocomplete(ctx context.Context, query string) ([]GeocodeSuggestion, error) {
	if !gc.Enabled() {
		return nil, fmt.Errorf("geocoding API not configured")
	}

	if query == "" {
		return []GeocodeSuggestion{}, nil
	}

	params := url.Values{}
	params.Set("address", query)
	params.Set("key", gc.apiKey)
	params.Set("region", "my")
	params.Set("bounds", "1.2|103.6|1.6|104.1")

	reqURL := geocodeAPIURL + "?" + params.Encode()
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := gc.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var geoResp geocodeResponse
	if err := json.Unmarshal(body, &geoResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if geoResp.Status != "OK" && geoResp.Status != "ZERO_RESULTS" {
		return nil, fmt.Errorf("geocoding API status: %s", geoResp.Status)
	}

	suggestions := make([]GeocodeSuggestion, 0, len(geoResp.Results))
	limit := len(geoResp.Results)
	if limit > 5 {
		limit = 5
	}
	for _, r := range geoResp.Results[:limit] {
		suggestions = append(suggestions, GeocodeSuggestion{
			FormattedAddress: r.FormattedAddress,
			Latitude:         r.Geometry.Location.Lat,
			Longitude:        r.Geometry.Location.Lng,
			PlaceID:          r.PlaceID,
		})
	}

	return suggestions, nil
}
