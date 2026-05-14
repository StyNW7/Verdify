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
// Mix of commute hubs (stations, malls, business districts) and tourist
// landmarks (temples, heritage quarters, beaches) so seeded bookings
// reflect both daily commuting and weekend day-trip patterns.
var Places = []Place{
	// Kuala Lumpur / Klang Valley
	{Name: "KLCC", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1579, Longitude: 101.7116, Address: "KLCC, Kuala Lumpur"}},
	{Name: "KL Sentral", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1338, Longitude: 101.6869, Address: "KL Sentral, Kuala Lumpur"}},
	{Name: "Bukit Bintang", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1466, Longitude: 101.7104, Address: "Bukit Bintang, Kuala Lumpur"}},
	{Name: "Mid Valley", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1180, Longitude: 101.6770, Address: "Mid Valley Megamall, Kuala Lumpur"}},
	{Name: "Batu Caves", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.2379, Longitude: 101.6840, Address: "Batu Caves, Selangor"}},
	{Name: "Petaling Street", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1438, Longitude: 101.6986, Address: "Petaling Street, Kuala Lumpur"}},
	{Name: "KL Tower", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1528, Longitude: 101.7039, Address: "Menara KL, Kuala Lumpur"}},
	{Name: "TRX", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1421, Longitude: 101.7203, Address: "Tun Razak Exchange, Kuala Lumpur"}},
	{Name: "Sunway Pyramid", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.0723, Longitude: 101.6071, Address: "Sunway Pyramid, Bandar Sunway"}},
	{Name: "Pavilion KL", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1490, Longitude: 101.7137, Address: "Pavilion Kuala Lumpur, Bukit Bintang"}},
	{Name: "Merdeka 118", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.1418, Longitude: 101.7008, Address: "Merdeka 118, Kuala Lumpur"}},
	{Name: "Sungai Buloh", City: "Kuala Lumpur", Loc: models.Location{Latitude: 3.2071, Longitude: 101.5808, Address: "Sungai Buloh MRT, Selangor"}},
	{Name: "KLIA", City: "Sepang", Loc: models.Location{Latitude: 2.7456, Longitude: 101.7099, Address: "KLIA, Sepang"}},
	{Name: "KLIA2", City: "Sepang", Loc: models.Location{Latitude: 2.7378, Longitude: 101.6996, Address: "KLIA2, Sepang"}},
	{Name: "Subang", City: "Subang Jaya", Loc: models.Location{Latitude: 3.0738, Longitude: 101.5183, Address: "Subang Jaya"}},
	{Name: "Putrajaya Sentral", City: "Putrajaya", Loc: models.Location{Latitude: 2.9450, Longitude: 101.6712, Address: "Putrajaya Sentral"}},
	{Name: "Putrajaya Mosque", City: "Putrajaya", Loc: models.Location{Latitude: 2.9355, Longitude: 101.6918, Address: "Masjid Putra, Putrajaya"}},

	// Johor Bahru
	{Name: "CIQ Johor", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4628, Longitude: 103.7686, Address: "Sultan Iskandar CIQ, Johor Bahru"}},
	{Name: "Bukit Indah", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4877, Longitude: 103.6691, Address: "Bukit Indah, Johor Bahru"}},
	{Name: "Larkin", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4910, Longitude: 103.7411, Address: "Larkin Sentral, Johor Bahru"}},
	{Name: "Senai", City: "Senai", Loc: models.Location{Latitude: 1.6406, Longitude: 103.6700, Address: "Senai International Airport"}},
	{Name: "Legoland", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4271, Longitude: 103.6310, Address: "Legoland Malaysia, Iskandar Puteri"}},
	{Name: "Puteri Harbour", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4148, Longitude: 103.6300, Address: "Puteri Harbour, Iskandar Puteri"}},
	{Name: "Danga Bay", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4753, Longitude: 103.7236, Address: "Danga Bay, Johor Bahru"}},
	{Name: "JB City Square", City: "Johor Bahru", Loc: models.Location{Latitude: 1.4628, Longitude: 103.7639, Address: "Johor Bahru City Square"}},
	{Name: "Mount Austin", City: "Johor Bahru", Loc: models.Location{Latitude: 1.5404, Longitude: 103.7902, Address: "Mount Austin, Johor Bahru"}},
	{Name: "RTS Woodlands", City: "Singapore Border", Loc: models.Location{Latitude: 1.4490, Longitude: 103.7707, Address: "RTS Woodlands North"}},

	// Penang
	{Name: "KOMTAR", City: "Penang", Loc: models.Location{Latitude: 5.4143, Longitude: 100.3296, Address: "KOMTAR, Georgetown"}},
	{Name: "Penang Hill", City: "Penang", Loc: models.Location{Latitude: 5.4239, Longitude: 100.2734, Address: "Penang Hill"}},
	{Name: "Gurney Drive", City: "Penang", Loc: models.Location{Latitude: 5.4374, Longitude: 100.3094, Address: "Gurney Drive, Georgetown"}},
	{Name: "Batu Ferringhi", City: "Penang", Loc: models.Location{Latitude: 5.4754, Longitude: 100.2503, Address: "Batu Ferringhi, Penang"}},
	{Name: "Kek Lok Si", City: "Penang", Loc: models.Location{Latitude: 5.3992, Longitude: 100.2750, Address: "Kek Lok Si Temple, Air Itam"}},
	{Name: "Clan Jetties", City: "Penang", Loc: models.Location{Latitude: 5.4147, Longitude: 100.3413, Address: "Clan Jetties of Penang, Georgetown"}},
	{Name: "Penang National Park", City: "Penang", Loc: models.Location{Latitude: 5.4630, Longitude: 100.2003, Address: "Penang National Park, Teluk Bahang"}},

	// Melaka
	{Name: "Melaka Sentral", City: "Melaka", Loc: models.Location{Latitude: 2.2114, Longitude: 102.2530, Address: "Melaka Sentral"}},
	{Name: "A Famosa", City: "Melaka", Loc: models.Location{Latitude: 2.1917, Longitude: 102.2510, Address: "A Famosa, Bandar Hilir, Melaka"}},
	{Name: "Jonker Street", City: "Melaka", Loc: models.Location{Latitude: 2.1965, Longitude: 102.2470, Address: "Jonker Street, Melaka"}},
	{Name: "Stadhuys", City: "Melaka", Loc: models.Location{Latitude: 2.1942, Longitude: 102.2491, Address: "Stadthuys, Dutch Square, Melaka"}},
	{Name: "Taming Sari Tower", City: "Melaka", Loc: models.Location{Latitude: 2.1908, Longitude: 102.2516, Address: "Menara Taming Sari, Melaka"}},
	{Name: "Mahkota Parade", City: "Melaka", Loc: models.Location{Latitude: 2.1877, Longitude: 102.2509, Address: "Mahkota Parade, Bandar Hilir, Melaka"}},

	// Kota Kinabalu (Sabah)
	{Name: "Kota Kinabalu", City: "Kota Kinabalu", Loc: models.Location{Latitude: 5.9804, Longitude: 116.0735, Address: "Kota Kinabalu City Centre"}},
	{Name: "KK Waterfront", City: "Kota Kinabalu", Loc: models.Location{Latitude: 5.9840, Longitude: 116.0731, Address: "KK Waterfront Esplanade, Kota Kinabalu"}},
	{Name: "Filipino Market", City: "Kota Kinabalu", Loc: models.Location{Latitude: 5.9849, Longitude: 116.0742, Address: "Filipino Market, Kota Kinabalu"}},
	{Name: "Sabah State Mosque", City: "Kota Kinabalu", Loc: models.Location{Latitude: 5.9621, Longitude: 116.0790, Address: "Masjid Negeri Sabah, Kota Kinabalu"}},
	{Name: "Signal Hill", City: "Kota Kinabalu", Loc: models.Location{Latitude: 5.9839, Longitude: 116.0810, Address: "Signal Hill Observatory, Kota Kinabalu"}},
	{Name: "KK City Mosque", City: "Kota Kinabalu", Loc: models.Location{Latitude: 6.0045, Longitude: 116.1073, Address: "Kota Kinabalu City Mosque, Likas"}},
	{Name: "UMS", City: "Kota Kinabalu", Loc: models.Location{Latitude: 6.0353, Longitude: 116.1198, Address: "Universiti Malaysia Sabah, Kota Kinabalu"}},
	{Name: "Manukan Jetty", City: "Kota Kinabalu", Loc: models.Location{Latitude: 5.9790, Longitude: 116.0696, Address: "Jesselton Point Ferry Terminal, Kota Kinabalu"}},
	{Name: "Kundasang", City: "Kota Kinabalu", Loc: models.Location{Latitude: 6.0039, Longitude: 116.5703, Address: "Kundasang War Memorial, Sabah"}},
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
