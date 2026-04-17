package config

import "os"

type Config struct {
	Port             string
	VertexProjectID  string
	VertexLocation   string
	GeminiModel      string
	GoogleMapsAPIKey string
}

func Load() Config {
	model := getenv("GEMINI_MODEL", "vertexai/gemini-2.0-flash")
	if model != "" && !containsSlash(model) {
		model = "vertexai/" + model
	}

	return Config{
		Port:             getenv("PORT", "8080"),
		VertexProjectID:  getenv("VERTEX_PROJECT_ID", ""),
		VertexLocation:   getenv("VERTEX_LOCATION", "us-central1"),
		GeminiModel:      model,
		GoogleMapsAPIKey: getenv("GOOGLE_MAPS_API_KEY", ""),
	}
}

func getenv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}

func containsSlash(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] == '/' {
			return true
		}
	}
	return false
}
