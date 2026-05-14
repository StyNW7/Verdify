package seed

// Persona is one Malaysian-flavoured demo account that the seeder provisions
// in Firebase Auth + Firestore. Email/password are shared across personas so
// the demo can sign in as any of them; never re-use this dataset against a
// production project.
type Persona struct {
	Name     string
	Email    string
	BaseCity string
}

// SharedPassword is the password set on every seeded persona's Firebase Auth
// account. Documented in ADR-0001; intentionally weak because this dataset
// only ever targets a dev/demo Firebase project.
const SharedPassword = "Verdify123!"

// Personas is the canonical 10-persona demo set. Order is stable; the seeder
// and the booking generator both depend on it being deterministic.
var Personas = []Persona{
	{Name: "Aisyah Rahman", Email: "aisyah@verdify.demo", BaseCity: "Kuala Lumpur"},
	{Name: "Daniel Tan", Email: "daniel@verdify.demo", BaseCity: "Johor Bahru"},
	{Name: "Mei Lin Wong", Email: "meilin@verdify.demo", BaseCity: "Penang"},
	{Name: "Arjun Subramaniam", Email: "arjun@verdify.demo", BaseCity: "Kuala Lumpur"},
	{Name: "Nurul Hidayah", Email: "nurul@verdify.demo", BaseCity: "Putrajaya"},
	{Name: "Hafiz Ismail", Email: "hafiz@verdify.demo", BaseCity: "Johor Bahru"},
	{Name: "Priya Devi", Email: "priya@verdify.demo", BaseCity: "Kuala Lumpur"},
	{Name: "Marcus Lim", Email: "marcus@verdify.demo", BaseCity: "Singapore Border"},
	{Name: "Siti Nadia", Email: "siti@verdify.demo", BaseCity: "Melaka"},
	{Name: "Rajesh Kumar", Email: "rajesh@verdify.demo", BaseCity: "Kota Kinabalu"},
}
