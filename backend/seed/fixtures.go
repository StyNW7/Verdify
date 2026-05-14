package seed

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"sync"

	"github.com/verdify/backend/models"
)

// fixturesFS embeds every recorded Routes-API fixture (one JSON per
// origin/destination/mode triple) into the binary. This keeps the seed
// program filesystem-free at runtime — the fixtures travel with the binary
// and tests don't have to chase a working directory.
//
//go:embed fixtures/*.json
var fixturesFS embed.FS

// FixtureKey identifies one recorded route. The string form
// "<origin>__<destination>__<mode>" is also the on-disk filename
// (with origin/destination slugified — see slugifyPlaceName).
type FixtureKey struct {
	Origin      string // Place.Name
	Destination string // Place.Name
	Mode        string // "fast" | "eco" | "cheap"
}

func (k FixtureKey) String() string {
	return fmt.Sprintf("%s__%s__%s", slugifyPlaceName(k.Origin), slugifyPlaceName(k.Destination), k.Mode)
}

// PoolByCity defines, for each persona base city, the curated list of
// fixture keys that persona may draw from. The generator picks one
// deterministically per booking; every key listed here MUST have a matching
// fixture file or the seed startup-time coverage check will fail.
//
// Curation goal: each pool covers the persona's local commute patterns plus
// at least one intercity link, and biases toward eco-mode (transit) so the
// dashboard stats are dominated by real transit data.
//
// Curation rule: pairs must be land-routable by the Google Routes API. No
// flight legs across the South China Sea (Peninsular Malaysia ↔ Sabah).
// KLIA-area and KK-area pairs where the Routes API consistently falls back
// to synthetic (Sabah has no indexed transit, KLIA DRIVE responses are
// unreliable from `cmd/seed-fixtures`) are kept here only when the fixture's
// polyline has been hand-encoded to a correct 2-point line — those fixtures
// retain `_stub: true` so the recorder will overwrite them if Google ever
// adds coverage.
//
// Uniqueness rule: GenerateBookingsForPersona samples without replacement
// from a persona's pool, so the pool must be at least as large as the
// maximum desired booking count per persona for the rng draw to be
// satisfiable end-to-end.
var PoolByCity = map[string][]FixtureKey{
	"Kuala Lumpur": {
		{"KLCC", "KL Sentral", "eco"},
		{"KL Sentral", "KLCC", "eco"},
		{"KL Sentral", "Mid Valley", "eco"},
		{"Mid Valley", "Bukit Bintang", "eco"},
		{"Bukit Bintang", "KLCC", "eco"},
		{"KLCC", "Mid Valley", "eco"},
		{"Subang", "KLCC", "eco"},
		{"KL Sentral", "Putrajaya Sentral", "eco"},
		{"KLCC", "Batu Caves", "eco"},
		{"Bukit Bintang", "Petaling Street", "eco"},
		{"Mid Valley", "Sunway Pyramid", "eco"},
		{"Sungai Buloh", "KL Sentral", "eco"},
	},
	"Putrajaya": {
		{"Putrajaya Sentral", "KL Sentral", "eco"},
		{"KL Sentral", "Putrajaya Sentral", "eco"},
		{"Putrajaya Sentral", "KLCC", "eco"},
		{"Putrajaya Sentral", "Putrajaya Mosque", "eco"},
		{"Putrajaya Mosque", "Putrajaya Sentral", "eco"},
	},
	"Johor Bahru": {
		{"Bukit Indah", "CIQ Johor", "eco"},
		{"Larkin", "CIQ Johor", "eco"},
		{"CIQ Johor", "Larkin", "eco"},
		{"Bukit Indah", "Senai", "fast"},
		{"Senai", "Larkin", "eco"},
		{"Larkin", "Bukit Indah", "eco"},
		{"CIQ Johor", "Bukit Indah", "eco"},
		{"JB City Square", "Legoland", "eco"},
		{"Mount Austin", "JB City Square", "eco"},
		{"Danga Bay", "CIQ Johor", "eco"},
		{"Puteri Harbour", "Legoland", "eco"},
	},
	"Singapore Border": {
		{"RTS Woodlands", "Larkin", "eco"},
		{"RTS Woodlands", "CIQ Johor", "eco"},
		{"CIQ Johor", "RTS Woodlands", "eco"},
		{"Larkin", "RTS Woodlands", "eco"},
		{"RTS Woodlands", "JB City Square", "eco"},
		{"JB City Square", "RTS Woodlands", "eco"},
	},
	"Penang": {
		{"KOMTAR", "Penang Hill", "eco"},
		{"Penang Hill", "KOMTAR", "eco"},
		{"KOMTAR", "Penang Hill", "fast"},
		{"KOMTAR", "Gurney Drive", "eco"},
		{"Gurney Drive", "Batu Ferringhi", "eco"},
		{"KOMTAR", "Kek Lok Si", "eco"},
		{"KOMTAR", "Clan Jetties", "eco"},
		{"Batu Ferringhi", "Penang National Park", "fast"},
	},
	"Melaka": {
		{"Melaka Sentral", "KL Sentral", "eco"},
		{"KL Sentral", "Melaka Sentral", "eco"},
		{"Melaka Sentral", "Jonker Street", "eco"},
		{"Jonker Street", "A Famosa", "eco"},
		{"Stadhuys", "Taming Sari Tower", "eco"},
		{"Mahkota Parade", "Melaka Sentral", "eco"},
		{"Melaka Sentral", "Stadhuys", "eco"},
	},
	"Kota Kinabalu": {
		{"Kota Kinabalu", "Kundasang", "fast"},
		{"Kota Kinabalu", "Signal Hill", "eco"},
		{"Filipino Market", "Sabah State Mosque", "eco"},
		{"KK City Mosque", "UMS", "eco"},
		{"UMS", "KK Waterfront", "eco"},
	},
}

// fixtureCache holds the parsed fixtures keyed by FixtureKey.String(). Loaded
// lazily on first access via loadFixtures so package init stays cheap and
// tests can call AssertFixtureCoverage explicitly.
var (
	fixtureMu    sync.RWMutex
	fixtureCache map[string]models.RouteOption
	fixtureErr   error
)

// loadFixtures reads every fixtures/*.json file embedded in the binary and
// returns them keyed by filename-stem. Memoised — subsequent calls reuse the
// cached map without re-parsing.
func loadFixtures() (map[string]models.RouteOption, error) {
	fixtureMu.RLock()
	if fixtureCache != nil || fixtureErr != nil {
		defer fixtureMu.RUnlock()
		return fixtureCache, fixtureErr
	}
	fixtureMu.RUnlock()

	fixtureMu.Lock()
	defer fixtureMu.Unlock()
	if fixtureCache != nil || fixtureErr != nil {
		return fixtureCache, fixtureErr
	}

	out := make(map[string]models.RouteOption)
	entries, err := fs.ReadDir(fixturesFS, "fixtures")
	if err != nil {
		fixtureErr = fmt.Errorf("read fixtures dir: %w", err)
		return nil, fixtureErr
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		raw, err := fs.ReadFile(fixturesFS, "fixtures/"+e.Name())
		if err != nil {
			fixtureErr = fmt.Errorf("read fixture %s: %w", e.Name(), err)
			return nil, fixtureErr
		}
		var opt models.RouteOption
		if err := json.Unmarshal(raw, &opt); err != nil {
			fixtureErr = fmt.Errorf("parse fixture %s: %w", e.Name(), err)
			return nil, fixtureErr
		}
		stem := strings.TrimSuffix(e.Name(), ".json")
		out[stem] = opt
	}
	fixtureCache = out
	return fixtureCache, nil
}

// AssertFixtureCoverage returns an error if any FixtureKey referenced in
// PoolByCity is missing a matching fixture file. Called at the top of
// GenerateBookingsForPersona so a missing fixture is a fail-fast error
// (rather than a silent synthetic fallback at runtime).
func AssertFixtureCoverage() error {
	cache, err := loadFixtures()
	if err != nil {
		return err
	}
	missing := make([]string, 0)
	seen := make(map[string]bool)
	for _, keys := range PoolByCity {
		for _, k := range keys {
			s := k.String()
			if seen[s] {
				continue
			}
			seen[s] = true
			if _, ok := cache[s]; !ok {
				missing = append(missing, s)
			}
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return fmt.Errorf("fixture coverage incomplete: missing %d fixture(s): %s",
			len(missing), strings.Join(missing, ", "))
	}
	return nil
}

// fixtureFor returns the parsed RouteOption for the given key, or false if
// no fixture is loaded for it. Callers that hit !ok should treat it as a
// programmer error — AssertFixtureCoverage exists to surface that early.
func fixtureFor(k FixtureKey) (models.RouteOption, bool) {
	cache, err := loadFixtures()
	if err != nil {
		return models.RouteOption{}, false
	}
	opt, ok := cache[k.String()]
	return opt, ok
}

// slugifyPlaceName converts a Place.Name (which may contain spaces) into a
// filesystem-safe slug. Lowercased so case differences don't produce two
// fixture files for the same place.
func slugifyPlaceName(name string) string {
	out := make([]byte, 0, len(name))
	for i := 0; i < len(name); i++ {
		c := name[i]
		switch {
		case c >= 'A' && c <= 'Z':
			out = append(out, c+('a'-'A'))
		case c >= 'a' && c <= 'z', c >= '0' && c <= '9':
			out = append(out, c)
		case c == ' ' || c == '-':
			out = append(out, '_')
		}
	}
	return string(out)
}
