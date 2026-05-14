package validate_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/verdify/backend/validate"
)

func TestValidateUserPatch(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		wantErr        bool
		wantFields     []string // error fields that must appear
		wantDisplay    string   // expected trimmed displayName in result
		wantAvatar     string   // expected presetAvatar in result
		wantTransport  string   // expected preferredTransport in result
		wantRouteMode  string   // expected preferredRouteMode in result
		wantLanguage   string   // expected language in result
	}{
		// ── empty / no-op ──────────────────────────────────────────
		{name: "empty body", body: ``, wantErr: false},
		{name: "empty object", body: `{}`, wantErr: false},

		// ── displayName accept ──────────────────────────────────────
		{name: "displayName length 1", body: `{"displayName":"A"}`, wantErr: false, wantDisplay: "A"},
		{name: "displayName length 60", body: `{"displayName":"` + strings.Repeat("A", 60) + `"}`, wantErr: false, wantDisplay: strings.Repeat("A", 60)},
		{name: "displayName trimmed whitespace", body: `{"displayName":"  Alice  "}`, wantErr: false, wantDisplay: "Alice"},

		// ── displayName reject ──────────────────────────────────────
		{name: "displayName length 0 (empty string)", body: `{"displayName":""}`, wantErr: true, wantFields: []string{"displayName"}},
		{name: "displayName length 61", body: `{"displayName":"` + strings.Repeat("A", 61) + `"}`, wantErr: true, wantFields: []string{"displayName"}},
		// NUL as a unicode escape (valid JSON, invalid content).
		// \u0000 is valid JSON and contains Unicode category Cc (control char NUL).
		{name: "displayName with NUL control char", body: `{"displayName":"Alice\u0000Bob"}`, wantErr: true, wantFields: []string{"displayName"}},
		{name: "displayName all whitespace becomes empty", body: `{"displayName":"   "}`, wantErr: true, wantFields: []string{"displayName"}},

		// ── presetAvatar accept ─────────────────────────────────────
		{name: "presetAvatar 🌿", body: `{"presetAvatar":"🌿"}`, wantErr: false, wantAvatar: "🌿"},
		{name: "presetAvatar 🦊", body: `{"presetAvatar":"🦊"}`, wantErr: false, wantAvatar: "🦊"},
		{name: "presetAvatar 🌊", body: `{"presetAvatar":"🌊"}`, wantErr: false, wantAvatar: "🌊"},
		{name: "presetAvatar 🌙", body: `{"presetAvatar":"🌙"}`, wantErr: false, wantAvatar: "🌙"},
		{name: "presetAvatar 🐝", body: `{"presetAvatar":"🐝"}`, wantErr: false, wantAvatar: "🐝"},
		{name: "presetAvatar 🪴", body: `{"presetAvatar":"🪴"}`, wantErr: false, wantAvatar: "🪴"},

		// ── presetAvatar reject ─────────────────────────────────────
		{name: "presetAvatar not in allow-list", body: `{"presetAvatar":"🐉"}`, wantErr: true, wantFields: []string{"presetAvatar"}},
		{name: "presetAvatar empty string", body: `{"presetAvatar":""}`, wantErr: true, wantFields: []string{"presetAvatar"}},

		// ── unknown field ───────────────────────────────────────────
		{name: "unknown top-level field", body: `{"unknownField":"value"}`, wantErr: true, wantFields: []string{"unknownField"}},
		{name: "email (read-only field) rejected", body: `{"email":"hack@evil.com"}`, wantErr: true, wantFields: []string{"email"}},

		// ── multiple errors aggregate ──────────────────────────────
		{
			name:       "multiple errors aggregate",
			body:       `{"displayName":"` + strings.Repeat("A", 61) + `","presetAvatar":"🐉"}`,
			wantErr:    true,
			wantFields: []string{"displayName", "presetAvatar"},
		},
		{
			name:       "unknown field plus bad displayName both reported",
			body:       `{"displayName":"","unknownField":"x"}`,
			wantErr:    true,
			wantFields: []string{"displayName", "unknownField"},
		},

		// ── preferredTransport accept ──────────────────────────────
		{name: "preferredTransport Transit", body: `{"preferredTransport":"Transit"}`, wantErr: false, wantTransport: "Transit"},
		{name: "preferredTransport Cycle", body: `{"preferredTransport":"Cycle"}`, wantErr: false, wantTransport: "Cycle"},
		{name: "preferredTransport Carpool", body: `{"preferredTransport":"Carpool"}`, wantErr: false, wantTransport: "Carpool"},
		{name: "preferredTransport Walk", body: `{"preferredTransport":"Walk"}`, wantErr: false, wantTransport: "Walk"},

		// ── preferredTransport reject ──────────────────────────────
		{name: "preferredTransport lowercase transit rejected", body: `{"preferredTransport":"transit"}`, wantErr: true, wantFields: []string{"preferredTransport"}},
		{name: "preferredTransport Drive not in allow-list", body: `{"preferredTransport":"Drive"}`, wantErr: true, wantFields: []string{"preferredTransport"}},
		{name: "preferredTransport empty string rejected", body: `{"preferredTransport":""}`, wantErr: true, wantFields: []string{"preferredTransport"}},

		// ── preferredRouteMode accept ──────────────────────────────
		{name: "preferredRouteMode Fastest", body: `{"preferredRouteMode":"Fastest"}`, wantErr: false, wantRouteMode: "Fastest"},
		{name: "preferredRouteMode Greenest", body: `{"preferredRouteMode":"Greenest"}`, wantErr: false, wantRouteMode: "Greenest"},
		{name: "preferredRouteMode Cheapest", body: `{"preferredRouteMode":"Cheapest"}`, wantErr: false, wantRouteMode: "Cheapest"},
		{name: "preferredRouteMode Balanced", body: `{"preferredRouteMode":"Balanced"}`, wantErr: false, wantRouteMode: "Balanced"},

		// ── preferredRouteMode reject ──────────────────────────────
		{name: "preferredRouteMode fast (lowercase) rejected", body: `{"preferredRouteMode":"fast"}`, wantErr: true, wantFields: []string{"preferredRouteMode"}},
		{name: "preferredRouteMode fastest rejected", body: `{"preferredRouteMode":"fastest"}`, wantErr: true, wantFields: []string{"preferredRouteMode"}},
		{name: "preferredRouteMode empty string rejected", body: `{"preferredRouteMode":""}`, wantErr: true, wantFields: []string{"preferredRouteMode"}},

		// ── language accept ────────────────────────────────────────
		{name: "language en", body: `{"language":"en"}`, wantErr: false, wantLanguage: "en"},
		{name: "language ms", body: `{"language":"ms"}`, wantErr: false, wantLanguage: "ms"},
		{name: "language zh", body: `{"language":"zh"}`, wantErr: false, wantLanguage: "zh"},
		{name: "language ta", body: `{"language":"ta"}`, wantErr: false, wantLanguage: "ta"},

		// ── language reject ────────────────────────────────────────
		{name: "language EN uppercase rejected", body: `{"language":"EN"}`, wantErr: true, wantFields: []string{"language"}},
		{name: "language fr not in allow-list", body: `{"language":"fr"}`, wantErr: true, wantFields: []string{"language"}},
		{name: "language empty string rejected", body: `{"language":""}`, wantErr: true, wantFields: []string{"language"}},

		// ── combined all five valid fields ─────────────────────────
		{
			name:          "all five valid fields accepted",
			body:          `{"displayName":"Alice","presetAvatar":"🌿","preferredTransport":"Transit","preferredRouteMode":"Greenest","language":"en"}`,
			wantErr:       false,
			wantDisplay:   "Alice",
			wantAvatar:    "🌿",
			wantTransport: "Transit",
			wantRouteMode: "Greenest",
			wantLanguage:  "en",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			patch, err := validate.ValidateUserPatch([]byte(tc.body))
			if tc.wantErr {
				if err == nil {
					t.Fatalf("want error, got nil (patch=%+v)", patch)
				}
				ve, ok := err.(*validate.ValidationError)
				if !ok {
					t.Fatalf("want *validate.ValidationError, got %T: %v", err, err)
				}
				for _, wf := range tc.wantFields {
					found := false
					for _, fe := range ve.Errors {
						if fe.Field == wf {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("expected field %q in errors, got %+v", wf, ve.Errors)
					}
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tc.wantDisplay != "" {
				if patch.DisplayName == nil || *patch.DisplayName != tc.wantDisplay {
					t.Errorf("DisplayName = %v, want %q", patch.DisplayName, tc.wantDisplay)
				}
			}
			if tc.wantAvatar != "" {
				if patch.PresetAvatar == nil || *patch.PresetAvatar != tc.wantAvatar {
					t.Errorf("PresetAvatar = %v, want %q", patch.PresetAvatar, tc.wantAvatar)
				}
			}
			if tc.wantTransport != "" {
				if patch.PreferredTransport == nil || *patch.PreferredTransport != tc.wantTransport {
					t.Errorf("PreferredTransport = %v, want %q", patch.PreferredTransport, tc.wantTransport)
				}
			}
			if tc.wantRouteMode != "" {
				if patch.PreferredRouteMode == nil || *patch.PreferredRouteMode != tc.wantRouteMode {
					t.Errorf("PreferredRouteMode = %v, want %q", patch.PreferredRouteMode, tc.wantRouteMode)
				}
			}
			if tc.wantLanguage != "" {
				if patch.Language == nil || *patch.Language != tc.wantLanguage {
					t.Errorf("Language = %v, want %q", patch.Language, tc.wantLanguage)
				}
			}
		})
	}
}

// TestValidateUserPatch_JSONError ensures that malformed JSON is rejected.
func TestValidateUserPatch_JSONError(t *testing.T) {
	_, err := validate.ValidateUserPatch([]byte(`{not valid json`))
	if err == nil {
		t.Fatal("want error on malformed JSON, got nil")
	}
}

// TestValidateUserPatch_ResultIsSerializable checks that ValidatedPatch can be
// marshalled back to JSON cleanly (no omitted fields for absent keys).
func TestValidateUserPatch_ResultIsSerializable(t *testing.T) {
	patch, err := validate.ValidateUserPatch([]byte(`{"displayName":"Alice"}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	b, err := json.Marshal(patch)
	if err != nil {
		t.Fatalf("marshal err: %v", err)
	}
	if len(b) == 0 {
		t.Fatal("empty marshal output")
	}
}
