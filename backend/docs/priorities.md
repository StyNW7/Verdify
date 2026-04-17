# priorities.md

## P0 - Critical
- [x] Project setup (Go module, Firebase, Genkit)
- [x] POST /routes/calculate (Google Maps → Mode optimizer → Response)
- [x] Modes: Fast (time), EcoBoost (carbon), Flowing (congestion), Smart (peak hours)
- [x] Hardcoded carbon: EV 80, LRT 40, MRT 40, Bus 60 g/km
- [x] POST /bookings/create (Save to Firestore, generate QR)
- [x] GET /user/{userId}/green-points
- [x] Points formula: distance * (baseline / actual) * 1.5

## P1 - Core MVP
- [x] Gemini RAG carbon data
- [x] POST /bookings/{id}/verify (Award points)
- [x] GET /user/{userId}/bookings
- [x] POST /bookings/{id}/pay (Mock)
- [ ] Real-time Google Maps congestion
- [x] Peak hours: 7-9, 12-1, 5-7

## P2 - Polish
- [ ] Error handling
- [ ] Input validation
- [ ] Response consistency
- [ ] Logging
