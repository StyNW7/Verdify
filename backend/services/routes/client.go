package routes

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
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

type respLatLng struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type respLocation struct {
	LatLng respLatLng `json:"latLng"`
}

type respPolyline struct {
	EncodedPolyline string `json:"encodedPolyline"`
}

type respTransitLine struct {
	Name      string `json:"name"`
	NameShort string `json:"nameShort"`
	Vehicle   struct {
		Type string `json:"type"`
	} `json:"vehicle"`
}

type respTransitStop struct {
	Name string `json:"name"`
}

type respStopDetails struct {
	ArrivalStop   respTransitStop `json:"arrivalStop"`
	DepartureStop respTransitStop `json:"departureStop"`
}

type respTransitDetails struct {
	TransitLine  respTransitLine `json:"transitLine"`
	StopDetails  respStopDetails `json:"stopDetails"`
	Headsign     string          `json:"headsign"`
	StopCount    int             `json:"stopCount"`
}

type respNavInstruction struct {
	Instructions string `json:"instructions"` // HTML, e.g., "Walk south on <b>Jalan X</b>"
}

type respStep struct {
	DistanceMeters        int                `json:"distanceMeters"`
	StaticDuration        string             `json:"staticDuration"`
	TravelMode            string             `json:"travelMode"`
	Polyline              respPolyline       `json:"polyline"`
	StartLocation         respLocation       `json:"startLocation"`
	EndLocation           respLocation       `json:"endLocation"`
	TransitDetails        respTransitDetails `json:"transitDetails"`
	NavigationInstruction respNavInstruction `json:"navigationInstruction"`
}

type respLeg struct {
	Steps []respStep `json:"steps"`
}

type respRoute struct {
	Polyline       respPolyline `json:"polyline"`
	DistanceMeters int          `json:"distanceMeters"`
	Duration       string       `json:"duration"`
	Legs           []respLeg    `json:"legs"`
}

type respBody struct {
	Routes []respRoute `json:"routes"`
}

const fieldMask = "routes.polyline.encodedPolyline," +
	"routes.distanceMeters," +
	"routes.duration," +
	"routes.legs.steps.distanceMeters," +
	"routes.legs.steps.staticDuration," +
	"routes.legs.steps.travelMode," +
	"routes.legs.steps.polyline.encodedPolyline," +
	"routes.legs.steps.startLocation.latLng," +
	"routes.legs.steps.endLocation.latLng," +
	"routes.legs.steps.transitDetails.transitLine.name," +
	"routes.legs.steps.transitDetails.transitLine.nameShort," +
	"routes.legs.steps.transitDetails.transitLine.vehicle.type," +
	"routes.legs.steps.transitDetails.stopDetails.arrivalStop.name," +
	"routes.legs.steps.transitDetails.stopDetails.departureStop.name," +
	"routes.legs.steps.transitDetails.headsign," +
	"routes.legs.steps.transitDetails.stopCount," +
	"routes.legs.steps.navigationInstruction.instructions"

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
	httpReq.Header.Set("X-Goog-FieldMask", fieldMask)

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
		Legs:            convertRespLegs(r.Legs),
	}, nil
}

// convertRespLegs maps Google's wire shape into our internal Leg/Step types.
func convertRespLegs(in []respLeg) []Leg {
	if len(in) == 0 {
		return nil
	}
	out := make([]Leg, 0, len(in))
	for _, leg := range in {
		steps := make([]Step, 0, len(leg.Steps))
		for _, s := range leg.Steps {
			steps = append(steps, Step{
				TravelMode:        s.TravelMode,
				VehicleType:       s.TransitDetails.TransitLine.Vehicle.Type,
				TransitLineName:   pickTransitName(s.TransitDetails.TransitLine),
				DepartureStopName: s.TransitDetails.StopDetails.DepartureStop.Name,
				ArrivalStopName:   s.TransitDetails.StopDetails.ArrivalStop.Name,
				Headsign:          s.TransitDetails.Headsign,
				StopCount:         s.TransitDetails.StopCount,
				Instruction:       stripHTML(s.NavigationInstruction.Instructions),
				DistanceMeters:    s.DistanceMeters,
				DurationSeconds:   parseGoogleDuration(s.StaticDuration),
				StartLocation:     LatLng{Latitude: s.StartLocation.LatLng.Latitude, Longitude: s.StartLocation.LatLng.Longitude},
				EndLocation:       LatLng{Latitude: s.EndLocation.LatLng.Latitude, Longitude: s.EndLocation.LatLng.Longitude},
				EncodedPolyline:   s.Polyline.EncodedPolyline,
			})
		}
		out = append(out, Leg{Steps: steps})
	}
	return out
}

func pickTransitName(line respTransitLine) string {
	if line.Name != "" {
		return line.Name
	}
	return line.NameShort
}

// htmlTagRE strips simple HTML tags like <b>, </b>, <wbr>. Google's
// navigationInstruction.instructions emits HTML to bold place names; the
// text content alone is enough for our directions panel.
var htmlTagRE = regexp.MustCompile(`<[^>]*>`)

func stripHTML(s string) string {
	if s == "" {
		return ""
	}
	return strings.TrimSpace(htmlTagRE.ReplaceAllString(s, ""))
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
