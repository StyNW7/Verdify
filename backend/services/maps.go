package services

import (
	"math"
	"time"

	"github.com/verdify/backend/config"
	"github.com/verdify/backend/models"
)

type MapsClient struct {
	apiKey string
}

var farePerKM = map[string]float64{
	"walking": 0.0,
	"bus":     0.20,
	"lrt":     1.50,
	"ev_taxi": 2.00,
}

func NewMapsClient(cfg config.Config) *MapsClient {
	return &MapsClient{apiKey: cfg.GoogleMapsAPIKey}
}

func (m *MapsClient) Candidates(origin, destination models.Location) ([]models.RouteCandidate, error) {
	distance := haversineKM(origin.Latitude, origin.Longitude, destination.Latitude, destination.Longitude)
	if distance < 3 {
		distance = 3
	}
	now := NowUTC()

	fastDistance := Round2(distance)
	ecoDistance := Round2(distance * 1.12)
	flowDistance := Round2(distance * 1.22)

	fast := models.RouteCandidate{
		ID:            "cand_fast",
		Label:         "EV direct",
		TotalDistance: fastDistance,
		TotalDuration: int(math.Round((fastDistance/42.0)*60.0)) + 8,
		TotalCarbon:   fastDistance * 80,
		Congestion:    0.78,
		Steps: []models.TransportSegment{
			segment("ev_taxi", origin, destination, fastDistance, int(math.Round((fastDistance/42.0)*60.0))+8, 80, now),
		},
	}

	ecoMidA := midpoint(origin, destination, 0.2)
	ecoMidB := midpoint(origin, destination, 0.8)
	eco := models.RouteCandidate{
		ID:            "cand_eco",
		Label:         "Walk + rail + walk",
		TotalDistance: ecoDistance,
		TotalDuration: int(math.Round((ecoDistance/30.0)*60.0)) + 18,
		TotalCarbon:   ecoDistance * 40,
		Congestion:    0.40,
		Steps: []models.TransportSegment{
			segment("walking", origin, ecoMidA, Round2(ecoDistance*0.08), 8, 0, now),
			segment("lrt", ecoMidA, ecoMidB, Round2(ecoDistance*0.84), int(math.Round((ecoDistance*0.84/33.0)*60.0))+4, 40, now),
			segment("walking", ecoMidB, destination, Round2(ecoDistance*0.08), 7, 0, now),
		},
	}

	flowMid := midpoint(origin, destination, 0.55)
	flow := models.RouteCandidate{
		ID:            "cand_cheap",
		Label:         "Cheap bus + EV bypass",
		TotalDistance: flowDistance,
		TotalDuration: int(math.Round((flowDistance/31.0)*60.0)) + 10,
		TotalCarbon:   (flowDistance * 0.55 * 60) + (flowDistance * 0.45 * 80),
		Congestion:    0.25,
		Steps: []models.TransportSegment{
			segment("bus", origin, flowMid, Round2(flowDistance*0.55), int(math.Round((flowDistance*0.55/26.0)*60.0))+4, 60, now),
			segment("ev_taxi", flowMid, destination, Round2(flowDistance*0.45), int(math.Round((flowDistance*0.45/38.0)*60.0))+4, 80, now),
		},
	}

	return []models.RouteCandidate{fast, eco, flow}, nil
}

func segment(kind string, start, end models.Location, distance float64, duration int, carbonPerKM float64, depart time.Time) models.TransportSegment {
	return models.TransportSegment{
		Type:          kind,
		StartLocation: start,
		EndLocation:   end,
		Distance:      distance,
		Duration:      duration,
		CarbonPerKm:   carbonPerKM,
		TotalCarbon:   Round2(distance * carbonPerKM),
		EstimatedCost: Round2(distance * farePerKM[kind]),
		Departure:     depart,
		Arrival:       depart.Add(time.Duration(duration) * time.Minute),
	}
}

func midpoint(a, b models.Location, ratio float64) models.Location {
	return models.Location{
		Latitude:  a.Latitude + (b.Latitude-a.Latitude)*ratio,
		Longitude: a.Longitude + (b.Longitude-a.Longitude)*ratio,
	}
}

func haversineKM(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	dLat := deg2rad(lat2 - lat1)
	dLon := deg2rad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(deg2rad(lat1))*math.Cos(deg2rad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

func deg2rad(d float64) float64 {
	return d * (math.Pi / 180)
}
