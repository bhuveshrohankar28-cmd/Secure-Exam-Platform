# Team Modules

This document describes the suggested module ownership for each team member. Modules are loosely coupled — each team member works independently on their module and communicates with other modules through documented REST API endpoints.

---

## Module Division

### Team Member 1 — Authentication + User Management

**Phases:** 2, 3

**Responsibilities:**
- Firebase Authentication integration on the frontend
- Student registration form with all fields (name, enrollment no., branch, domain, year, phone)
- Login/logout flow
- Firebase ID token handling in the frontend API client
- Backend `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` implementation
- Backend user profile creation in Firestore on registration
- Account status approval flow (admin approves `pending` → `active` accounts)
- Role assignment via Firebase custom claims

**Files:**
- `frontend/app/login/page.tsx`
- `frontend/app/register/page.tsx`
- `frontend/lib/firebase/firebaseClient.ts`
- `frontend/hooks/useAuth.ts` (to be created)
- `backend/src/controllers/authController.ts`
- `backend/src/services/authService.ts` (to be created)
- `backend/src/validators/authValidator.ts` (to be created)

**API Endpoints:**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users/me`
- `POST /api/users/heartbeat`

---

### Team Member 2 — Admin Dashboard + Test Access Management

**Phases:** 4, 6

**Responsibilities:**
- Admin dashboard with real data from backend
- User table with filtering (year, domain, branch, status, online/offline)
- Online/offline detection using `lastSeen` heartbeat data
- Test access granting and revoking UI
- Backend `/api/admin/users` with filtering query params
- Backend `/api/test-access` implementation

**Files:**
- `frontend/app/admin/dashboard/page.tsx`
- `frontend/app/admin/users/page.tsx`
- `frontend/hooks/useAdminUsers.ts` (to be created)
- `backend/src/controllers/adminController.ts`
- `backend/src/services/adminService.ts` (to be created)
- `backend/src/controllers/testAccessController.ts`
- `backend/src/services/testAccessService.ts` (to be created)

**API Endpoints:**
- `GET /api/admin/users?year=&domain=&branch=&status=&online=&search=`
- `GET /api/test-access`
- `POST /api/test-access`
- `DELETE /api/test-access/:id`

---

### Team Member 3 — Test Builder + Question Management

**Phases:** 5

**Responsibilities:**
- Admin test creation form (title, description, duration, total marks)
- Question editor (add/edit/delete MCQ questions with 4 options + correct answer)
- Test status management (draft → scheduled → active → completed)
- Backend `/api/tests` CRUD implementation
- Firestore `tests` and `questions` collections

**Files:**
- `frontend/app/admin/tests/page.tsx`
- `frontend/components/admin/TestBuilder.tsx` (to be created)
- `frontend/components/admin/QuestionEditor.tsx` (to be created)
- `backend/src/controllers/testController.ts`
- `backend/src/services/testService.ts` (to be created)
- `backend/src/validators/testValidator.ts` (to be created)

**API Endpoints:**
- `GET /api/tests`
- `GET /api/tests/:id`
- `POST /api/tests`
- `PUT /api/tests/:id`
- `DELETE /api/tests/:id`

---

### Team Member 4 — Student Exam Interface + Exam Engine

**Phases:** 7, 8, 9

**Responsibilities:**
- Student dashboard with available tests
- Test instructions page
- Full exam interface (question display, option selection, navigation)
- Countdown timer
- Answer autosave
- Submission flow
- Result display
- Backend attempt and answer endpoints

**Files:**
- `frontend/app/student/dashboard/page.tsx`
- `frontend/app/student/tests/[id]/page.tsx`
- `frontend/app/student/results/page.tsx`
- `frontend/components/student/ExamInterface.tsx` (to be created)
- `frontend/components/student/Timer.tsx` (to be created)
- `frontend/components/student/QuestionCard.tsx` (to be created)
- `backend/src/controllers/attemptController.ts`
- `backend/src/services/attemptService.ts` (to be created)
- `backend/src/services/gradingService.ts` (to be created)

**API Endpoints:**
- `POST /api/attempts`
- `GET /api/attempts/:id`
- `POST /api/attempts/:id/answers`
- `POST /api/attempts/:id/submit`

---

### Team Member 5 — Security / Anti-Cheating + Monitoring

**Phases:** 10, 11, 12

**Responsibilities:**
- Browser-based integrity event detection (tab switch, blur, fullscreen exit, copy/paste)
- Violation logging to backend
- Admin live monitoring dashboard
- Force-submit on excessive violations
- Audit log display in admin reports
- Security hardening (rate limiting, input sanitization)

**Files:**
- `frontend/hooks/useExamIntegrity.ts` (to be created)
- `frontend/app/admin/reports/page.tsx`
- `backend/src/routes/` — violation endpoints (to be created)
- `backend/src/services/violationService.ts` (to be created)
- `backend/src/services/auditService.ts` (to be created)

**API Endpoints (to be designed in Phase 10):**
- `POST /api/violations` — log a browser integrity event
- `GET /api/admin/violations/:attemptId` — admin views violations per attempt

---

## Communication Between Modules

All inter-module communication goes through the documented REST API (see `api.md`).

Team members should:
1. Read `api.md` before building features that depend on other modules
2. Update `api.md` when adding new endpoints
3. Keep TypeScript interfaces in sync between frontend `types/index.ts` and backend `types/models.ts`
4. Create feature branches: `feature/auth`, `feature/admin-users`, `feature/test-builder`, `feature/exam-engine`, `feature/security`

## Git Branching

```
main
  ├── feature/auth           (Team Member 1)
  ├── feature/admin-users    (Team Member 2)
  ├── feature/test-builder   (Team Member 3)
  ├── feature/exam-engine    (Team Member 4)
  └── feature/security       (Team Member 5)
```

Never push directly to `main`. Always open a Pull Request for review.
