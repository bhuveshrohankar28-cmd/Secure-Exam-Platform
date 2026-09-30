# Development Phases

This document outlines the recommended order of implementation for the Secure Exam Platform.

Each phase builds on the previous one. Do not skip phases.

---

## Phase 1 — Project Foundation ✅ COMPLETE

**Goal:** Set up the project structure so all team members can work independently.

**Deliverables:**
- [x] Root project with `frontend/`, `backend/`, `docs/`
- [x] Next.js frontend with TypeScript, Tailwind CSS, App Router
- [x] Express backend with TypeScript, Firebase Admin SDK, Helmet, CORS
- [x] TypeScript types for all data models
- [x] All REST API route stubs
- [x] Auth middleware structure
- [x] Environment variable setup
- [x] Frontend → backend health check working
- [x] All page placeholders
- [x] Documentation

---

## Phase 2 — RTF ID Authentication & Admin Approval ✅ COMPLETE

**Goal:** Students can register and log in with their RTF ID; only students approved/allowed by an administrator can access examinations.

**Deliverables:**
- [x] Direct student login with unique RTF ID (no Firebase Auth, Google Auth, or email/password dependencies)
- [x] Student registration form capturing RTF ID, Name, Domain, and Passing Year
- [x] Admin approval verification gate (`isAllowed`) before granting exam access
- [x] Informative pending approval feedback when an RTF ID is registered but not yet allowed
- [x] Admin approval endpoints (`PATCH /api/admin/users/:userId/allow` and pre-approval)
- [x] Interactive Admin user management table with one-click Allow/Revoke buttons
- [x] Secure JWT session tokens issued by backend (`authMiddleware` verification)

**Test:** Student enters RTF ID. If approved by admin, login succeeds and JWT token is issued. If pending, login is blocked with an approval alert.

---

## Phase 3 — User Management

**Goal:** Students have a working dashboard with their profile.

**Deliverables:**
- [ ] `GET /api/users/me` returns real Firestore data
- [ ] Heartbeat endpoint updating `lastSeen` in Firestore
- [ ] Student dashboard showing user info
- [ ] Protected routes (redirect unauthenticated users to login)

**Test:** After login, student sees their dashboard and heartbeat is updating `lastSeen`.

---

## Phase 4 — Admin Dashboard + User Management

**Goal:** Admin can see all registered students with filtering.

**Deliverables:**
- [ ] `GET /api/admin/users` returns users from Firestore
- [ ] Filtering by year, domain, branch, status
- [ ] Online/offline based on `lastSeen` comparison
- [ ] Search by name, email, enrollment number
- [ ] Admin can approve/reject/block accounts

**Test:** Admin sees all students with correct online/offline status.

---

## Phase 5 — Test Builder + Question Bank

**Goal:** Admin can create tests and add MCQ questions.

**Deliverables:**
- [ ] Test creation form (title, description, duration, marks)
- [ ] Question editor with 4 options and correct answer selection
- [ ] Test status management (draft → scheduled → active)
- [ ] Backend CRUD for tests and questions
- [ ] `correctOptionIndex` is never returned to students

**Test:** Admin creates a test with 5 questions and publishes it.

---

## Phase 6 — Test Access Management

**Goal:** Admin can grant/revoke student access to specific tests.

**Deliverables:**
- [ ] Admin selects students and grants test access
- [ ] `testAccess` records created in Firestore
- [ ] Students can only see tests they have been granted access to
- [ ] Admin can revoke access
- [ ] `GET /api/tests` returns only accessible tests for students

**Test:** Admin grants Student A access to Test 1. Student A sees it; Student B does not.

---

## Phase 7 — Student Exam Interface + Exam Engine

**Goal:** Students can take exams end-to-end.

**Deliverables:**
- [ ] Test instructions page with countdown before start
- [ ] Full exam interface (all questions, navigation)
- [ ] Countdown timer with visual warning at 5 minutes
- [ ] Answer selection and navigation
- [ ] Answer autosave every 30 seconds
- [ ] Submit button with confirmation dialog
- [ ] Attempt record in Firestore

**Test:** Student starts a test, answers all questions, and submits.

---

## Phase 8 — Timer, Autosave, and Recovery

**Goal:** Prevent data loss if the student closes the tab or loses connection.

**Deliverables:**
- [ ] Autosave answers to backend every 30 seconds
- [ ] On page reload, recover answers from backend
- [ ] Auto-submit when timer expires
- [ ] Prevent starting the same test twice
- [ ] Handle network interruptions gracefully

**Test:** Student closes the tab mid-exam and reopens — answers are restored.

---

## Phase 9 — Grading and Results

**Goal:** Students see their scores after submission.

**Deliverables:**
- [ ] Automatic grading after submission
- [ ] Score calculation from `answers` vs `correctOptionIndex`
- [ ] Result page showing score and pass/fail
- [ ] Admin can view all results in the Attempts dashboard

**Test:** After submission, student immediately sees their score.

---

## Phase 10 — Anti-Cheating / Violation Monitoring

**Goal:** Detect and log browser integrity violations during exams.

**Deliverables:**
- [ ] Tab switch detection (`visibilitychange` event)
- [ ] Window blur/focus detection
- [ ] Fullscreen monitoring
- [ ] Copy/paste blocking
- [ ] Right-click blocking
- [ ] Restricted keyboard shortcuts
- [ ] Violations logged to `violations` collection
- [ ] Audit log entries created for each violation
- [ ] Warning shown to student on violation

**Important Disclaimer:**
> Browser-based monitoring provides integrity detection only. It cannot prevent screenshots, screen recording, external device usage, or AI tools in other applications.

**Test:** Student switches tabs — violation is logged; student sees a warning.

---

## Phase 11 — Live Admin Monitoring

**Goal:** Admin can see all active exams in real time.

**Deliverables:**
- [ ] Admin sees all currently in-progress attempts
- [ ] Real-time online/offline status with heartbeat
- [ ] Violation count per student visible to admin
- [ ] Admin can force-submit a specific student's exam
- [ ] Force-submit creates an audit log entry

**Test:** Admin sees Student A is online with 3 violations and force-submits.

---

## Phase 12 — Testing, Security Hardening, and Launch Preparation

**Goal:** Platform is production-ready.

**Deliverables:**
- [ ] Rate limiting on all API endpoints
- [ ] Input sanitization and Zod validation on all routes
- [ ] Firestore Security Rules locked down
- [ ] HTTPS enforced in production
- [ ] Environment variable audit (no secrets in frontend)
- [ ] Firebase Authentication rules reviewed
- [ ] Unit tests for critical services
- [ ] End-to-end testing of the full exam flow
- [ ] Performance testing on exam interface
- [ ] Audit log report in admin dashboard
- [ ] README updated with deployment instructions

**Test:** Complete exam flow from registration to results with all security checks passing.
