# Verdify glossary

Short canonical definitions for terms that show up across the codebase, the
ADRs, and PR descriptions. Add an entry here before introducing a new domain
noun in code.

## Persona

A seeded Verdify account created by `cmd/seed` (see ADR-0001). A persona is
a Malaysian-flavoured demo identity — a name, an `@verdify.demo` email, a
home base city — that the seeder provisions in Firebase Auth (with the
shared demo password) and populates with a `/users/{uid}` document plus
~12 synthetic bookings under `/bookings/{bookingId}`.

A persona is **distinct from a real signup**: real users go through the
normal Firebase Auth sign-in flow and have empty counters until they
complete trips. Personas exist solely so the dashboard, leaderboard, and
booking-history surfaces have realistic data on a fresh project.

The 10 canonical personas live in `backend/seed/personas.go`. They are
re-seedable but never overwritten — see ADR-0001 for the idempotency
contract.
