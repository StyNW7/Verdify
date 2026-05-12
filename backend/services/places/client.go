package places

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/verdify/backend/models"
)

const (
	defaultAutocompleteURL  = "https://places.googleapis.com/v1/places:autocomplete"
	defaultDetailsURLPrefix = "https://places.googleapis.com/v1/places"
)

type Client struct {
	apiKey           string
	httpClient       *http.Client
	autocompleteURL  string // injectable for tests
	detailsURLPrefix string // injectable for tests
}

func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:           apiKey,
		httpClient:       &http.Client{Timeout: 8 * time.Second},
		autocompleteURL:  defaultAutocompleteURL,
		detailsURLPrefix: defaultDetailsURLPrefix,
	}
}

func (c *Client) Enabled() bool {
	return c.apiKey != ""
}

type autocompleteReq struct {
	Input               string   `json:"input"`
	SessionToken        string   `json:"sessionToken,omitempty"`
	RegionCode          string   `json:"regionCode,omitempty"`
	LanguageCode        string   `json:"languageCode,omitempty"`
	IncludedRegionCodes []string `json:"includedRegionCodes,omitempty"`
}

type autocompleteResp struct {
	Suggestions []struct {
		PlacePrediction struct {
			PlaceID          string `json:"placeId"`
			Text             struct{ Text string `json:"text"` } `json:"text"`
			StructuredFormat struct {
				MainText      struct{ Text string `json:"text"` } `json:"mainText"`
				SecondaryText struct{ Text string `json:"text"` } `json:"secondaryText"`
			} `json:"structuredFormat"`
		} `json:"placePrediction"`
	} `json:"suggestions"`
}

// Autocomplete satisfies PlacesAPI.
func (c *Client) Autocomplete(ctx context.Context, query, sessionToken string) ([]Prediction, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("places API not configured")
	}
	q := strings.TrimSpace(query)
	if q == "" {
		return []Prediction{}, nil
	}

	body, _ := json.Marshal(autocompleteReq{
		Input:               q,
		SessionToken:        sessionToken,
		RegionCode:          "MY",
		LanguageCode:        "en",
		IncludedRegionCodes: []string{"my"},
	})

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.autocompleteURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Goog-Api-Key", c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("places autocomplete %d: %s", resp.StatusCode, string(respBody))
	}

	var ar autocompleteResp
	if err := json.Unmarshal(respBody, &ar); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	out := make([]Prediction, 0, len(ar.Suggestions))
	for _, s := range ar.Suggestions {
		out = append(out, Prediction{
			PlaceID:       s.PlacePrediction.PlaceID,
			PrimaryText:   s.PlacePrediction.StructuredFormat.MainText.Text,
			SecondaryText: s.PlacePrediction.StructuredFormat.SecondaryText.Text,
			FullText:      s.PlacePrediction.Text.Text,
		})
	}
	return out, nil
}

type detailsResp struct {
	ID               string `json:"id"`
	FormattedAddress string `json:"formattedAddress"`
	Location         struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"location"`
}

func (c *Client) Details(ctx context.Context, placeID, sessionToken string) (*PlaceDetails, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("places API not configured")
	}
	if strings.TrimSpace(placeID) == "" {
		return nil, fmt.Errorf("placeId required")
	}

	u := c.detailsURLPrefix + "/" + url.PathEscape(placeID)
	if sessionToken != "" {
		u += "?sessionToken=" + url.QueryEscape(sessionToken)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	httpReq.Header.Set("X-Goog-Api-Key", c.apiKey)
	httpReq.Header.Set("X-Goog-FieldMask", "id,formattedAddress,location")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("places details %d: %s", resp.StatusCode, string(body))
	}

	var d detailsResp
	if err := json.Unmarshal(body, &d); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	return &PlaceDetails{
		PlaceID: d.ID,
		Location: models.Location{
			Latitude:  d.Location.Latitude,
			Longitude: d.Location.Longitude,
			Address:   d.FormattedAddress,
		},
	}, nil
}
