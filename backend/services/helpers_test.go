package services

import "testing"

func TestNormalizeMode(t *testing.T) {
	cases := []struct{ in, want string }{
		{"fast", "fast"}, {"eco", "eco"}, {"cheap", "cheap"},
		{"FAST", "fast"}, {" eco ", "eco"}, {"", ""},
		{"smart", ""}, {"ecoboost", ""}, {"flowing", ""}, {"random", ""},
	}
	for _, c := range cases {
		if got := NormalizeMode(c.in); got != c.want {
			t.Errorf("NormalizeMode(%q) = %q want %q", c.in, got, c.want)
		}
	}
}
