package handlers

import (
	"context"
	"log"
	"math"
	"net/http"
	"time"

	"github.com/verdify/backend/models"
	"github.com/verdify/backend/services"
	"github.com/verdify/backend/services/pricing"
	"github.com/verdify/backend/services/ranker"
)

const (
	totalBudget  = 8 * time.Second
	routesBudget = 3 * time.Second
	rankerBudget = 3 * time.Second
	minDistKM    = 0.05 // 50 m
)

func (app *App) calculateRouteHandler(w http.ResponseWriter, r *http.Request) {
	var req models.RouteRequest
	if err := parseJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}

	mode := ""
	if req.Mode != "" {
		mode = services.NormalizeMode(req.Mode)
		if mode == "" {
			writeErr(w, http.StatusBadRequest, "invalid_mode")
			return
		}
	}

	if tooClose(req.Origin, req.Destination) {
		writeErr(w, http.StatusBadRequest, "origin_destination_too_close")
		return
	}

	passengers := req.Passengers
	if passengers < 1 {
		passengers = 1
	}

	ctx, cancel := context.WithTimeout(r.Context(), totalBudget)
	defer cancel()

	rctx, rcancel := context.WithTimeout(ctx, routesBudget)
	candidates, err := app.Builder.Build(rctx, req.Origin, req.Destination)
	rcancel()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "candidate_build_failed")
		return
	}

	peak := pricing.IsPeakHour(services.NowMY())

	rankIn := buildRankInput(mode, peak, passengers, candidates)
	annCtx, acancel := context.WithTimeout(ctx, rankerBudget)
	result, rerr := app.Ranker.Annotate(annCtx, rankIn)
	acancel()
	if rerr != nil || result == nil {
		result = templatedResult(rankIn)
	}

	opts := make([]models.RouteOption, 0, len(candidates))
	for i, c := range candidates {
		opt := buildOption(c, result.Items[i], passengers)
		rt := optionToRoute(req.Origin, req.Destination, opt, opt.Steps)
		app.Store.SaveRoute(r.Context(), rt)
		opt.RouteID = rt.ID
		opt.CreatedAt = rt.CreatedAt
		opts = append(opts, opt)
	}

	var realCount, fallbackCount int
	for _, c := range candidates {
		if c.DataSource == "google_routes" {
			realCount++
		} else {
			fallbackCount++
		}
	}
	log.Printf("event=route_calculate routes_real=%d routes_fallback=%d ranker=%s peak=%v",
		realCount, fallbackCount, result.Source, peak)

	writeOK(w, http.StatusOK, models.RouteCalculateResponse{
		Options:      opts,
		RankerSource: result.Source,
		Peak:         peak,
	})
}

func tooClose(a, b models.Location) bool {
	dLat := a.Latitude - b.Latitude
	dLon := a.Longitude - b.Longitude
	dist := math.Hypot(dLat, dLon) * 111.0 // crude km estimate
	return dist < minDistKM
}

func buildRankInput(userMode string, peak bool, passengers int, cs []models.RouteCandidate) ranker.RankInput {
	rcs := make([]ranker.RankCandidate, 0, len(cs))
	for _, c := range cs {
		steps := make([]string, 0, len(c.Steps))
		for _, s := range c.Steps {
			steps = append(steps, s.Type)
		}
		rcs = append(rcs, ranker.RankCandidate{
			ID:          c.ID,
			Mode:        c.Mode,
			Label:       c.Label,
			DistanceKM:  c.TotalDistance,
			DurationMin: c.TotalDuration,
			CarbonGrams: c.TotalCarbon,
			CostMYR:     totalStepCost(c, passengers),
			Steps:       steps,
			DataSource:  c.DataSource,
		})
	}
	in := ranker.RankInput{
		Peak:        peak,
		LocaleHints: []string{"KL", "Malaysia"},
		Candidates:  rcs,
	}
	if userMode != "" {
		m := userMode
		in.UserMode = &m
	}
	return in
}

func templatedResult(in ranker.RankInput) *ranker.RankResult {
	items := make([]ranker.Annotation, 0, len(in.Candidates))
	for _, c := range in.Candidates {
		items = append(items, ranker.Annotation{
			ID:             c.ID,
			Reasoning:      c.Label,
			RecommendedFor: nil,
			Recommended:    in.UserMode != nil && "cand_"+*in.UserMode == c.ID,
		})
	}
	src := "fallback_scorer"
	if in.UserMode != nil {
		src = "user_mode"
	}
	return &ranker.RankResult{Items: items, Source: src}
}

func buildOption(c models.RouteCandidate, ann ranker.Annotation, passengers int) models.RouteOption {
	baseline := pricing.BaselineCarbonGrams(c.TotalDistance)
	pts := pricing.PointsEstimate(c.TotalDistance, baseline, c.TotalCarbon)

	stepsWithCost := make([]models.TransportSegment, len(c.Steps))
	var totalCost float64
	for i, step := range c.Steps {
		step.EstimatedCost = pricing.Round2(pricing.EstimateStepCostForParty(step.Type, step.Distance, passengers))
		stepsWithCost[i] = step
		totalCost += step.EstimatedCost
	}

	carbonSaved := baseline - c.TotalCarbon
	if carbonSaved < 0 {
		carbonSaved = 0
	}

	opt := models.RouteOption{
		Mode:                 c.Mode,
		TotalDistance:        c.TotalDistance,
		TotalDuration:        c.TotalDuration,
		CarbonEstimate:       c.TotalCarbon,
		CarbonBaseline:       pricing.Round2(baseline),
		CarbonSavedGrams:     pricing.Round2(carbonSaved),
		CarbonSavingsPercent: pricing.CarbonSavingsPercent(baseline, c.TotalCarbon),
		CarbonEstimateKg:     pricing.Round2(c.TotalCarbon / 1000),
		EstimatedCost:        pricing.Round2(totalCost),
		GreenPointsEstimate:  pts,
		Steps:                stepsWithCost,
		Polyline:             c.Polyline,
		Reasoning:            ann.Reasoning,
		RecommendedFor:       ann.RecommendedFor,
		Recommended:          ann.Recommended,
		DataSource:           c.DataSource,
	}
	if opt.RecommendedFor == nil {
		opt.RecommendedFor = []string{}
	}
	return opt
}

func optionToRoute(origin, dest models.Location, opt models.RouteOption, steps []models.TransportSegment) models.Route {
	return models.Route{
		ID:                   newID("route_"),
		Origin:               origin,
		Destination:          dest,
		Mode:                 opt.Mode,
		TotalDistance:        opt.TotalDistance,
		TotalDuration:        opt.TotalDuration,
		CarbonEstimate:       opt.CarbonEstimate,
		CarbonBaseline:       opt.CarbonBaseline,
		CarbonSavedGrams:     opt.CarbonSavedGrams,
		CarbonSavingsPercent: opt.CarbonSavingsPercent,
		CarbonEstimateKg:     opt.CarbonEstimateKg,
		EstimatedCost:        opt.EstimatedCost,
		GreenPointsEstimate:  opt.GreenPointsEstimate,
		Steps:                steps,
		Polyline:             opt.Polyline,
		CreatedAt:            services.NowUTC(),
	}
}

func totalStepCost(c models.RouteCandidate, passengers int) float64 {
	var t float64
	for _, s := range c.Steps {
		t += pricing.EstimateStepCostForParty(s.Type, s.Distance, passengers)
	}
	return pricing.Round2(t)
}
