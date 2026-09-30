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
Cloud Firestore       (database)
Firebase Auth         (authentication)
```

---

## Why the Backend is the Gateway to Firebase

### The Problem with Direct Frontend Firebase Access

Firebase provides a client SDK that can be used directly from Next.js. However, this approach has serious security problems for an examination platform:

1. **Firestore Security Rules are difficult to maintain** — all access logic ends up in a rule language that is hard to test and debug
2. **Roles cannot be trusted** — a student could modify their role field if they had direct write access
3. **Business logic bleeds into the client** — test scoring, access control, and audit logging require server-side logic
4. **Firebase tokens contain only basic identity** — custom claims (roles) must be set server-side

### The Solution

The backend is the **only component** that communicates with Firestore using the Firebase Admin SDK with full elevated privileges.

The frontend:
- Uses Firebase Authentication **only for the login UI and obtaining a token**
- Sends the token to the backend with every API request
- Never writes to Firestore directly

The backend:
- Verifies every token using `admin.auth().verifyIdToken(token)`
- Reads the user's role from Firestore (or custom claims)
- Enforces all business rules before touching Firestore

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
- Automatically attaches the Firebase ID token to every request
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
| Authentication   | Firebase ID token verification           |
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
