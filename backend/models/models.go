package models

import "time"

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type TransportSegment struct {
	Type          string    `json:"type"`
	StartLocation Location  `json:"startLocation"`
	EndLocation   Location  `json:"endLocation"`
	Distance      float64   `json:"distance"`
	Duration      int       `json:"duration"`
	CarbonPerKm   float64   `json:"carbonPerKm"`
	TotalCarbon   float64   `json:"totalCarbon"`
	EstimatedCost float64   `json:"estimatedCost"`
	Departure     time.Time `json:"departure"`
	Arrival       time.Time `json:"arrival"`
}

type Route struct {
	ID                   string             `json:"routeId"`
	Origin               Location           `json:"origin"`
	Destination          Location           `json:"destination"`
	Mode                 string             `json:"mode"`
	TotalDistance        float64            `json:"totalDistance"`
	TotalDuration        int                `json:"totalDuration"`
	CarbonEstimate       float64            `json:"carbonEstimate"`
	CarbonBaseline       float64            `json:"carbonBaseline"`
	CarbonSavedGrams     float64            `json:"carbonSavedGrams"`
	CarbonSavingsPercent int                `json:"carbonSavingsPercent"`
	CarbonEstimateKg     float64            `json:"carbonEstimateKg"`
	EstimatedCost        float64            `json:"estimatedCost"`
	GreenPointsEstimate  int                `json:"greenPointsEstimate"`
	Steps                []TransportSegment `json:"steps"`
	Polyline             string             `json:"polyline,omitempty"`
	CreatedAt            time.Time          `json:"createdAt"`
}

type Booking struct {
	ID               string     `json:"bookingId"`
	UserID           string     `json:"userId"`
	RouteID          string     `json:"routeId"`
	Status           string     `json:"status"`
	QRCode           string     `json:"qrCode"`
	BookingReference string     `json:"bookingReference"`
	EstimatedPoints  int        `json:"estimatedPoints"`
	ActualPoints     int        `json:"actualPoints"`
	PaymentStatus    string     `json:"paymentStatus"`
	CreatedAt        time.Time  `json:"createdAt"`
	CompletedAt      *time.Time `json:"completedAt,omitempty"`
}

type User struct {
	ID                string    `json:"userId"`
	Email             string    `json:"email"`
	Phone             string    `json:"phone"`
	Password          string    `json:"-"`
	GreenPoints       int       `json:"greenPointsBalance"`
	TotalTrips        int       `json:"totalTripsCompleted"`
	TotalCarbonSaved  float64   `json:"totalCarbonSaved"`
	TotalPointsEarned int       `json:"totalEarned"`
	TotalRedeemed     int       `json:"totalRedeemed"`
	CreatedAt         time.Time `json:"createdAt"`
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
	Mode        string   `json:"mode"`
}

type CreateBookingRequest struct {
	UserID  string `json:"userId"`
	RouteID string `json:"routeId"`
}

type AuthRegisterRequest struct {
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type AuthLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
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
	TotalDistance float64
	TotalDuration int
	TotalCarbon   float64
	Congestion    float64
	Steps         []TransportSegment
}
