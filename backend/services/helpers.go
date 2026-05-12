package services

import (
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
	case "fast", "eco", "cheap":
		return v
	default:
		return ""
	}
}
