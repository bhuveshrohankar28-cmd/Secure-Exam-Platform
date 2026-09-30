# 🛡️ Secure Online MCQ Examination Platform

> A modern, secure, mobile-first MCQ examination platform designed for college and university assessments with real-time browser integrity monitoring, administrative test access control, and centralized role-based security.

---

## 📌 Project Overview

The **Secure Online MCQ Examination Platform** is engineered to enable institutions to conduct online examinations safely, reliably, and efficiently. Students can log in from their mobile devices or desktops, receive test access granted by administrators, take timed MCQ examinations, and view their performance records. Administrators retain full control over question banks, examination schedules, batch/domain permissions, and live test monitoring.

> **Current Status:** **Phase 1 Complete (Foundation & Architecture Setup)**.  
> The core architectural skeleton, TypeScript data contracts, Firebase Admin SDK integration layer, Express REST API, Next.js frontend pages, and technical documentation are fully established.

---

## 🏗️ Architecture Overview

The platform uses a decoupled, three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Layer (Mobile / Desktop)             │
│   Next.js 15 (App Router) + React + CSS Design System       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend API Gateway Layer                   │
│   Node.js + Express + TypeScript + Security Middleware      │
│   (Helmet, CORS, Rate-Limiting, Custom Role Guards)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Firebase Admin SDK (Privileged)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Data & Identity Services                    │
│   Google Firebase Authentication & Cloud Firestore          │
└─────────────────────────────────────────────────────────────┘
```

### Why a Dedicated Backend?
1. **Security & Credential Isolation:** Firebase Admin SDK service account credentials reside exclusively in the protected backend environment and are never bundled into client-side code.
2. **Deterministic Grading & Integrity:** Question answer keys (`correctOptionIndex`) and grading calculations never reach the client device before or during the exam.
3. **Privileged Access Control:** Only backend administrators can elevate user roles, issue custom JWT claims, and grant or revoke examination permissions.
4. **Audit Trail Guarantee:** All sensitive security actions (exam start, submission, violation flags) are logged immutably through backend operations.

---

## 🗂️ Complete Directory Structure

```
secure-exam-platform/
├── .gitignore                      # Monorepo-level git ignore rules
├── package.json                    # Root scripts for starting frontend & backend
├── README.md                       # Comprehensive project documentation
├── docs/                           # Architectural & team documentation
│   ├── api.md                      # REST API endpoints & request/response contracts
│   ├── architecture.md             # High-level system & security architecture
│   ├── contribution-guide.md       # Team Git branching, PR, and coding guidelines
│   ├── database.md                 # Cloud Firestore data schemas & indexing
│   ├── development-phases.md       # Implementation timeline (Phases 1 through 12)
│   ├── firebase.md                 # Firebase project setup & security rules guide
│   └── team-modules.md             # Module assignments & responsibilities per team member
│
├── backend/                        # Express + TypeScript REST API Server
│   ├── .env.example                # Backend environment variable template
│   ├── nodemon.json                # Dev auto-reload configuration
│   ├── package.json                # Dependencies & scripts
│   ├── README.md                   # Backend service documentation
│   ├── server.ts                   # HTTP server entrypoint (Port 5000)
│   ├── tsconfig.json               # TypeScript compiler config
│   └── src/
│       ├── app.ts                  # Express application setup, middleware, & routes
│       ├── config/                 # Environment & app configurations
│       ├── controllers/            # Route handler business logic
│       ├── firebase/
│       │   └── firebaseAdmin.ts    # Firebase Admin SDK initialization & exports
│       ├── middleware/
│       │   ├── authMiddleware.ts   # JWT verification & role authorization
│       │   └── errorHandler.ts    # Centralized error handler
│       ├── routes/
│       │   ├── accessRoutes.ts     # Test access permissions endpoints
│       │   ├── attemptRoutes.ts    # Exam submission & progress endpoints
│       │   ├── authRoutes.ts       # Authentication & user profile endpoints
│       │   ├── healthRoutes.ts     # Health check & connectivity diagnostics
│       │   ├── reportRoutes.ts     # Analytics & audit reports endpoints
│       │   ├── testRoutes.ts       # Test & question management endpoints
│       │   └── userRoutes.ts       # Student directory & presence heartbeat
│       ├── services/
│       │   └── userService.ts      # Data access layer for user queries
│       ├── types/
│       │   └── models.ts           # Canonical TypeScript interfaces for Firestore
│       ├── utils/                  # Helper utilities & constants
│       └── validators/             # Zod input validation schemas
│
└── frontend/                       # Next.js 15 App Router Frontend (Mobile-First)
    ├── .env.example                # Frontend environment variable template
    ├── next.config.ts              # Next.js configuration
    ├── package.json                # Dependencies & scripts
    ├── tsconfig.json               # TypeScript frontend config
    ├── app/
    │   ├── globals.css             # Design system tokens, variables & glassmorphism
    │   ├── layout.tsx              # Root HTML wrapper with Google Inter font
    │   ├── page.tsx                # Welcome page & live backend connectivity check
    │   ├── login/
    │   │   └── page.tsx            # Responsive login interface
    │   ├── register/
    │   │   └── page.tsx            # Student registration page
    │   ├── student/
    │   │   ├── dashboard/page.tsx  # Mobile-first student exam dashboard
    │   │   ├── tests/[id]/page.tsx # Mobile test-taking placeholder
    │   │   └── results/page.tsx    # Student exam results placeholder
    │   └── admin/
    │       ├── dashboard/page.tsx  # Admin metric cards & quick actions
    │       ├── users/page.tsx      # Student directory & access management
    │       ├── access/page.tsx     # Domain & batch test access permissions
    │       ├── tests/page.tsx      # Test builder placeholder
    │       ├── attempts/page.tsx   # Live & past examination submissions
    │       └── reports/page.tsx    # Exam performance reports placeholder
    ├── components/                 # Reusable UI components
    ├── hooks/                      # Custom React hooks (auth, countdown, presence)
    ├── lib/
    │   └── api.ts                  # Centralized HTTP fetch client for backend API
    └── types/                      # Frontend shared interfaces
```

---

## 🛠️ Technologies & Dependencies

### Frontend
- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Components + Client interactivity)
- **Language:** TypeScript 5+ (Strict mode)
- **Styling:** Vanilla Modern CSS with Glassmorphism, CSS Custom Properties, and responsive layouts
- **Design Philosophy:** Mobile-First for student examination screens, desktop-optimized for admin management

### Backend
- **Runtime:** [Node.js](https://nodejs.org/) (v18+ or v20+)
- **Framework:** [Express 5](https://expressjs.com/)
- **Language:** TypeScript with `tsc` compilation & `ts-node` / `nodemon` in development
- **Security:** [Helmet](https://helmetjs.github.io/) for HTTP security headers, [CORS](https://github.com/expressjs/cors) for controlled cross-origin requests
- **Database & Auth SDK:** [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) (v14+)
- **Validation:** [Zod](https://zod.dev/) for robust runtime request schema validation

---

## 🚀 Getting Started Locally

### Prerequisites
1. **Node.js** v18.0.0 or higher
2. **npm** v9.0.0 or higher
3. A Google **Firebase** project (for Firestore & Authentication)

---

### 1. Installation

Clone the repository and install dependencies for both services:

```bash
# Clone the repository
git clone <repository-url>
cd secure-exam-platform

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

---

### 2. Environment Configuration

#### Backend Configuration
Copy `.env.example` to `.env` in the `backend/` directory:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your settings:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Firebase Admin Credentials
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-firebase-project-id.iam.gserviceaccount.com
# Use escaped newlines (\n) if pasting on a single line
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

> **Note on Firebase Credentials:** The backend safely starts even if Firebase credentials are not yet configured; mock mode logs will display until live credentials are provided.

#### Frontend Configuration
Copy `.env.example` to `.env.local` in the `frontend/` directory:

```bash
cd ../frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
# URL of your Express API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Firebase Web Config (Safe to expose on client)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

---

### 3. Running the Development Servers

You can run both servers concurrently or in separate terminals.

#### Option A: Running with Root Scripts
From the repository root:

```bash
# Start backend on http://localhost:5000
npm run dev:backend

# In a separate terminal, start frontend on http://localhost:3000
npm run dev:frontend
```

#### Option B: Running Individually
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🔍 Testing the Backend & Frontend Integration

1. Start both backend and frontend as shown above.
2. In your browser, open `http://localhost:3000`.
3. The landing page executes an automated client-side fetch to `http://localhost:5000/api/health`.
4. You will see the live badge:
   ```
   Backend Status: Connected ✅
   ```
5. You can also verify the backend directly using `curl`:
   ```bash
   curl http://localhost:5000/api/health
   ```
   **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Secure Exam Backend is running",
     "timestamp": "2026-10-01T..."
   }
   ```

---

## 👥 Team Module Division

This project is built by a 5-member team. Modules are loosely coupled and communicate through the documented REST API contracts.

| Module | Owner / Focus | Core Files & Areas |
|:-------|:--------------|:-------------------|
| **Module 1** | **Authentication & User Management** | `backend/src/routes/authRoutes.ts`, `backend/src/middleware/authMiddleware.ts`, `frontend/app/login`, `frontend/app/register`, Firebase Auth integration |
| **Module 2** | **Admin Dashboard & Test Access** | `frontend/app/admin/*`, `backend/src/routes/accessRoutes.ts`, access control by branch/year/domain |
| **Module 3** | **Test Builder & Question Management** | `backend/src/routes/testRoutes.ts`, question bank schema, test options, MCQ CRUD interface |
| **Module 4** | **Student Examination Interface & Engine** | `frontend/app/student/*`, timer countdown, responsive mobile question navigation, test submission |
| **Module 5** | **Integrity Monitoring & Violation Logging** | Browser visibility monitoring, tab-switch detection, violation logging endpoints, audit logs |

---

## 🗺️ Roadmap & Next Implementation Phase

The project adheres to structured iterative phases:

- [x] **Phase 1: Project Foundation** *(Current)* — Directory architecture, Firebase Admin integration, TypeScript types, Express skeleton, Next.js UI scaffolding, and documentation.
- [ ] **Phase 2: Authentication** — Firebase Client Auth, Google/Email login, backend token verification, and role custom claims.
- [ ] **Phase 3: User Management** — Student profile completion, enrollment verification, and presence heartbeats.
- [ ] **Phase 4: Admin Dashboard** — Metrics overview, student directory table, and status filtering.
- [ ] **Phase 5: Test Creation & Question Bank** — MCQ authoring, question randomization, and duration limits.
- [ ] **Phase 6: Test Access Management** — Admin permission grants (by domain, year, or individual student).
- [ ] **Phase 7: Student Exam Taking Flow** — Mobile test screen, question navigation, and option selection.
- [ ] **Phase 8: Timer, Autosave & Resumption** — Local storage backup, periodic response syncing, and auto-submit upon timer expiry.
- [ ] **Phase 9: Grading & Results** — Server-side automated scoring and student report cards.
- [ ] **Phase 10: Anti-Cheating & Integrity Monitoring** — Fullscreen request, visibility change detection, paste blocking, and violation logs.
- [ ] **Phase 11: Live Admin Monitoring** — Real-time student progress tracking and force-submission triggers.
- [ ] **Phase 12: Production Hardening** — Security audit, rate limiting, and performance testing.

### Recommended Next Step
Proceed to **Phase 2 (Authentication)**: implement Firebase client-side SDK initialization on Next.js, wire up the `/login` and `/register` forms, and attach backend verification middleware with role assignment.

---

## 📄 License
This project is developed for educational and college examination purposes.
