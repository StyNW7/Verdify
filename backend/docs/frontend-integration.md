# frontend-integration.md

## What changed
- Backend now supports browser requests from frontend using CORS.
- Allowed origin is controlled by `FRONTEND_ORIGIN` (default: `http://localhost:5173`).
- Frontend calls backend APIs for:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/routes/calculate`

## Backend env
Set this in backend `.env`:

```env
PORT=8080
FRONTEND_ORIGIN=http://localhost:5173
```

## Frontend env
Set this in frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Quick run
1. Start backend:
```bash
cd backend
go run .
```
2. Start frontend:
```bash
cd frontend
npm run dev
```
3. Open frontend on `http://localhost:5173` and test login/register/route planner.

## Notes
- Current backend auth/storage is in-memory. Data resets when backend restarts.
