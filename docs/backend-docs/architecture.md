# architecture.md

## Route Calculation
Origin + Destination + Mode → Google Maps API → Genkit flow → Gemini on Vertex AI (carbon data) → Mode Optimizer → Best Route

## Modes
Fast: time-optimized (0.9 time, 0.1 carbon)
EcoBoost: carbon-optimized (0.3 time, 0.7 carbon)
Flowing: congestion-optimized (0.8 congestion, 0.2 carbon)
Smart: peak_hours? Flowing : EcoBoost

Peak hours: 7-9, 12-1, 5-7

## Green Points
Formula: distance_km * (baseline_co2g / actual_co2g) * 1.5
Baseline: EV 120, LRT 80, MRT 80, Bus 100 g/km
Show estimate before booking
Award actual after verification

## Data Models

Route: {ID, Origin{lat,lng}, Destination{lat,lng}, Mode, Steps[], Distance_km, Duration_min, CarbonEstimate_g, GreenPointsEstimate}

TransportSegment: {Type(ev_taxi|lrt|mrt|bus|walking), StartLocation, EndLocation, Distance_km, Duration_min, CarbonPerKm, TotalCarbon_g, Departure_iso8601, Arrival_iso8601}

Booking: {ID, UserID, RouteID, Status(pending|confirmed|completed|cancelled), QRCode, BookingReference, EstimatedPoints, ActualPoints, PaymentStatus, CreatedAt, CompletedAt}

User: {ID, Email, Phone, GreenPointsBalance, TotalTripsCompleted, TotalCarbonSaved_g, CreatedAt}

Trip: {ID, UserID, BookingID, StartTime, EndTime, CarbonActual_g, PointsAwarded}

## Firestore Collections
/users/{userId}
/bookings/{bookingId}
/routes/{routeId}
/carbon-data/{transportType}
/trips/{tripId}

## External APIs
Google Maps: routing, distance matrix, real-time congestion
Genkit: orchestration layer for AI flows/tools
Vertex AI: Gemini model hosting
Firebase: Firestore, Cloud Functions
Mock: DuitNow payment, EV Taxi APIs, Public Transport APIs
