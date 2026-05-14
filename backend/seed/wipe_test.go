package seed

import (
	"errors"
	"strings"
	"testing"
)

func TestFormatWipeReportSummariseCounts(t *testing.T) {
	results := []WipeResult{
		{Persona: Persona{Email: "a@verdify.demo"}, UID: "uid-a", AuthFound: true, AuthDeleted: true, UserDocDeleted: true, BookingsDeleted: 12},
		{Persona: Persona{Email: "b@verdify.demo"}, AuthFound: false},
		{Persona: Persona{Email: "c@verdify.demo"}, Err: errors.New("boom")},
		{Persona: Persona{Email: "d@verdify.demo"}, UID: "uid-d", AuthFound: true, AuthDeleted: true, UserDocDeleted: false, BookingsDeleted: 3},
	}

	out := FormatWipeReport(results)

	wantContains := []string{
		"WIPE  a@verdify.demo",
		"ABSENT b@verdify.demo",
		"FAIL  c@verdify.demo",
		"WIPE  d@verdify.demo",
		"wipe summary: wiped=2 absent=1 failed=1 bookings=15",
	}
	for _, want := range wantContains {
		if !strings.Contains(out, want) {
			t.Errorf("FormatWipeReport output missing %q\nfull output:\n%s", want, out)
		}
	}
}

func TestFormatWipeReportEmpty(t *testing.T) {
	out := FormatWipeReport(nil)
	if !strings.Contains(out, "wipe summary: wiped=0 absent=0 failed=0 bookings=0") {
		t.Errorf("empty wipe report missing zeroed summary; got:\n%s", out)
	}
}
