# setup-guide.md

## Prerequisites
go version (1.21+)
genkit (installed)

## 1. .env
```
PORT=8080
FIREBASE_PROJECT_ID=your-id
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
GOOGLE_MAPS_API_KEY=key
GEMINI_API_KEY=key
```

## 2. Go Module Init
```bash
cd backend
go mod init github.com/verdify/backend
go get github.com/firebase/genkit/go
go get firebase.google.com/go/v4
go get google.golang.org/maps
go get github.com/gorilla/mux
go get github.com/joho/godotenv
go get github.com/google/uuid
```

## 3. Folder Structure
```
config/
handlers/
services/
models/
db/
utils/
tests/
```

## 4. Required Stack
- Genkit
- Google Cloud project
- Vertex AI enabled
- Firestore enabled
- Google Maps API enabled

## 5. main.go
```go
package main

import (
	"log"
	"net/http"
	"os"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	router := mux.NewRouter()
	v1 := router.PathPrefix("/api/v1").Subrouter()
	
	// Add handlers here
	
	port := os.Getenv("PORT")
	if port == "" { port = "8080" }
	log.Printf("Starting on port %s", port)
	http.ListenAndServe(":" + port, router)
}
```

## 6. Firebase Setup
Get service account JSON from Firebase Console
Save as firebase-credentials.json (gitignored)
Create Firestore collections: users, bookings, routes, carbon-data, trips

## 7. Test
```bash
go run main.go
curl http://localhost:8080/health
```
