# Verdify Backend

## Overview

Verdify is a multi-modal green transportation routing and booking platform for Malaysia. This is the **backend** service built with **Go** and **Genkit Framework**, providing intelligent routing that balances speed, environmental impact, and congestion mitigation.

**Status**: MVP Development (4-day sprint)
**Target Region**: Johor-Singapore
**Demo Date**: [To be filled]

---

## Key Features

✅ **Multi-Modal Routing** - Combines EV taxis, LRT, MRT, buses, and walking
✅ **4 Smart Modes**:
  - **Fast Mode**: Shortest travel time
  - **EcoBoost Mode**: Lowest carbon footprint with green points multiplier
  - **Flowing Mode**: Avoids congestion to reduce gridlock
  - **Smart Mode**: Context-aware (peak hours → Flowing, else → EcoBoost)

✅ **Green Points System** - Multiplier-based rewards for sustainable travel
✅ **Booking & Payment** - Complete trip booking with QR verification
✅ **Real-Time Congestion** - Google Maps integration for live traffic data
✅ **Gemini RAG** - AI-powered carbon data extraction and route optimization

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Go 1.21+ |
| Framework | Genkit (Google Cloud) |
| Database | Firestore |
| Routing/Maps | Google Maps API |
| AI/LLM | Gemini with RAG |
| Auth | Firebase Auth (mock for MVP) |
| Payment | DuitNow QR (mock for MVP) |
| Testing | Go testing + Postman |

---

## Quick Start

### Prerequisites
- Go 1.21+
- Firebase Project
- Google Cloud Project with Maps & Gemini APIs
- Genkit CLI
- Postman (for testing)

### Setup

1. **Clone and navigate to backend**
   ```bash
   cd backend
   ```

2. **Follow setup guide**
   ```bash
   # See docs/setup-guide.md for detailed instructions
   ```

3. **Initialize project**
   ```bash
   go mod init github.com/verdify/backend
   go get ./...
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and Firebase credentials
   ```

5. **Run server**
   ```bash
   go run main.go
   ```

6. **Test with Postman**
   ```bash
   # Import postman_collection.json
   # Or use health check:
   curl http://localhost:8080/health
   ```

---

## Project Structure

```
backend/
├── main.go                 # Entry point
├── config/                 # Configuration management
├── handlers/               # HTTP request handlers
├── services/               # Business logic
├── models/                 # Data structures
├── db/                     # Database initialization
├── utils/                  # Helper functions
├── tests/                  # Unit & integration tests
├── docs/
│   ├── architecture.md     # System design overview
│   ├── priorities.md       # Implementation roadmap
│   ├── decisions.md        # Technical decision log
│   ├── api-spec.md        # Complete API specification
│   ├── current-state.md    # Status report & issues
│   └── setup-guide.md      # Step-by-step setup
├── .env.example            # Environment template
├── go.mod                  # Go module definition
└── go.sum                  # Dependency lock file
```

---

## API Endpoints (MVP)

See `/docs/api-spec.md` for complete specification.

### Core Endpoints
```
POST   /api/v1/routes/calculate           # Calculate best route
POST   /api/v1/bookings/create            # Create booking
POST   /api/v1/bookings/{id}/pay          # Process payment
POST   /api/v1/bookings/{id}/verify       # Award green points
GET    /api/v1/user/{userId}/green-points # Get points balance
GET    /api/v1/user/{userId}/bookings     # Get booking history
POST   /api/v1/auth/register              # Create user
POST   /api/v1/auth/login                 # Authenticate user
GET    /health                             # Health check
```

---

## Implementation Priorities

### P0 - Critical (Demo Must-Have)
- [ ] Project setup & Firebase initialization
- [ ] Basic route calculation endpoint
- [ ] Mode-specific routing logic
- [ ] User endpoints
- [ ] Booking endpoints with QR generation

### P1 - High (Core MVP)
- [ ] Gemini RAG integration for carbon data
- [ ] Green points calculation engine
- [ ] Trip verification system
- [ ] Booking history management
- [ ] Mock payment integration

### P2 - Medium (Polish)
- [ ] Error handling & validation
- [ ] Response formatting consistency
- [ ] Carbon data management
- [ ] User profile features
- [ ] Analytics endpoints

### P3 - Low (Future)
- [ ] Real transport integration
- [ ] Real payment processing
- [ ] ML-based recommendations
- [ ] Partner merchant integration
- [ ] Multi-city expansion

See `/docs/priorities.md` for detailed breakdown.

---

## Architecture Overview

```
User Request
    ↓
HTTP Handler
    ↓
Validation
    ↓
Business Logic Service
    ├→ Google Maps API (routing/congestion)
    ├→ Gemini RAG (carbon data)
    ├→ Firestore (data storage)
    └→ Mode Optimizer (Fast/Eco/Flowing/Smart)
    ↓
Response Formatter
    ↓
JSON Response to Frontend
```

See `/docs/architecture.md` for detailed system design.

---

## Key Services

### Route Service
- Fetches multi-modal routes from Google Maps
- Enriches with carbon data via Gemini RAG
- Applies mode-specific optimization (Fast/EcoBoost/Flowing/Smart)
- Calculates green points estimate

### Booking Service
- Creates booking records in Firestore
- Generates QR codes for verification
- Tracks booking lifecycle (pending → completed)
- Handles cancellations and refunds

### Green Points Service
- Calculates points using multiplier formula: `Points = Distance * (BaselineCO2 / ActualCO2) * 1.5`
- Estimates points before booking
- Awards actual points after trip verification
- Manages user point wallet

### Gemini RAG Service
- Extracts carbon emission data for transport types
- Updates carbon data weekly
- Provides route optimization recommendations
- Falls back to hardcoded values if API fails

---

## Data Models

### Route
```json
{
  "routeId": "route_abc123",
  "origin": {"latitude": 1.4854, "longitude": 103.7618},
  "destination": {"latitude": 1.3521, "longitude": 103.8198},
  "mode": "smart",
  "totalDistance": 42.5,
  "totalDuration": 65,
  "carbonEstimate": 1275,
  "greenPointsEstimate": 127,
  "steps": [...]
}
```

### Booking
```json
{
  "bookingId": "booking_def456",
  "userId": "user_123",
  "status": "completed",
  "qrCode": "VERDIFY_booking_def456_...",
  "estimatedPoints": 127,
  "actualPoints": 127,
  "carbonSaved": 405
}
```

See `/docs/architecture.md` for complete data models.

---

## Database Schema

Firestore collections:
```
/users/{userId}
/bookings/{bookingId}
/routes/{routeId}
/carbon-data/{transportType}
/trips/{tripId}
```

---

## Testing

### Unit Tests
```bash
go test ./services
go test ./utils
```

### Integration Tests
```bash
# Use Postman collection: postman_collection.json
# Or manual curl commands
curl -X POST http://localhost:8080/api/v1/routes/calculate \
  -H "Content-Type: application/json" \
  -d '{"origin":{"latitude":1.4854,"longitude":103.7618},...}'
```

---

## Environment Variables

Create `.env` file (see `.env.example`):
```env
PORT=8080
ENV=development
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
GOOGLE_MAPS_API_KEY=your-google-maps-key
GEMINI_API_KEY=your-gemini-key
LOG_LEVEL=debug
```

---

## Deployment

### Local Development
```bash
go run main.go
```

### Build Binary
```bash
go build -o verdify-backend
./verdify-backend
```

### Docker (Future)
```bash
docker build -t verdify-backend .
docker run -p 8080:8080 verdify-backend
```

### Cloud Deployment (Future)
- Firebase Cloud Functions
- Google Cloud Run
- App Engine

---

## Common Issues & Troubleshooting

| Issue | Solution |
|-------|----------|
| Firebase connection fails | Check credentials path and project ID in `.env` |
| Google Maps API errors | Verify API key and enable Maps API in Cloud Console |
| Port 8080 already in use | Change PORT in `.env` or kill process: `lsof -ti :8080 \| xargs kill -9` |
| Missing dependencies | Run `go get ./...` |

See `/docs/current-state.md` for known issues and blockers.

---

## Documentation

| Document | Purpose |
|----------|---------|
| `/docs/architecture.md` | System design, components, data models |
| `/docs/priorities.md` | Implementation roadmap by priority |
| `/docs/decisions.md` | Technical decision log with rationale |
| `/docs/api-spec.md` | Complete REST API specification |
| `/docs/setup-guide.md` | Step-by-step setup instructions |
| `/docs/current-state.md` | Status report, issues, progress tracking |

---

## Team Communication

- **Backend**: Handles Go implementation, APIs, database
- **Frontend**: Handles React/Vite UI, consumes backend APIs
- **Sync Point**: Frontend consumes API spec from `/docs/api-spec.md`

---

## Performance Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Route calculation | < 2s | [To measure] |
| Booking creation | < 1s | [To measure] |
| Point verification | < 500ms | [To measure] |

---

## Demo Checklist

Before demo, verify:
- [ ] All P0 endpoints working
- [ ] Data flowing through complete lifecycle
- [ ] Green points visible in responses
- [ ] QR code generation working
- [ ] Firestore storing and retrieving data
- [ ] Postman collection complete
- [ ] No runtime errors
- [ ] Gemini integration working (with fallback)
- [ ] Frontend can consume endpoints
- [ ] Documentation complete

---

## Future Enhancements

1. Real EV taxi and public transport integration
2. Actual DuitNow payment processing
3. Machine learning for personalized routes
4. Multi-city expansion
5. Advanced caching (Redis)
6. Analytics dashboard
7. SMS/Push notifications
8. Premium "Luxury Mode"

---

## References

- **Genkit**: https://github.com/firebase/genkit
- **Google Maps API**: https://developers.google.com/maps
- **Gemini API**: https://ai.google.dev
- **Firebase**: https://firebase.google.com
- **Go Documentation**: https://golang.org/doc

---

## Support

For issues or questions:
1. Check `/docs/current-state.md` for known issues
2. Review `/docs/setup-guide.md` for setup help
3. Check GitHub issues: https://github.com/anomalyco/opencode

---

## License

[To be determined]

---

**Last Updated**: [Today's date]
**Backend Lead**: [Your name]
**Demo Date**: [4 days from start]
