# Development Phases

This document outlines the recommended order of implementation for the Secure Exam Platform.

Each phase builds on the previous one. Do not skip phases.

> 📖 **Detailed Technical Guide:** For comprehensive, step-by-step instructions, sequence diagrams, code contracts, API payloads, and testing procedures for each phase, see the **[Step-by-Step Implementation Guide](./stepwise-implementation-guide.md)**.

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

## Phase 2 — Open Account Access ✅ COMPLETE

**Goal:** Anyone can create an account and sign in; administrators manage account access separately from test-specific permissions.

**Deliverables:**
- [x] Account creation and login using a general username and full name
- [x] Immediate access for new accounts without membership checks or administrator approval
- [x] Administrator controls for disabling or restoring account access
- [x] Test-specific access remains managed independently
- [x] Secure JWT session tokens issued by backend (`authMiddleware` verification)

**Test:** A new user enters a username and full name, receives a session, and can access tests granted to their account.

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

**Goal:** Admin can see all registered users with filtering.

**Deliverables:**
- [ ] `GET /api/admin/users` returns users from Firestore
- [ ] Filtering by year, domain, branch, status
- [ ] Online/offline based on `lastSeen` comparison
- [ ] Search by name, email, enrollment number
- [ ] Admin can enable or disable account access

**Test:** Admin sees all students with correct online/offline status.

---

## Phase 5 — Test Builder + Question Bank

**Goal:** Admin can create tests and add MCQ questions.

**Deliverables:**
- [x] Test creation form (title, description, duration)
- [x] Validated JSON question import with four options and correct answer selection
- [x] Test status management (draft → scheduled → active)
- [x] Backend CRUD for tests and questions
- [x] `correctOptionIndex` is never returned to students during an exam

**Test:** Admin creates a test with 5 questions and publishes it.

---

## Phase 6 — Test Access Management

**Goal:** Admin can grant/revoke student access to specific tests.

**Deliverables:**
- [x] Admin selects an individual student and grants test access
- [x] `testAccess` records created in Firestore (or in-memory for local development)
- [x] Students can only see and start tests they have been granted access to
- [x] Admin can revoke access
- [x] `GET /api/tests` returns only accessible tests for students
- [ ] Batch/domain/year-based grants

**Test:** Admin grants Student A access to Test 1. Student A sees it; Student B does not.

---

## Phase 7 — Student Exam Interface + Exam Engine

**Goal:** Students can take exams end-to-end.

**Deliverables:**
- [x] Test instructions page and start/resume actions
- [x] Exam interface with question navigation
- [x] Responsive exam layout
- [x] Countdown timer with visual warning under one minute
- [x] Answer selection and navigation
- [x] Changed answers are autosaved to the backend
- [x] Submit action and automatic submission at expiry
- [x] Attempt record in Firestore (or in-memory for local development)

**Test:** Student starts a test on mobile and desktop, answers all questions, and submits. See [mobile-testing-guide.md](./mobile-testing-guide.md).

---

## Phase 8 — Timer, Autosave, and Recovery

**Goal:** Prevent data loss if the student closes the tab or loses connection.

**Deliverables:**
- [x] Autosave changed answers to backend
- [x] On page reload, recover answers from backend
- [x] Auto-submit when timer expires
- [x] Prevent starting the same test twice
- [x] Surface save/connection errors and retry on subsequent changes

**Test:** Student closes the tab mid-exam and reopens — answers are restored.

---

## Phase 9 — Grading and Results

**Goal:** Students see their scores after submission.

**Deliverables:**
- [x] Automatic grading after submission
- [x] Score calculation from `answers` vs `correctOptionIndex`
- [x] Student result and score pages
- [x] Admin can view results in the Attempts dashboard and export attempt data

**Test:** After submission, student immediately sees their score.

---

## Phase 10 — Anti-Cheating / Violation Monitoring

**Goal:** Detect and log browser integrity violations during exams.

**Deliverables:**
- [ ] Tab switch detection (`visibilitychange` event)
- [ ] Mobile app switch and notification shade blur detection
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
