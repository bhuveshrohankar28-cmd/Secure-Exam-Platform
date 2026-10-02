# Architecture — Secure Online MCQ Examination Platform

## Overview

This platform uses a **3-tier architecture** separating the frontend, backend API, and Firebase services.

```
Student / Admin
       ↓
Next.js Frontend   (UI, forms, calling REST APIs)
       ↓
Express.js REST API   (business logic, auth, security)
       ↓
Firebase Admin SDK    (trusted server-side Firebase access)
       ↓
Cloud Firestore       (database records & audit trail)
JWT Session Engine    (username authentication & account access authorization)
```

---

## Why the Backend is the Gateway & Auth Authority

### The Problem with Direct Frontend Firebase Access

1. **Roles and Exam Permissions cannot be trusted in the browser** — examination access must be strictly verified and approved on the server.
2. **Business logic bleeds into the client** — test scoring, access control, and audit logging require server-side enforcement.
3. **No client-side credentials or secrets** — removing Firebase Auth from the frontend eliminates configuration friction and potential key exposure.

### The Solution

The backend is the **sole authority**:
- Anyone can create an account with a username and full name.
- New accounts can sign in immediately; no organization membership or approval is required.
- Administrators can disable an account when necessary, and test access is still managed separately.
- The backend issues a signed JWT session token after successful login.

The backend:
- Verifies every token using signed JWT verification (`authMiddleware`)
- Checks whether account access has been disabled
- Enforces role access (`student` vs `admin`) and test permissions

---

## Frontend Architecture

```
app/
├── login/          — Public: login page
├── register/       — Public: registration page
├── student/        — Protected: student area
│   ├── dashboard/
│   ├── tests/
│   ├── tests/[id]/ — Individual test
│   └── results/
└── admin/          — Protected: admin area
    ├── dashboard/
    ├── users/
    ├── tests/
    ├── attempts/
    └── reports/
```

The frontend uses a centralized API client (`lib/api/client.ts`) which:
- Automatically attaches the session JWT to every request
- Standardizes error handling
- Provides typed responses

---

## Backend Architecture

```
server.ts       — Entry point (starts listening)
src/
├── app.ts      — Express setup: middleware, routes, error handlers
├── firebase/   — Firebase Admin SDK initialization
├── routes/     — Route definitions (thin — only wires URLs to controllers)
├── controllers/— HTTP layer (parse request, call service, send response)
├── services/   — Business logic (the actual work happens here)
├── middleware/ — Auth verification, role-based access control
├── validators/ — Zod schemas for validating request bodies
├── types/      — TypeScript interfaces for all data models
└── utils/      — Shared utilities
```

**Rule:** Controllers must be thin. All business logic belongs in services.

---

## Security Architecture

| Layer            | Mechanism                                |
|------------------|------------------------------------------|
| Transport        | HTTPS (in production)                    |
| HTTP headers     | Helmet                                   |
| CORS             | Allowlist via `FRONTEND_URL` env var     |
| Authentication   | Signed JWT verification                  |
| Authorization    | Role-based (student / admin / superadmin)|
| Input validation | Zod schemas in `/validators`             |
| Secrets          | Environment variables only, never committed |
| Rate limiting    | To be added in Phase 12                  |
| Audit logging    | To be added in Phase 11                  |

---

## Online/Offline Detection Architecture

```
Student Dashboard
       ↓ (every ~30s)
POST /api/users/heartbeat
       ↓
Backend updates users/{userId}.lastSeen
       ↓
Admin dashboard reads lastSeen
       ↓
If (now - lastSeen) < threshold → ONLINE
Otherwise → OFFLINE
```

This is more reliable than tracking WebSocket connections because it survives page refreshes and network hiccups.

---

## Exam Flow Architecture

```
Student logs in
       ↓
Admin grants test access (testAccess record created)
       ↓
Student opens dashboard → sees available tests
       ↓
Student opens test → sees instructions
       ↓
Student starts test → attempt record created in testAttempts
       ↓
Student answers questions → answers saved to answers collection
       ↓
Student submits → attempt marked submitted, grading triggered
       ↓
Student sees result
```

---

## Anti-Cheating Architecture (Planned — Phase 10)

The platform provides **browser-based examination integrity monitoring and violation detection**.

> **Important Disclaimer:** Browser-based monitoring cannot prevent screenshots, screen recording, external device usage, or AI tools running in separate applications. It detects and logs browser-level events only.

Events to be detected:
- Tab switching / window blur
- Visibility change (switching apps)
- Fullscreen exit
- Copy/paste attempts
- Right-click context menu
- Restricted keyboard shortcuts

All violations are logged to the `violations` Firestore collection linked to the attempt.
