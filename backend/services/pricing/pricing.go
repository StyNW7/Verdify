// Package pricing holds domain math for cost, carbon, points, rounding,
// and peak-hour detection. These functions are pure (no external calls).
package pricing

import (
	"math"
	"time"
)

// EstimateStepCost returns the estimated cost in MYR for a single transport segment.
func EstimateStepCost(stepType string, distanceKM float64) float64 {
	switch stepType {
	case "walking":
		return 0
	case "bus":
		return 1.6 + distanceKM*0.18
	case "rts", "lrt", "mrt":
		return 2.4 + distanceKM*0.22
	case "ev_taxi", "evTaxi":
		return 4.5 + distanceKM*0.88
	default:
		return 1.2 + distanceKM*0.25
	}
}

const (
	evTaxiStandardCapacity = 4
	evTaxiXLCapacity       = 6
	evTaxiXLMultiplier     = 1.5
)

// EstimateStepCostForParty returns the total estimated fare in MYR for a
// single transport segment carrying `passengers` riders.
//
// Per-passenger leg types (bus, lrt, mrt, rts, ferry, unknown) multiply the
// single-rider fare by the party size. The ev_taxi (per-vehicle) leg applies
// a capacity rule: one standard car for ≤4 pax, one XL car (1.5× fare) for
// 5-6 pax, and a split into ⌈pax/4⌉ standard cars for ≥7 pax. Walking is
// always 0. A non-positive `passengers` value normalises to 1.
func EstimateStepCostForParty(stepType string, distanceKM float64, passengers int) float64 {
	if passengers < 1 {
		passengers = 1
	}
	if stepType == "walking" {
		return 0
	}
	perVehicle := EstimateStepCost(stepType, distanceKM)
	if stepType == "ev_taxi" || stepType == "evTaxi" {
		return perVehicle * evTaxiVehicleMultiplier(passengers)
	}
	return perVehicle * float64(passengers)
}

// evTaxiVehicleMultiplier returns how many "standard-car fares" worth of
// charge the requested party costs, per the capacity rule above.
func evTaxiVehicleMultiplier(passengers int) float64 {
	switch {
	case passengers <= evTaxiStandardCapacity:
		return 1
	case passengers <= evTaxiXLCapacity:
		return evTaxiXLMultiplier
	default:
		cars := passengers / evTaxiStandardCapacity
		if passengers%evTaxiStandardCapacity != 0 {
			cars++
		}
		return float64(cars)
	}
}

// BaselineCarbonGrams returns the carbon a solo-drive baseline would emit
// for the given distance (200 g CO2/km).
func BaselineCarbonGrams(distanceKM float64) float64 {
	return distanceKM * 200
}

// CarbonSavingsPercent returns the percentage saved vs the baseline,
// clamped to [0, 99].
func CarbonSavingsPercent(baselineCarbon, actualCarbon float64) int {
	if baselineCarbon <= 0 {
		return 0
	}
	pct := int(math.Round(((baselineCarbon - actualCarbon) / baselineCarbon) * 100))
	if pct < 0 {
		return 0
	}
	if pct > 99 {
		return 99
	}
	return pct
}

// PointsEstimate returns the integer green-points award for a trip.
// Returns 0 when any input is non-positive.
func PointsEstimate(distanceKM, baselineCO2, actualCO2 float64) int {
	if distanceKM <= 0 || actualCO2 <= 0 || baselineCO2 <= 0 {
		return 0
	}
	v := distanceKM * (baselineCO2 / actualCO2) * 1.5
	if v < 0 {
		return 0
	}
	return int(math.Round(v))
}

// IsPeakHour returns true for KL morning, lunch, and evening rushes.
func IsPeakHour(t time.Time) bool {
	h := t.Hour()
	return (h >= 7 && h < 9) || (h >= 12 && h < 13) || (h >= 17 && h < 19)
}

// Round2 rounds a float to 2 decimal places.
func Round2(v float64) float64 {
	return math.Round(v*100) / 100
}
