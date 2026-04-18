# api-spec.md

Base: http://localhost:8080/api/v1

Response format:
```json
{"success": bool, "data": {}, "error": null, "metadata": {"timestamp": "ISO8601", "version": "v1"}}
```

## POST /routes/calculate
Request: `{origin: {lat, lng}, destination: {lat, lng}, mode: "fast"|"ecoboost"|"flowing"|"smart"}`
Response 200: `{routeId, mode, totalDistance, totalDuration, carbonEstimate, greenPointsEstimate, steps: [{type, distance, duration, carbonPerKm, totalCarbon}]}`

## POST /bookings/create
Request: `{userId, routeId}`
Response 201: `{bookingId, qrCode, bookingReference, estimatedPoints, expiresAt}`

## POST /bookings/{id}/pay
Request: `{paymentMethod: "duitnow_qr"}`
Response 200: `{bookingId, paymentStatus, amount, currency, transactionId}`

## POST /bookings/{id}/verify
Request: `{verificationCode}`
Response 200: `{bookingId, status, actualPoints, carbonSaved}`

## GET /user/{userId}/green-points
Response 200: `{userId, currentBalance, totalEarned, totalRedeemed, redeemableOptions: []}`

## GET /user/{userId}/bookings?limit=10&offset=0&status=completed
Response 200: `{bookings: [], pagination: {total, limit, offset}}`

## GET /bookings/{id}
Response 200: `{bookingId, userId, status, totalDistance, actualPoints, carbonSaved}`

## POST /bookings/{id}/cancel
Response 200: `{bookingId, status, refundAmount}`

## POST /auth/register
Request: `{email, phone, password}`
Response 201: `{userId, token, createdAt}`

## POST /auth/login
Request: `{email, password}`
Response 200: `{userId, token, expiresIn}`

Status codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 409 Conflict, 500 Error
