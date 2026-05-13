// Package validate provides pure validation for user-patch request bodies.
// It is the single source of truth for which fields a client may send via
// PATCH /api/v1/user/{userId}.
package validate

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode"
)

// AllowedPresetAvatars is the canonical list of emoji codepoints a user may
// choose as their preset avatar. The frontend mirrors this list.
var AllowedPresetAvatars = []string{"🌿", "🦊", "🌊", "🌙", "🐝", "🪴"}

// AllowedTransports is the allow-list for User.PreferredTransport. The
// frontend mirrors this list via lib/preferences.ts.
var AllowedTransports = []string{"Transit", "Cycle", "Carpool", "Walk"}

// AllowedRouteModes is the allow-list for User.PreferredRouteMode. These
// values are the same vocabulary as the existing Route.Mode enum consumed by
// POST /api/v1/routes/calculate?mode=... so the planner can pass the value
// through without translation.
var AllowedRouteModes = []string{"Fastest", "Greenest", "Cheapest", "Balanced"}

// AllowedLanguages is the allow-list for User.Language.
var AllowedLanguages = []string{"en", "ms", "zh", "ta"}

// ValidatedPatch holds the sanitised, validated fields from a user PATCH body.
// Only fields that were present in the request and passed validation are set
// (pointer semantics so absent ≠ zero-value).
type ValidatedPatch struct {
	DisplayName        *string
	PresetAvatar       *string
	PreferredTransport *string
	PreferredRouteMode *string
	Language           *string
}

// FieldError is a single per-field validation failure.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationError aggregates one or more field-level errors. It implements the
// error interface and serialises to { "errors": [...] } via json.Marshal.
type ValidationError struct {
	Errors []FieldError `json:"errors"`
}

func (e *ValidationError) Error() string {
	msgs := make([]string, len(e.Errors))
	for i, fe := range e.Errors {
		msgs[i] = fmt.Sprintf("%s: %s", fe.Field, fe.Message)
	}
	return strings.Join(msgs, "; ")
}

// allowedFields is the set of JSON keys a client may include in the patch body.
var allowedFields = map[string]struct{}{
	"displayName":        {},
	"presetAvatar":       {},
	"preferredTransport": {},
	"preferredRouteMode": {},
	"language":           {},
}

// ValidateUserPatch parses rawBody as JSON, rejects any unknown top-level key,
// then validates each known field according to its rules. An empty body or an
// empty JSON object are both valid (PATCH semantics — no-op).
//
// On success it returns a ValidatedPatch with only the provided fields set.
// On failure it returns a *ValidationError aggregating every field error found.
func ValidateUserPatch(rawBody []byte) (ValidatedPatch, error) {
	// Empty body is a valid no-op.
	trimmed := strings.TrimSpace(string(rawBody))
	if trimmed == "" {
		return ValidatedPatch{}, nil
	}

	// Parse into a raw map so we can detect unknown fields.
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(rawBody, &raw); err != nil {
		return ValidatedPatch{}, fmt.Errorf("invalid JSON: %w", err)
	}

	var errs []FieldError

	// First pass: reject unknown fields.
	for key := range raw {
		if _, ok := allowedFields[key]; !ok {
			errs = append(errs, FieldError{
				Field:   key,
				Message: fmt.Sprintf("unknown field %q", key),
			})
		}
	}

	var patch ValidatedPatch

	// displayName validation.
	if raw, ok := raw["displayName"]; ok {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			errs = append(errs, FieldError{Field: "displayName", Message: "must be a string"})
		} else {
			s = strings.TrimSpace(s)
			switch {
			case len(s) == 0:
				errs = append(errs, FieldError{Field: "displayName", Message: "must be between 1 and 60 characters"})
			case len([]rune(s)) > 60:
				errs = append(errs, FieldError{Field: "displayName", Message: "must be between 1 and 60 characters"})
			case hasControlChars(s):
				errs = append(errs, FieldError{Field: "displayName", Message: "must not contain control characters"})
			default:
				patch.DisplayName = &s
			}
		}
	}

	// presetAvatar validation.
	if raw, ok := raw["presetAvatar"]; ok {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			errs = append(errs, FieldError{Field: "presetAvatar", Message: "must be a string"})
		} else {
			if !isAllowedAvatar(s) {
				errs = append(errs, FieldError{
					Field:   "presetAvatar",
					Message: fmt.Sprintf("must be one of the allowed preset avatars: %s", strings.Join(AllowedPresetAvatars, " ")),
				})
			} else {
				patch.PresetAvatar = &s
			}
		}
	}

	// preferredTransport validation.
	if raw, ok := raw["preferredTransport"]; ok {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			errs = append(errs, FieldError{Field: "preferredTransport", Message: "must be a string"})
		} else if !isAllowedValue(s, AllowedTransports) {
			errs = append(errs, FieldError{
				Field:   "preferredTransport",
				Message: fmt.Sprintf("must be one of: %s", strings.Join(AllowedTransports, ", ")),
			})
		} else {
			patch.PreferredTransport = &s
		}
	}

	// preferredRouteMode validation.
	if raw, ok := raw["preferredRouteMode"]; ok {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			errs = append(errs, FieldError{Field: "preferredRouteMode", Message: "must be a string"})
		} else if !isAllowedValue(s, AllowedRouteModes) {
			errs = append(errs, FieldError{
				Field:   "preferredRouteMode",
				Message: fmt.Sprintf("must be one of: %s", strings.Join(AllowedRouteModes, ", ")),
			})
		} else {
			patch.PreferredRouteMode = &s
		}
	}

	// language validation.
	if raw, ok := raw["language"]; ok {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			errs = append(errs, FieldError{Field: "language", Message: "must be a string"})
		} else if !isAllowedValue(s, AllowedLanguages) {
			errs = append(errs, FieldError{
				Field:   "language",
				Message: fmt.Sprintf("must be one of: %s", strings.Join(AllowedLanguages, ", ")),
			})
		} else {
			patch.Language = &s
		}
	}

	if len(errs) > 0 {
		return ValidatedPatch{}, &ValidationError{Errors: errs}
	}
	return patch, nil
}

func hasControlChars(s string) bool {
	for _, r := range s {
		if unicode.Is(unicode.Cc, r) {
			return true
		}
	}
	return false
}

func isAllowedAvatar(s string) bool {
	if s == "" {
		return false
	}
	for _, allowed := range AllowedPresetAvatars {
		if s == allowed {
			return true
		}
	}
	return false
}

// isAllowedValue performs a case-sensitive membership check against list.
// Empty string always returns false.
func isAllowedValue(s string, list []string) bool {
	if s == "" {
		return false
	}
	for _, v := range list {
		if s == v {
			return true
		}
	}
	return false
}
