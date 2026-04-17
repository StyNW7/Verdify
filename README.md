# Verdify - Your Personal Green Navigator

**Verdify** is a multi-modal green transportation routing and booking platform for Malaysia, designed to solve the nation's congestion problem and support the goal of zero emissions by 2050.

Similar to Google Maps + Gemini + Moovit, Verdify not only helps you plan a route but also allows you to book and pay for multiple transportation options seamlessly.

---

## 🌍 Project Overview

**Vision**: Make green transportation the default choice for Malaysian travelers
**Target Region (MVP)**: Johor-Singapore
**Key Feature**: Intelligent routing that balances speed, environmental impact, and congestion mitigation
**Sponsors**: Google, Malaysian University of Technology

### What Makes Verdify Different

- **4 Smart Routing Modes**:
  - 🏃 **Fast Mode**: Fastest route possible
  - 🌱 **EcoBoost Mode**: Lowest carbon footprint with green points multiplier
  - 🚗 **Flowing Mode**: Solves congestion by avoiding gridlock
  - 🤖 **Smart Mode**: AI-selected mode based on time of day

- **Green Points System**: Earn multiplier-based points for sustainable travel
  - Formula: `Points = Distance * (BaselineCO2 / ActualCO2) * 1.5`
  - Redeem for vouchers, free travels, discounts

- **Integrated Booking**: One-click booking across multiple transport options
  - EV Taxis, LRT, MRT, Buses
  - QR code verification (no need to pay at vehicle)
  - Mock payment via DuitNow QR (production ready)

- **Gemini RAG Integration**: AI-powered carbon data extraction and route optimization

---

## 📁 Project Structure

```
Verdify/
├── backend/                    # Go backend (Genkit + Firebase)
│   ├── docs/                   # Comprehensive documentation
│   ├── handlers/               # HTTP request handlers
│   ├── services/               # Business logic
│   ├── models/                 # Data structures
│   ├── db/                     # Database layer
│   ├── IMPLEMENTATION_PLAN.md  # Start here!
│   └── README.md               # Backend overview
│
├── frontend/                   # React + Vite frontend
│   └── [frontend team handles]
│
└── README.md                   # This file
```

---

## 🔧 Technology Stack

### Backend (Go)
- **Language**: Go 1.21+
- **Framework**: Genkit (Google's AI framework)
- **Database**: Firestore
- **APIs**: Google Maps, Gemini
- **Auth**: Firebase Auth
- **Payment**: DuitNow QR (mock for MVP)

### Frontend (React)
- **Framework**: Vite/React
- **Styling**: Tailwind CSS
- **API Client**: REST API from backend

---

## 🚀 Getting Started

### Backend Developer
1. Read: `/backend/IMPLEMENTATION_PLAN.md` - Complete overview
2. Read: `/backend/docs/setup-guide.md` - Step-by-step setup
3. Reference: `/backend/docs/api-spec.md` - API specification
4. Track: `/backend/docs/priorities.md` - Implementation roadmap

### Frontend Developer
1. Read: `/backend/docs/api-spec.md` - API endpoints you'll consume
2. Follow: `/backend/docs/architecture.md` - Data models and flows
3. Test: Use Postman collection (to be generated) to validate endpoints

---

## 📋 MVP Scope (4-Day Sprint)

### ✅ What's Included
- Multi-modal route calculation (walking, EV taxi, LRT, MRT, bus)
- 4 smart routing modes (Fast, EcoBoost, Flowing, Smart)
- Green points calculation and tracking
- Booking system with QR code verification
- Mock payment integration
- User authentication (mock)
- Real-time congestion detection (Google Maps)
- Gemini RAG for carbon data

### ❌ What's NOT Included (Future)
- Real DuitNow payment processing
- Real EV taxi and public transport booking APIs
- Machine learning recommendations
- Multi-language support
- SMS/push notifications
- Analytics dashboard
- Multi-city support

---

## 🏗️ Architecture Overview

```
Frontend (React)
    ↓
Backend API (Go/Genkit)
    ├→ Route Calculation Service
    │   ├→ Google Maps API
    │   ├→ Gemini RAG (carbon data)
    │   └→ Mode Optimizer
    │
    ├→ Booking Service
    │   ├→ Payment Processing (mock)
    │   └→ QR Code Generation
    │
    ├→ Green Points Service
    │   ├→ Multiplier Calculation
    │   └→ Point Verification
    │
    └→ User Service
        ├→ Authentication
        ├→ Profile Management
        └→ Booking History

Database (Firestore)
    ├→ Users
    ├→ Bookings
    ├→ Routes
    ├→ Carbon Data
    └→ Trips
```

---

## 🔌 Core API Endpoints (MVP)

```
POST   /api/v1/routes/calculate           # Calculate best route
POST   /api/v1/bookings/create            # Create booking
POST   /api/v1/bookings/{id}/pay          # Process payment
POST   /api/v1/bookings/{id}/verify       # Award green points
GET    /api/v1/user/{userId}/green-points # Get points balance
GET    /api/v1/user/{userId}/bookings     # Get booking history
POST   /api/v1/auth/register              # Create user account
POST   /api/v1/auth/login                 # Authenticate user
GET    /health                             # Health check
```

**Complete specification**: `/backend/docs/api-spec.md`

---

## 📊 Implementation Status

**Planning**: ✅ Complete
**Setup Guide**: ✅ Complete
**API Specification**: ✅ Complete
**Architecture Documentation**: ✅ Complete
**Backend Implementation**: 🔄 In Progress
**Frontend Implementation**: 🔄 In Progress
**Integration Testing**: ⏳ Pending
**Demo**: ⏳ Pending

---

## 🎯 Key Features Explained

### 1. Smart Mode Selection
- **Peak Hours** (7-9am, 12-1pm, 5-7pm): → Flowing Mode (reduce congestion)
- **Off-Peak**: → EcoBoost Mode (maximize green points)
- User can override and choose any mode manually

### 2. Green Points Calculation
```
Example: 50km route, baseline CO2 = 200g, actual CO2 = 100g
Points = 50 * (200/100) * 1.5 = 150 points
```
- Show estimate BEFORE booking
- Award actual points AFTER trip verification (scanned QR)

### 3. Multi-Modal Journey
User can combine multiple transport types in one journey:
- Walk to station (5 min)
- LRT ride (40 min)
- Walk to destination (5 min)
- All in one booking with one QR code

### 4. Congestion Solving
- Flowing Mode routes users around congestion
- Real-time data from Google Maps
- Reduces overall city gridlock

### 5. Carbon Footprint
- Baseline: What they would emit with private car
- Actual: What they emit with chosen route
- Multiplier rewards the difference

---

## 🔑 Technical Decisions

**Why Go + Genkit?**
- Fast, efficient, excellent for real-time routing
- Genkit is Google's framework (aligns with sponsorship)
- Seamless Gemini integration

**Why Firestore?**
- Serverless, scales automatically
- Real-time sync capabilities
- Native Firebase integration

**Why Gemini RAG?**
- Extract carbon data from various sources
- Weekly updates sufficient for MVP
- Intelligent route context

**Why Mock Integrations?**
- Real APIs not finalized yet
- Allows parallel frontend development
- Easy to swap with real APIs later

See `/backend/docs/decisions.md` for complete rationale.

---

## 📚 Documentation

| Document | Location | For |
|----------|----------|-----|
| Implementation Plan | `/backend/IMPLEMENTATION_PLAN.md` | Getting started overview |
| Setup Guide | `/backend/docs/setup-guide.md` | Step-by-step environment setup |
| Architecture | `/backend/docs/architecture.md` | System design and data models |
| API Spec | `/backend/docs/api-spec.md` | REST API endpoints and responses |
| Priorities | `/backend/docs/priorities.md` | Implementation roadmap by priority |
| Decisions | `/backend/docs/decisions.md` | Technical decisions and rationale |
| Current State | `/backend/docs/current-state.md` | Status report and issues |

---

## 🚦 MVP Demo Checklist

Before demo, ensure:
- [ ] All P0 endpoints working
- [ ] Complete booking lifecycle functional
- [ ] Green points visible in responses
- [ ] QR code generation working
- [ ] Data persisting in Firestore
- [ ] Postman collection complete
- [ ] No runtime errors or crashes
- [ ] Gemini integration working (with fallback)
- [ ] Frontend successfully consuming APIs
- [ ] Documentation complete and accurate

---

## 👥 Team

- **Backend Lead**: [Your name]
- **Frontend Developer 1**: [Name]
- **Frontend Developer 2**: [Name]
- **Project Sponsor**: Google, Malaysian University of Technology

---

## 📅 Timeline

- **Day 1**: Setup, basic endpoints, mock data
- **Day 2**: Route calculation, mode logic, booking creation
- **Day 3**: Gemini integration, green points, trip verification
- **Day 4**: Testing, bug fixes, demo preparation

**Current Date**: [Today]
**Demo Date**: [4 days from today]

---

## ❓ Common Questions

**Q: Will this work nationwide from day 1?**
A: No, MVP is Johor-Singapore only. Expansion to other regions is post-demo.

**Q: How accurate are carbon emissions?**
A: MVP uses Gemini-extracted baseline values. Real-time accuracy improves after launch.

**Q: Is payment working?**
A: No, DuitNow is mocked for MVP. Real payment integration comes later.

**Q: Can users really book transport?**
A: Mock APIs for MVP. Real booking integrations come later.

**Q: When will the app launch?**
A: MVP demo is [date]. Production roadmap TBD by sponsors.

---

## 📞 Support & Issues

- **Setup Help**: See `/backend/docs/setup-guide.md`
- **API Questions**: See `/backend/docs/api-spec.md`
- **Architecture**: See `/backend/docs/architecture.md`
- **Report Issue**: Update `/backend/docs/current-state.md`

---

## 🔮 Future Roadmap (Post-MVP)

1. Real payment processing (DuitNow)
2. Real EV taxi integration
3. Real public transport booking APIs
4. Machine learning recommendations
5. Multi-city expansion
6. Premium "Luxury Mode"
7. Analytics dashboard
8. International expansion

---

## 📄 License

[To be determined]

---

## 🙏 Acknowledgments

Sponsored by:
- Google Cloud
- Malaysian University of Technology

---

**Last Updated**: [Today]
**Status**: MVP Sprint - 4 Days to Demo
**Next Update**: [Tomorrow]