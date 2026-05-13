package config

import "os"

type Config struct {
	Port             string
	FrontendOrigin   string
	VertexProjectID  string
	VertexLocation   string
	GeminiModel      string
	GeminiAgentModel string // reroute agent model; defaults to gemini-2.5-flash
	GoogleMapsAPIKey string
}

func Load() Config {
	model := getenv("GEMINI_MODEL", "vertexai/gemini-2.0-flash")
	if model != "" && !containsSlash(model) {
		model = "vertexai/" + model
	}
	agentModel := getenv("GEMINI_AGENT_MODEL", "vertexai/gemini-2.5-flash")
	if agentModel != "" && !containsSlash(agentModel) {
		agentModel = "vertexai/" + agentModel
	}

	return Config{
		Port:             getenv("PORT", "8080"),
		FrontendOrigin:   getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
		VertexProjectID:  getenv("VERTEX_PROJECT_ID", ""),
		VertexLocation:   getenv("VERTEX_LOCATION", "us-central1"),
		GeminiModel:      model,
		GeminiAgentModel: agentModel,
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
