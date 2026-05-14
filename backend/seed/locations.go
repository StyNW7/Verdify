package seed

import "github.com/verdify/backend/models"

// Place is one named Malaysian (or border) endpoint usable as a booking
// origin or destination. Coordinates are approximate; precision below
// ~0.001 degrees doesn't matter for synthetic seed data.
type Place struct {
	Name string
	City string
	Loc  models.Location
}

// Places is the curated catalogue the booking generator draws from. Spans
// Klang Valley, Johor / RTS, Penang, Melaka, Putrajaya, and Kota Kinabalu.
var Places = []Place{
	{Name: "KLCC", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1579, Longitude: 101.7116, Address: "KLCC, Kuala Lumpur"}},
	{Name: "KL Sentral", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1338, Longitude: 101.6869, Address: "KL Sentral, Kuala Lumpur"}},
	{Name: "Bukit Bintang", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1466, Longitude: 101.7104, Address: "Bukit Bintang, Kuala Lumpur"}},
	{Name: "Mid Valley", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1180, Longitude: 101.6770, Address: "Mid Valley Megamall, Kuala Lumpur"}},
	{Name: "KLIA", City: "Sepang", Loc: models.Location{Latitude: 2.7456, Longitude: 101.7099, Address: "KLIA, Sepang"}},
	{Name: "KLIA2", City: "Sepang", Loc: models.Location{Latitude: 2.7378, Longitude: 101.6996, Address: "KLIA2, Sepang"}},
	{Name: "Subang", City: "Subang Jaya", Loc: models.Location{Latitude: 3.0738, Longitude: 101.5183, Address: "Subang Jaya"}},
	{Name: "Putrajaya Sentral", City: "Putrajaya", Loc: models.Location{Latitude: 2.9450, Longitude: 101.6712, Address: "Putrajaya Sentral"}},
	{Name: "CIQ Johor", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4628, Longitude: 103.7686, Address: "Sultan Iskandar CIQ, Johor Bahru"}},
	{Name: "Bukit Indah", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4877, Longitude: 103.6691, Address: "Bukit Indah, Johor Bahru"}},
	{Name: "Larkin", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4910, Longitude: 103.7411, Address: "Larkin Sentral, Johor Bahru"}},
	{Name: "Senai", City: "Senai", Loc: models.Location{Latitude: 1.6406, Longitude: 103.6700, Address: "Senai International Airport"}},
	{Name: "RTS Woodlands", City: "Singapore Border", Loc: models.Location{Latitude: 1.4490, Longitude: 103.7707, Address: "RTS Woodlands North"}},
	{Name: "KOMTAR", City: "Penang", Loc: models.Location{Latitude: 5.4143, Longitude: 100.3296, Address: "KOMTAR, Georgetown"}},
	{Name: "Penang Hill", City: "Penang", Loc: models.Location{Latitude: 5.4239, Longitude: 100.2734, Address: "Penang Hill"}},
	{Name: "Melaka Sentral", City: "Melaka", Loc: models.Location{Latitude: 2.2114, Longitude: 102.2530, Address: "Melaka Sentral"}},
	{Name: "Kota Kinabalu", City: "Kota Kinabalu", Loc: models.Location{Latitude: 5.9804, Longitude: 116.0735, Address: "Kota Kinabalu City Centre"}},
}

// PlacesByCity returns the subset of Places whose City matches city. Used by
// the generator to bias a persona's bookings toward their home base.
func PlacesByCity(city string) []Place {
	out := make([]Place, 0, 4)
	for _, p := range Places {
		if p.City == city {
			out = append(out, p)
		}
	}
	return out
}
