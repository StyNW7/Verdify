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
