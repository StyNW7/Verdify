package services

import (
	"math"
	"strings"
	"time"
)

func NowUTC() time.Time {
	return time.Now().UTC()
}

func NowMY() time.Time {
	loc, err := time.LoadLocation("Asia/Kuala_Lumpur")
	if err != nil {
		return time.Now().UTC()
	}
	return time.Now().In(loc)
}

func NormalizeMode(mode string) string {
	v := strings.ToLower(strings.TrimSpace(mode))
	switch v {
	case "fast", "ecoboost", "flowing", "smart":
		return v
	default:
		return ""
	}
}

func IsPeakHour(t time.Time) bool {
	h := t.Hour()
	return (h >= 7 && h < 9) || (h >= 12 && h < 13) || (h >= 17 && h < 19)
}

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

func Round2(v float64) float64 {
	return math.Round(v*100) / 100
}

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

// CarbonSavingsPercent returns the percentage of carbon saved vs a driving baseline,
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

// BaselineCarbonGrams returns the carbon emissions a solo-drive baseline would emit
// for the given distance (200 g CO2/km).
func BaselineCarbonGrams(distanceKM float64) float64 {
	return distanceKM * 200
}
