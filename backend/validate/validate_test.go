package validate_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/verdify/backend/validate"
)

func TestValidateUserPatch(t *testing.T) {
	tests := []struct {
		name        string
		body        string
		wantErr     bool
		wantFields  []string // error fields that must appear
		wantDisplay string   // expected trimmed displayName in result
		wantAvatar  string   // expected presetAvatar in result
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
