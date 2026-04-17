package main

import (
	"encoding/json"
	"net/http"
	"time"
)

type apiResponse struct {
	Success  bool        `json:"success"`
	Data     any         `json:"data"`
	Error    string      `json:"error"`
	Metadata apiMetadata `json:"metadata"`
}

type apiMetadata struct {
	Timestamp string `json:"timestamp"`
	Version   string `json:"version"`
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(apiResponse{
		Success: true,
		Data: map[string]string{
			"status": "healthy",
		},
		Metadata: apiMetadata{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Version:   "v1",
		},
	})
}
