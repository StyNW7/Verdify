package models

import "time"

type JourneyProgress struct {
	CurrentStepIndex int       `json:"currentStepIndex" firestore:"currentStepIndex"`
	UpdatedAt        time.Time `json:"updatedAt"        firestore:"updatedAt"`
}

type Location struct {
	Latitude  float64 `json:"latitude" firestore:"latitude"`
	Longitude float64 `json:"longitude" firestore:"longitude"`
	Address   string  `json:"address,omitempty" firestore:"address,omitempty"`
}

type TransportSegment struct {
	Type          string    `json:"type" firestore:"type"`
	StartLocation Location  `json:"startLocation" firestore:"startLocation"`
	EndLocation   Location  `json:"endLocation" firestore:"endLocation"`
	Distance      float64   `json:"distance" firestore:"distance"`
	Duration      int       `json:"duration" firestore:"duration"`
	CarbonPerKm   float64   `json:"carbonPerKm" firestore:"carbonPerKm"`
	TotalCarbon   float64   `json:"totalCarbon" firestore:"totalCarbon"`
	EstimatedCost float64   `json:"estimatedCost" firestore:"estimatedCost"`
	Departure     time.Time `json:"departure" firestore:"departure"`
	Arrival       time.Time `json:"arrival" firestore:"arrival"`
	// Transit-only contextual fields. Empty for walk/drive segments.
	TransitLine   string `json:"transitLine,omitempty" firestore:"transitLine,omitempty"`
	DepartureStop string `json:"departureStop,omitempty" firestore:"departureStop,omitempty"`
	ArrivalStop   string `json:"arrivalStop,omitempty" firestore:"arrivalStop,omitempty"`
	Headsign      string `json:"headsign,omitempty" firestore:"headsign,omitempty"`
	StopCount     int    `json:"stopCount,omitempty" firestore:"stopCount,omitempty"`
	// Turn-by-turn instruction text from Google (HTML-stripped). Empty for
	// synthetic segments. e.g., "Walk south on Jalan Stesen Sentral".
	Instruction string `json:"instruction,omitempty" firestore:"instruction,omitempty"`
}

type Route struct {
	ID                   string             `json:"routeId" firestore:"routeId"`
	Origin               Location           `json:"origin" firestore:"origin"`
	Destination          Location           `json:"destination" firestore:"destination"`
	Mode                 string             `json:"mode" firestore:"mode"`
	TotalDistance        float64            `json:"totalDistance" firestore:"totalDistance"`
	TotalDuration        int                `json:"totalDuration" firestore:"totalDuration"`
	CarbonEstimate       float64            `json:"carbonEstimate" firestore:"carbonEstimate"`
	CarbonBaseline       float64            `json:"carbonBaseline" firestore:"carbonBaseline"`
	CarbonSavedGrams     float64            `json:"carbonSavedGrams" firestore:"carbonSavedGrams"`
	CarbonSavingsPercent int                `json:"carbonSavingsPercent" firestore:"carbonSavingsPercent"`
	CarbonEstimateKg     float64            `json:"carbonEstimateKg" firestore:"carbonEstimateKg"`
	EstimatedCost        float64            `json:"estimatedCost" firestore:"estimatedCost"`
	GreenPointsEstimate  int                `json:"greenPointsEstimate" firestore:"greenPointsEstimate"`
	Steps                []TransportSegment `json:"steps" firestore:"steps"`
	Polyline             string             `json:"polyline,omitempty" firestore:"polyline,omitempty"`
	CreatedAt            time.Time          `json:"createdAt" firestore:"createdAt"`
}

type Booking struct {
	ID               string         `json:"bookingId" firestore:"bookingId"`
	UserID           string         `json:"userId" firestore:"userId"`
	RouteID          string         `json:"routeId" firestore:"routeId"`
	ActiveRouteID    string         `json:"activeRouteId" firestore:"activeRouteId"`
	RouteSnapshot    RouteOption    `json:"routeSnapshot" firestore:"routeSnapshot"`
	Passengers       int            `json:"passengers" firestore:"passengers"`
	Status           string         `json:"status" firestore:"status"`
	QRCode           string         `json:"qrCode" firestore:"qrCode"`
	BookingReference string         `json:"bookingReference" firestore:"bookingReference"`
	EstimatedPoints  int            `json:"estimatedPoints" firestore:"estimatedPoints"`
	ActualPoints     int            `json:"actualPoints" firestore:"actualPoints"`
	PaymentStatus    string         `json:"paymentStatus" firestore:"paymentStatus"`
	RerouteHistory  []RerouteEvent  `json:"rerouteHistory"  firestore:"rerouteHistory"`
	JourneyProgress JourneyProgress `json:"journeyProgress" firestore:"journeyProgress"`
	CreatedAt       time.Time       `json:"createdAt"       firestore:"createdAt"`
	CompletedAt     *time.Time      `json:"completedAt,omitempty" firestore:"completedAt,omitempty"`
}

// RerouteEvent records one "I missed my stop" trigger on a booking.
type RerouteEvent struct {
	Ts           time.Time `json:"ts" firestore:"ts"`
	FromLocation Location  `json:"fromLocation" firestore:"fromLocation"`
	Reason       string    `json:"reason" firestore:"reason"`
	Action       string    `json:"action" firestore:"action"` // "reroute" | "wait_and_continue" | "abort"
	NewRouteID   string    `json:"newRouteId,omitempty" firestore:"newRouteId,omitempty"`
	AgentSource  string    `json:"agentSource" firestore:"agentSource"` // "gemini" | "fallback" | "cap"
}

type RerouteRequest struct {
	CurrentLocation Location `json:"currentLocation"`
	Reason          string   `json:"reason,omitempty"` // "missed_stop" | "missed_connection" | "stuck"
}

// User is the persisted profile keyed by the Firebase uid. Password/Phone are
// gone — Firebase Auth owns credentials. DisplayName + PhotoURL are sourced
// from Firebase claims via /auth/sync.
type User struct {
	ID                string    `json:"userId" firestore:"userId"`
	Email             string    `json:"email" firestore:"email"`
	DisplayName       string    `json:"displayName" firestore:"displayName"`
	PhotoURL          string    `json:"photoURL" firestore:"photoURL"`
	PresetAvatar       string    `json:"presetAvatar,omitempty" firestore:"presetAvatar,omitempty"`
	PreferredTransport string    `json:"preferredTransport,omitempty" firestore:"preferredTransport,omitempty"`
	PreferredRouteMode string    `json:"preferredRouteMode,omitempty" firestore:"preferredRouteMode,omitempty"`
	Language           string    `json:"language,omitempty" firestore:"language,omitempty"`
	GreenPoints       int       `json:"greenPointsBalance" firestore:"greenPointsBalance"`
	TotalTrips        int       `json:"totalTripsCompleted" firestore:"totalTripsCompleted"`
	TotalCarbonSaved  float64   `json:"totalCarbonSaved" firestore:"totalCarbonSaved"` // grams
	TotalPointsEarned int       `json:"totalEarned" firestore:"totalEarned"`
	TotalRedeemed     int       `json:"totalRedeemed" firestore:"totalRedeemed"`
	CreatedAt         time.Time `json:"createdAt" firestore:"createdAt"`
}

// LeaderboardEntry is the public, privacy-safe shape returned by
// GET /api/v1/leaderboard. Email is deliberately excluded.
type LeaderboardEntry struct {
	Rank                int    `json:"rank"`
	UserID              string `json:"uid"`
	DisplayName         string `json:"displayName"`
	PhotoURL            string `json:"photoURL"`
	GreenPointsBalance  int    `json:"greenPointsBalance"`
	TotalTripsCompleted int    `json:"totalTripsCompleted"`
}

// UserProfile is the subset of User-shaped fields supplied by callers of
// Store.EnsureUser. Counters and CreatedAt are owned by the store.
type UserProfile struct {
	Email       string
	DisplayName string
	PhotoURL    string
}

type APIResponse struct {
	Success  bool    `json:"success"`
	Data     any     `json:"data"`
	Error    any     `json:"error"`
	Metadata APIMeta `json:"metadata"`
}

type APIMeta struct {
	Timestamp string `json:"timestamp"`
	Version   string `json:"version"`
}

type RouteRequest struct {
	Origin      Location `json:"origin"`
	Destination Location `json:"destination"`
	Mode        string   `json:"mode,omitempty"`
	Passengers  int      `json:"passengers,omitempty"`
}

type CreateBookingRequest struct {
	UserID        string      `json:"userId"`
	RouteID       string      `json:"routeId"`
	RouteSnapshot RouteOption `json:"routeSnapshot"`
	Passengers    int         `json:"passengers"`
}

type PayRequest struct {
	PaymentMethod string `json:"paymentMethod"`
}

type VerifyRequest struct {
	VerificationCode string `json:"verificationCode"`
}

type RouteCandidate struct {
	ID            string
	Label         string
	Mode          string // "fast" | "eco" | "cheap"
	TotalDistance float64
	TotalDuration int
	TotalCarbon   float64
	Congestion    float64
	Steps         []TransportSegment
	Polyline      string // empty when DataSource = fallback_synthetic without override
	DataSource    string // "google_routes" | "fallback_synthetic"
}

// RouteOption is the public, per-mode response object returned inside
// RouteCalculateResponse.Options. It supersedes Route as the wire shape.
type RouteOption struct {
	RouteID              string             `json:"routeId" firestore:"routeId"`
	Mode                 string             `json:"mode" firestore:"mode"`
	TotalDistance        float64            `json:"totalDistance" firestore:"totalDistance"`
	TotalDuration        int                `json:"totalDuration" firestore:"totalDuration"`
	CarbonEstimate       float64            `json:"carbonEstimate" firestore:"carbonEstimate"`
	CarbonBaseline       float64            `json:"carbonBaseline" firestore:"carbonBaseline"`
	CarbonSavedGrams     float64            `json:"carbonSavedGrams" firestore:"carbonSavedGrams"`
	CarbonSavingsPercent int                `json:"carbonSavingsPercent" firestore:"carbonSavingsPercent"`
	CarbonEstimateKg     float64            `json:"carbonEstimateKg" firestore:"carbonEstimateKg"`
	EstimatedCost        float64            `json:"estimatedCost" firestore:"estimatedCost"`
	GreenPointsEstimate  int                `json:"greenPointsEstimate" firestore:"greenPointsEstimate"`
	Steps                []TransportSegment `json:"steps" firestore:"steps"`
	Polyline             string             `json:"polyline,omitempty" firestore:"polyline,omitempty"`
	Reasoning            string             `json:"reasoning" firestore:"reasoning"`
	RecommendedFor       []string           `json:"recommendedFor" firestore:"recommendedFor"`
	Recommended          bool               `json:"recommended" firestore:"recommended"`
	DataSource           string             `json:"dataSource" firestore:"dataSource"` // "google_routes" | "fallback_synthetic"
	CreatedAt            time.Time          `json:"createdAt" firestore:"createdAt"`
}

type RouteCalculateResponse struct {
	Options      []RouteOption `json:"options"`
	RankerSource string        `json:"rankerSource"` // "gemini" | "fallback_scorer" | "user_mode"
	Peak         bool          `json:"peak"`
}
