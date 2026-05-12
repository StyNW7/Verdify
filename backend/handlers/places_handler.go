package handlers

import (
	"net/http"
	"strings"
)

func (app *App) placesAutocompleteHandler(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeErr(w, http.StatusBadRequest, "query parameter 'q' is required")
		return
	}
	sessionToken := strings.TrimSpace(r.URL.Query().Get("sessionToken"))

	preds, err := app.Places.Autocomplete(r.Context(), q, sessionToken)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "places upstream error")
		return
	}
	writeOK(w, http.StatusOK, map[string]any{
		"sessionToken": sessionToken,
		"predictions":  preds,
	})
}

func (app *App) placeDetailsHandler(w http.ResponseWriter, r *http.Request) {
	placeID := strings.TrimSpace(r.URL.Query().Get("placeId"))
	if placeID == "" {
		writeErr(w, http.StatusBadRequest, "placeId required")
		return
	}
	sessionToken := strings.TrimSpace(r.URL.Query().Get("sessionToken"))
	d, err := app.Places.Details(r.Context(), placeID, sessionToken)
	if err != nil || d == nil {
		writeErr(w, http.StatusBadGateway, "places upstream error")
		return
	}
	writeOK(w, http.StatusOK, d)
}
