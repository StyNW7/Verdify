# Developer Cloud Setup (GCP + Firebase + Vertex)

This guide is for local/backend developers to set up the cloud side for Verdify.

## 0) Prerequisites

- Google account with access to billing
- `gcloud` CLI installed
- Firebase CLI installed (`npm i -g firebase-tools`)
- Go 1.21+

Optional but recommended:

- Postman
- VS Code + Go extension

## 1) Create or Select the GCP Project

Use one project for Vertex + Firebase + Firestore.

1. Open Google Cloud Console
2. Create project, example: `verdify-dev`
3. Enable billing for project
4. Note the project ID (example: `verdify-dev-123456`)

CLI (optional):

```bash
gcloud config set project YOUR_PROJECT_ID
```

## 2) Attach Firebase to the Project

1. Open Firebase Console
2. "Add project" → select the same GCP project
3. Finish Firebase initialization

## 3) Enable Required APIs (GCP)

Enable these APIs in Cloud Console > APIs & Services:

- Vertex AI API
- Firestore API
- Identity Toolkit API (Firebase Auth)
- Cloud Resource Manager API
- IAM Service Account Credentials API
- (Later for production routing) Routes API / Directions API / Distance Matrix API

CLI (optional):

```bash
gcloud services enable aiplatform.googleapis.com firestore.googleapis.com identitytoolkit.googleapis.com cloudresourcemanager.googleapis.com iamcredentials.googleapis.com
```

## 4) Firestore Setup

1. Firebase Console → Firestore Database → Create Database
2. Mode: **Native**
3. Region: pick a close region (prefer `asia-southeast1` for SEA)

Create collections (minimal):

- `users`
- `routes`
- `bookings`
- `trips`
- `carbon-data`

Suggested document IDs:

- users: Firebase UID
- routes: `route_<uuid>`
- bookings: `booking_<uuid>`
- trips: `trip_<uuid>`

## 5) Firebase Auth Setup

1. Firebase Console → Authentication → Get Started
2. Sign-in method → enable **Email/Password**

For backend architecture:

- Frontend authenticates with Firebase SDK
- Frontend sends Bearer ID token to backend
- Backend verifies token with Firebase Admin SDK

## 6) Service Account for Backend

1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Save JSON as:

`backend/firebase-credentials.json`

This file is gitignored already.

## 7) Vertex AI + Gemini Setup

Vertex must be enabled in same project.

IAM roles for your dev identity/service account:

- `Vertex AI User` (or `Vertex AI Admin` for initial setup)
- `Service Account Token Creator` (if using impersonation)

For local dev, Genkit in this repo uses Vertex plugin when these env vars exist.

## 8) Configure Local Environment

In `backend/.env`:

```env
PORT=8080
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

GOOGLE_MAPS_API_KEY=YOUR_MAPS_KEY

VERTEX_PROJECT_ID=YOUR_PROJECT_ID
VERTEX_LOCATION=us-central1
GEMINI_MODEL=gemini-2.0-flash
```

Notes:

- `GEMINI_MODEL` is normalized in code to `vertexai/<model>` if needed.
- If `VERTEX_PROJECT_ID` is missing, backend runs fallback ranker mode.

## 9) Verify Credentials Locally

Option A: key file path (current code path)

- Ensure `backend/firebase-credentials.json` exists
- Ensure `.env` points to it

Option B: ADC (future-friendly)

```bash
gcloud auth application-default login
```

## 10) Run Backend

```bash
cd backend
go mod tidy
go test ./...
go run .
```

Health:

```bash
curl http://localhost:8080/health
```

If Vertex is configured correctly, startup log should not show Genkit fallback warning.

## 11) Quick API Smoke Test

1. Register

```http
POST /api/v1/auth/register
{
  "email": "dev@verdify.local",
  "phone": "+60123456789",
  "password": "pass123"
}
```

2. Route calculate

```http
POST /api/v1/routes/calculate
{
  "origin": {"latitude": 1.4854, "longitude": 103.7618},
  "destination": {"latitude": 1.3521, "longitude": 103.8198},
  "mode": "smart"
}
```

3. Create booking

```http
POST /api/v1/bookings/create
{
  "userId": "<userId>",
  "routeId": "<routeId>"
}
```

## 12) Firestore Security Rules (Recommended Baseline)

If backend is the only writer/reader via Admin SDK:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Admin SDK bypasses rules; rules mainly protect direct client access.

## 13) Common Problems

1. `genkit ping failed` at startup
   - Check `VERTEX_PROJECT_ID`
   - Ensure Vertex API enabled
   - Ensure IAM role includes Vertex usage

2. Firebase init fails
   - Verify `FIREBASE_CREDENTIALS_PATH`
   - Verify JSON key belongs to the same project

3. Firestore permission denied
   - Ensure service account has Firestore permissions

4. Maps errors
   - Ensure `GOOGLE_MAPS_API_KEY` is valid
   - Ensure Routes/Directions APIs enabled

## 14) What Is Mock vs Real Right Now

Current code:

- Auth endpoints: mock credential storage in-memory
- Firestore: not wired yet (in-memory store)
- Maps: simulated candidates
- Gemini ranker: real through Genkit+Vertex when configured

Next integration milestones:

1. Replace `db/store.go` with Firestore repository implementation
2. Replace `services/maps.go` simulated routes with real Maps API client
3. Swap mock auth endpoints to Firebase token verification flow

## 15) Team Checklist

- [ ] GCP project created and billed
- [ ] Firebase attached
- [ ] Firestore (native) created
- [ ] Auth Email/Password enabled
- [ ] Vertex API enabled
- [ ] Service account key downloaded locally
- [ ] `.env` configured
- [ ] `go test ./...` passes
- [ ] `go run .` works
- [ ] `/health` responds
