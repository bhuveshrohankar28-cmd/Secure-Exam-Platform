# Implementation Plan: Exam Lobby & Admin Panel

## Overview

This plan implements the Exam Lobby, Admin Panel, and Score/Violations Tracking features on the existing Next.js 16 App Router frontend and Express/Firestore backend. Tasks proceed from pure utility functions outward through backend endpoints, shared UI primitives, student flows, and admin flows, finishing with integration and accessibility tests. Each task builds directly on the previous ones so no code is left orphaned.

The design document has a "Correctness Properties" section (Properties 1–19), so property-based tests are included as optional sub-tasks throughout.

---

## Tasks

- [x] 1. Extend type definitions and API client for new feature surfaces
  - [x] 1.1 Add new types to `frontend/types/index.ts`
    - Add `ViolationType`, `Violation`, `AttemptWithViolations`, `AuditLog`, and `LobbyState` as defined in the design document
    - Extend `TestAttempt` with optional `violationCount` and `violations` fields
    - _Requirements: 11.1, 12.1, 14.1_

  - [x] 1.2 Extend `frontend/lib/api/endpoints.ts` with new endpoint wrappers
    - Add `violationsApi.record()` wrapping `POST /api/violations`
    - Add `adminApi.forceSubmit()` wrapping `POST /api/admin/attempts/:id/force-submit`
    - Add `adminApi.getAttemptViolations()` wrapping `GET /api/admin/attempts/:id/violations`
    - Add `adminApi.getAuditLogs()` wrapping `GET /api/admin/audit-logs`
    - Update `adminApi.getAttempts()` return type to `AttemptWithViolations[]`
    - _Requirements: 11.1, 12.1, 13.4, 14.8_

- [x] 2. Implement frontend utility pure functions
  - [x] 2.1 Create `frontend/lib/utils/time.ts` — timer formatting and color state
    - Implement `formatTimeHHMMSS(ms: number): string` — converts milliseconds to `HH:MM:SS` string
    - Implement `formatTimeMMSS(ms: number): string` — converts milliseconds to `MM:SS` string (for admin monitor)
    - Implement `timerColorState(remainingMs: number): "default" | "warning" | "critical"` — returns `critical` if ≤ 60 000 ms, `warning` if ≤ 300 000 ms, otherwise `default`
    - _Requirements: 4.1, 4.8, 13.1, 19.1, 19.3, 19.4_

  - [x] 2.2 Write property tests for timer utilities (Property 1 & 3)
    - Install `fast-check` as a dev dependency in `/frontend` if not present; set up Vitest in `/frontend` with a `vitest.config.ts` that runs `**/*.test.ts` files
    - **Property 1: Exam timer formatted as HH:MM:SS** — for any non-negative integer ms, `formatTimeHHMMSS(ms)` matches `/^\d{2}:\d{2}:\d{2}$/` with correct decomposition
    - **Property 3: Timer color state is determined solely by remaining time** — for any non-negative integer ms, exactly one of `critical/warning/default` is returned per the boundary rules
    - _Requirements: 4.1, 4.8, 19.1, 19.3, 19.4_

  - [x] 2.3 Create `frontend/lib/utils/validation.ts` — form field validators
    - Implement `validateLobbyEntry(username: string, code: string): { usernameError?: string; codeError?: string }` — returns errors when either field is empty, username > 100 chars, or code > 50 chars
    - Implement `validateDuration(d: unknown): { valid: boolean; error?: string }` — accepts integers 5–300 only, returns error string "Duration must be between 5 and 300 minutes" otherwise
    - _Requirements: 1.2, 1.3, 1.4, 1.9, 6.5_

  - [x] 2.4 Write property tests for validation utilities (Properties 4 & 9)
    - **Property 4: Lobby entry form rejects empty or overlong fields without a network request** — for any username/code combination triggering any rejection rule, both errors are present and no error is present for valid inputs
    - **Property 9: Test creation form validates duration range** — for any integer d outside 5–300, `validateDuration` rejects; for any d in 5–300, it accepts
    - _Requirements: 1.2, 1.3, 1.4, 1.9, 6.5_

  - [x] 2.5 Create `frontend/lib/utils/lobby.ts` — lobby acknowledgment helper
    - Implement `allAcknowledged(checkboxStates: boolean[]): boolean` — returns `true` iff every element is `true`
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 2.6 Write property test for lobby acknowledgment helper (Property 5)
    - **Property 5: Acknowledgment checkboxes gate the Start Exam button** — for any array of booleans, `allAcknowledged` returns `true` iff every element is `true`
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 2.7 Create `frontend/lib/utils/exam.ts` — exam state helper functions
    - Implement `toggleReview(current: boolean): boolean` — pure toggle
    - Implement `questionNavState(flags: { isCurrent: boolean; isMarkedForReview: boolean; isAnswered: boolean }): "current" | "marked" | "answered" | "unanswered"` — applies priority order: current > marked > answered > unanswered
    - Implement `computeSummary(questions: Array<{ state: "answered" | "unanswered" | "marked" }>): { answeredCount: number; unansweredCount: number; markedCount: number }` — sums counts and verifies total equals N
    - Implement `computeDialogCounts(answers: Record<string, number | null | undefined>, markedForReview: Set<string>, totalQuestions: number): { answeredCount: number; unansweredCount: number; markedCount: number }`
    - _Requirements: 15.11, 16.2, 16.3, 16.6, 16.7, 17.1, 18.1_

  - [x] 2.8 Write property tests for exam state helpers (Properties 14, 15, 16, 17)
    - **Property 14: Mark-for-review is a pure toggle** — `toggleReview(toggleReview(b)) === b` for any boolean
    - **Property 15: Question nav panel state priority is total and deterministic** — for any combination of flags, exactly one state is returned per priority order
    - **Property 16: Summary row counts are consistent with individual question states** — `answeredCount + unansweredCount + markedCount === N`
    - **Property 17: Submit confirmation dialog counts match in-memory state** — dialog counts equal what `computeDialogCounts` produces for the same answer map and review set
    - _Requirements: 15.11, 16.2, 16.3, 16.6, 16.7, 17.1, 18.1_

  - [x] 2.9 Create `frontend/lib/utils/scores.ts` — score display helpers
    - Implement `computePercentage(score: number, totalMarks: number): number` — returns `Math.round((score / totalMarks) * 100 * 10) / 10`; returns `0.0` when `totalMarks === 0`
    - _Requirements: 10.6_

  - [x] 2.10 Write property test for percentage score formula (Property 8)
    - **Property 8: Percentage score formula** — for any score s and totalMarks t > 0, result equals `Math.round((s / t) * 100 * 10) / 10`; for t = 0, result is `0.0`
    - _Requirements: 10.6_

  - [x] 2.11 Create `frontend/lib/utils/testStatus.ts` — test status transition helper
    - Extract or implement `nextStatuses(status: TestStatus): TestStatus[]` returning the exact sets from Requirements 8.1
    - _Requirements: 8.1_

  - [x] 2.12 Write property test for status transition function (Property 11)
    - **Property 11: Test status transition function is exhaustive and correct** — for each of the 5 valid `TestStatus` values, `nextStatuses` returns exactly the allowed set from Requirements 8.1
    - _Requirements: 8.1_

  - [x] 2.13 Create `frontend/lib/utils/filter.ts` — filter and sort utilities
    - Implement `filterItems<T>(items: T[], predicate: (item: T) => boolean): T[]` — returns only matching items, no more and no less
    - Implement `sortAttemptsByScore(attempts: AttemptWithViolations[]): AttemptWithViolations[]` — stable sort descending by score; null scores sort last
    - _Requirements: 9.3, 10.4, 10.7_

  - [x] 2.14 Write property tests for filter and sort utilities (Properties 12 & 13)
    - **Property 12: Filter-then-display invariant** — for any array and predicate, filtered result contains all and only satisfying items
    - **Property 13: Sort by score descending produces a non-increasing sequence** — for any non-empty array of graded attempts, `attempts[i].score >= attempts[i+1].score` for all consecutive pairs
    - _Requirements: 9.3, 10.4, 10.7_

- [x] 3. Implement and test backend utility functions
  - [x] 3.1 Add `computePercentage` export to `backend/src/services/gradingService.ts`
    - Add `computePercentage(score: number, totalMarks: number): number` matching the frontend formula (rounds to 1 decimal; returns 0.0 when totalMarks is 0)
    - _Requirements: 10.6_

  - [x] 3.2 Write property tests for backend grading service (Property 7)
    - Install `fast-check` as a dev dependency in `/backend` if not present; configure Vitest or Jest for the backend
    - **Property 7: Grade computation invariants** — for any non-empty array of questions Q and any answer map A, all five invariants hold simultaneously: `totalMarks = Σ q.marks`, `0 ≤ score ≤ totalMarks`, `0 ≤ correctCount ≤ answeredCount`, `answeredCount ≤ Q.length`, `score = Σ q.marks for correct answers`
    - _Requirements: 10.1_

  - [x] 3.3 Extend `backend/src/validators/testValidator.ts` with question import validation
    - Implement or extend `validateImportPayload(questions: unknown[]): { valid: boolean; errors: Array<{ index: number; field: string; message: string }> }` — validates text length (1–1000), options count (exactly 4, each 1–500 chars), `correctOptionIndex` (0–3), `marks` (0.5–100); any failure rejects the entire payload with per-question field errors
    - Enforce max 500 questions per import
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 3.4 Write property test for question import validator (Property 10)
    - **Property 10: Question import rejects the entire payload when any entry is invalid** — for any payload containing at least one question with any invalid field, the validator rejects all questions and identifies each failing index and field
    - _Requirements: 7.1, 7.3_

- [x] 4. Implement new backend endpoints
  - [x] 4.1 Create `backend/src/services/violationService.ts`
    - Implement `recordViolation(params: { attemptId: string; userId: string; type: ViolationType; metadata?: Record<string, unknown> }): Promise<Violation>` — validates attempt exists, belongs to user, and is `in_progress`; validates total serialized document size ≤ 10 KB; uses a Firestore batch write to atomically write the `violations` document and a `VIOLATION_DETECTED` `auditLogs` document; returns the created `Violation` with server-assigned timestamp
    - Implement `listViolationsByAttempt(attemptId: string): Promise<Violation[]>` — queries `violations` collection where `attemptId == attemptId`
    - _Requirements: 11.1, 11.2, 11.3, 12.7_

  - [x] 4.2 Create `backend/src/controllers/violationController.ts`
    - Implement `recordViolationHandler` for `POST /api/violations` — validates request body with Zod (`attemptId`: non-empty string, `type`: one of 8 `ViolationType` values, `metadata`: optional object); calls `violationService.recordViolation`; returns 201 on success; returns 400 for invalid body, 403 if attempt not owned by user, 409 if attempt not `in_progress`, 413 if payload > 10 KB
    - Implement `getAttemptViolationsHandler` for `GET /api/admin/attempts/:id/violations` — calls `violationService.listViolationsByAttempt`; returns 200 with violations array
    - _Requirements: 11.1, 11.2, 11.3, 12.2_

  - [x] 4.3 Register violation routes in `backend/src/routes`
    - Create `backend/src/routes/violationRoutes.ts` — `POST /api/violations` uses `verifyToken + requireAllowedStudent`; register in `backend/src/app.ts` as `app.use("/api/violations", violationRoutes)`
    - Add `GET /api/admin/attempts/:id/violations` to `backend/src/routes/adminRoutes.ts` using `verifyToken + requireRole(["admin", "superadmin"])`
    - _Requirements: 11.1, 12.2_

  - [x] 4.4 Add `POST /api/admin/attempts/:id/force-submit` endpoint
    - Add `forceSubmitAttempt` handler in `backend/src/controllers/attemptController.ts` — loads attempt by id, verifies it is `in_progress`, calls `finalizeAttempt(attempt)`, sets `status = "force_submitted"`, writes `EXAM_FORCE_SUBMITTED` audit log entry with admin's `userId`, student's `userId`, `attemptId`, and server timestamp; returns 200 with `AttemptView`
    - Register route in `backend/src/routes/adminRoutes.ts`: `POST /api/admin/attempts/:id/force-submit`
    - _Requirements: 13.4, 13.5, 14.3_

  - [x] 4.5 Add `GET /api/admin/audit-logs` endpoint
    - Create `backend/src/services/auditLogService.ts` with `listAuditLogs(filter: { userId?: string; testId?: string; attemptId?: string }): Promise<AuditLog[]>` — at least one filter is required; returns up to 500 entries ordered by timestamp ascending
    - Add `getAuditLogs` controller handler and route in `adminRoutes.ts`
    - _Requirements: 14.8_

  - [x] 4.6 Instrument `AttemptService` and `TestAccessService` with audit log writes
    - In `backend/src/services/attemptService.ts`: write `EXAM_STARTED` audit log in `createAttemptIfAbsent` on `created: true`; write `EXAM_SUBMITTED` audit log in `finalizeAttempt` (include `userId`, `attemptId`, `score`, `totalMarks`, server timestamp)
    - In `backend/src/services/testAccessService.ts`: write `TEST_ACCESS_GRANTED` audit log in the grant path; write `TEST_ACCESS_REVOKED` audit log in the revoke path
    - Use Firestore batch writes so the audit log and the primary resource write are atomic; reject the triggering operation if the batch fails per Requirements 14.7
    - _Requirements: 14.1, 14.2, 14.4, 14.5, 14.7_

  - [x] 4.7 Extend `GET /api/admin/attempts` to include `violationCount` and `testTitle`
    - In `backend/src/controllers/attemptController.ts` `listAllAttempts` handler: after fetching attempts, query violation counts per attempt (batch read from `violations` grouped by `attemptId`); attach `violationCount` and `testTitle` to each item in the response
    - _Requirements: 12.1_

  - [x] 4.8 Write property test for violation recording endpoint (Property 18)
    - **Property 18: Violation submission rejected for non-in_progress attempts** — for any attempt whose status is not `in_progress`, `POST /api/violations` returns a 4xx response and no violation document is written; existing violations are unchanged
    - _Requirements: 11.3_

  - [x] 4.9 Write property test for answer upsert idempotency (Property 19)
    - **Property 19: Autosave is idempotent** — for any answer map state A, sending the same `POST /api/attempts/:id/answers` payload twice produces the same final server-side answer state as sending it once; no duplicate answer documents are created
    - _Requirements: 15.3_

- [x] 5. Checkpoint — backend endpoint tests pass
  - Ensure all backend tests pass. Ask the user if questions arise.

- [x] 6. Build shared UI components (mobile-first)
  - [x] 6.1 Create `frontend/components/ui/BottomSheet.tsx`
    - Implement slide-up panel with `translateY` CSS transition
    - Render backdrop overlay; stop sheet at top of FixedActionBar (use CSS `bottom` offset matching FixedActionBar height)
    - Implement focus trap: Tab key cycles within sheet; Escape key and backdrop tap close the sheet
    - Export props: `isOpen`, `onClose`, `children`
    - All interactive elements inside must meet 44×44 CSS px touch target minimum
    - _Requirements: 16.8, 16.10, 17.8_

  - [x] 6.2 Create `frontend/components/ui/FixedActionBar.tsx`
    - Render `position: fixed; bottom: 0; left: 0; right: 0` container on mobile (≤767px); inline on desktop (≥768px)
    - Export props: `children`
    - _Requirements: 2.9, 2.10, 15.12_

  - [x] 6.3 Create `frontend/components/ui/StickyTimerBar.tsx`
    - Render `position: sticky; top: 0` on mobile; `position: fixed` on desktop
    - Apply `timerColorState` to set text color classes: default / warning (≤300 s) / critical (≤60 s)
    - Export props: `remainingMs: number`
    - All color pairs must meet ≥3:1 contrast ratio
    - _Requirements: 4.8, 4.10, 4.11, 19.3, 19.4, 19.9, 19.10_

  - [x] 6.4 Create `frontend/components/ui/FAB.tsx`
    - Render circular button `position: fixed; bottom: calc(<FixedActionBar height> + 16px); right: 16px` on mobile; hidden on desktop
    - Minimum 44×44 CSS px touch target
    - Export props: `label: string; onClick: () => void`
    - _Requirements: 16.8, 16.9, 16.13_

  - [x] 6.5 Create `frontend/components/ui/ViolationOverlay.tsx`
    - Full-screen non-dismissible overlay (no backdrop click, no Escape); dismissed only by an explicit acknowledgment button
    - Acknowledgment button: minimum 44×44 CSS px touch target
    - Export props: `message: string; onAcknowledge: () => void`
    - _Requirements: 11.5, 11.6_

  - [x] 6.6 Create `frontend/components/ui/CopyButton.tsx`
    - On click: copy provided `value` string to clipboard; show confirmation indicator for exactly 2 seconds, then revert
    - Minimum 44×44 CSS px touch target
    - Export props: `value: string; label?: string`
    - _Requirements: 6.6_

- [x] 7. Implement the `useExamTimer` hook
  - [x] 7.1 Create `frontend/hooks/useExamTimer.ts`
    - Accept `remainingMs: number` (server-authoritative initial value)
    - Set `deadlineRef.current = Date.now() + remainingMs` on mount
    - Run `setInterval(1000)` — each tick sets displayed `remainingMs = max(0, deadlineRef.current - Date.now())`
    - When `remainingMs` reaches 0 call the provided `onExpire` callback exactly once
    - Clean up interval on unmount
    - _Requirements: 4.2, 19.2, 19.7_

  - [x] 7.2 Write property test for timer drift (Property 2)
    - **Property 2: Timer drift is bounded by one second** — for any server-authoritative `endsAt` and any elapsed client time T ms, the timer's displayed remaining ms differs from `max(0, endsAt - (startTime + T))` by at most 1 000 ms (use mocked `Date.now()`)
    - _Requirements: 4.2, 19.2_

- [x] 8. Implement the student lobby
  - [x] 8.1 Create `frontend/app/(student)/lobby/page.tsx` and `LobbyEntryForm` component
    - Create the route group directory `frontend/app/(student)/lobby/`
    - Implement `LobbyEntryForm`: Username/ID field (max 100 chars), Test Code field (max 50 chars), submit button
    - On submit: run `validateLobbyEntry`; if errors, show field-level messages and retain values; only then fire `authApi.login` followed by `testsApi.getLobby`
    - While request in flight: disable submit button and show loading indicator
    - On invalid credentials (401/403): show error, retain values
    - On test not found (404): show error, retain values
    - Mobile layout: single column, full-width fields, submit button 44 px min height
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

  - [x] 8.2 Write unit test for `LobbyEntryForm` validation rendering
    - Test that field-level errors appear for empty fields without network calls
    - Test that overlong inputs are rejected before network calls
    - Test that auth failure retains field values
    - _Requirements: 1.2, 1.3, 1.4, 1.9_

  - [x] 8.3 Create `useLobbyPolling` hook in `frontend/hooks/useLobbyPolling.ts`
    - Accept `testCode: string`; manage `LobbyState` response
    - Immediately fetch on mount; then schedule next fetch 10 seconds after completion of each response (use `useRef` for interval ID)
    - If fetch takes > 15 s: show degraded status indicator, keep retrying
    - Transition from `waiting` to `ready` without page reload within 2 s of receiving the response
    - On `ended` state: stop polling and clear interval
    - Clean up on unmount
    - _Requirements: 3.2, 3.3, 3.4, 3.6_

  - [x] 8.4 Implement `LobbyScreen` with all 5 states
    - `LobbyWaiting`: show student name, test name, "waiting for admin" message; use `useLobbyPolling`
    - `LobbyReady`: show test metadata (title, description, totalMarks, questionCount, duration) from `LobbyState.test`; render Security Rules and Guidelines as acknowledgment checkboxes; enable Start Exam button only when `allAcknowledged` returns true; Start Exam in `FixedActionBar`
    - `LobbyInProgress`: show `StickyTimerBar` with `useExamTimer` using `attempt.endsAt`; navigate to `/student/exam/:attemptId` when state transitions
    - `LobbyFinished`: display score, totalMarks, correctCount, answeredCount from completed attempt; show error if results unavailable
    - `LobbyEnded`: show "exam session closed" message; stop all polling
    - Error state: if metadata fails to load, show error and hide checkboxes/Start button
    - Mobile layout: single-column vertical scroll, Start Exam in FixedActionBar (full-width, 44 px min height)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.1, 3.4, 3.5, 3.6, 3.7, 4.9, 4.10, 5.2, 5.3, 5.4_

  - [x] 8.5 Write unit tests for `LobbyScreen` state transitions
    - Test each of the 5 lobby states renders the correct content
    - Test polling state machine: waiting → ready → in_progress navigation
    - Test degraded connectivity indicator on poll timeout > 15 s
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [x] 8.6 Write component test for test metadata rendering (Property 6)
    - **Property 6: Test metadata is fully rendered for any valid test** — for any valid test data object, the rendered LobbyScreen contains each of the 5 required metadata fields in the DOM with non-empty text content
    - _Requirements: 2.1_

- [x] 9. Checkpoint — lobby tests pass
  - Ensure all lobby tests pass. Ask the user if questions arise.

- [x] 10. Implement the student exam screen
  - [x] 10.1 Create `frontend/hooks/useViolationDetector.ts`
    - Listen for: `visibilitychange` to hidden, window `blur`, `copy`, `paste`, `contextmenu`, fullscreen API exit, restricted keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+Shift+I, F12, Alt+Tab)
    - On detection: call `violationsApi.record({ attemptId, type, metadata })` with local queuing and retry logic (retry 3× at 5 s intervals; discard silently after all retries fail)
    - Expose `onViolation` callback so the exam page can show `ViolationOverlay`
    - On fullscreen exit: expose `isFullscreenViolation` and `onReenterFullscreen` for the 30 s re-enter window logic
    - Do NOT fire violations for digit keys 1–4, arrows, N, P, R (exam navigation keys)
    - Clean up all listeners on unmount
    - _Requirements: 11.4, 11.5, 11.6, 11.7, 20.9_

  - [x] 10.2 Create `frontend/components/student/QuestionCard.tsx`
    - Display 1-based question index, total count, question text, and exactly 4 radio-button answer options
    - Highlight selected option with visually distinct style (not color alone)
    - Each option: full-width card, min height 48 px, min touch target 44 px
    - ARIA: `role="radiogroup"` on container; each option `role="radio"`, `aria-checked`, announces "Option N of 4" plus option text
    - Emit live-region announcement on selection change (`aria-live="polite"`)
    - Export props: `question`, `selectedIndex: number | null`, `onSelect: (index: number) => void`, `disabled?: boolean`
    - _Requirements: 15.1, 15.3, 15.10, 15.13, 15.15, 20.3, 20.8_

  - [x] 10.3 Create `frontend/components/student/QuestionNavPanel.tsx`
    - Render N numbered buttons (1-based), each showing state via `questionNavState` (current/marked/answered/unanswered) using unique combination of background, border, and icon (not color alone)
    - Summary row: answered, unanswered, marked counts via `computeSummary`
    - On mobile: render as `BottomSheet` (collapsed by default, toggled by `FAB`); FAB shows "answered/total" badge
    - On desktop: render as persistent sidebar
    - All nav buttons: min 44×44 px touch target
    - Export props: `questions`, `currentIndex`, `answers`, `markedForReview`, `onNavigate`
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11, 16.12, 16.13_

  - [x] 10.4 Create `frontend/components/student/SubmitConfirmationDialog.tsx`
    - Show answered, unanswered, and marked counts from `computeDialogCounts`
    - Confirm Submit button receives initial focus; both Confirm and Cancel are full-width on mobile with min 44 px height
    - While in-flight: disable both buttons and show loading indicator
    - On 4xx/5xx: display error, re-enable buttons, retain answer state
    - Cancel / Escape: close dialog, return focus to Submit Exam button
    - Enter key when Confirm has focus: trigger confirm; Enter when Cancel has focus: trigger cancel
    - Mobile: render as full-screen `BottomSheet`; Desktop: centered modal overlay
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10_

  - [x] 10.5 Refactor `frontend/app/student/exam/[id]/page.tsx` to wire all components
    - Load `ExamSession` from `attemptsApi.getById`; derive `remainingMs` from response
    - State: `useState(answers)` + `useRef(answersRef)` for current selections; `useRef(savedAnswersRef)` for server-confirmed answers; `useState(currentQuestion)`; `useState(markedForReview: Set<string>)`; `useRef(submittingRef)` guard
    - Autosave: `useEffect` on `answers` change → diff against `savedAnswersRef` → debounce 800 ms → `attemptsApi.saveAnswers` with delta only; on failure: show non-blocking inline error, retry once after 3 s; retain error indicator and in-memory state on retry failure
    - Mount `StickyTimerBar` with `useExamTimer`; on expire: disable inputs, call submit flow with up to 3 retries at 2 s intervals; show "contact examiner" error after all retries exhausted
    - Mount `useViolationDetector`; on violation: show `ViolationOverlay`; on fullscreen violation: enforce 30 s re-enter window before re-enabling inputs
    - Keyboard shortcuts: digit keys 1–4 → select answer; Up/Down arrows → move focus between options; N/Right arrow → next question; P/Left arrow → previous question; R → toggle review; only on `pointer: fine` devices; no shortcuts on `pointer: coarse`
    - Tab order: options 1–4 → Mark for Review → Previous → Next/Submit → nav panel toggle
    - On new question: place focus on first answer option
    - Render `QuestionCard` for current question only (no other questions in DOM)
    - Mount `QuestionNavPanel`; update state within 200 ms of any question state change
    - Replace Next with Submit Exam on last question; disable Previous on first question
    - Show `SubmitConfirmationDialog` on Submit Exam click; navigate to results on success
    - On page reload: re-fetch `ExamSession`, reset timer anchor; if re-fetch fails, resume from last known `remainingMs` and show sync error
    - _Requirements: 15.1–15.15, 16.1–16.13, 17.1–17.10, 18.1–18.6, 19.1–19.10, 20.1–20.10_

  - [x] 10.6 Write unit tests for exam page state management
    - Test autosave delta computation: only changed answers sent
    - Test autosave retry logic: inline error shown on failure, preserved on retry failure
    - Test timer-zero: inputs disabled, submit fired, retries attempted
    - Test violation overlay: shown on detection, dismissed on acknowledge
    - Test fullscreen violation: inputs locked until fullscreen restored or 30 s elapsed
    - Test keyboard shortcuts only on `pointer: fine`
    - Test `SubmitConfirmationDialog` counts match in-memory state at open time
    - _Requirements: 15.3, 15.9, 15.11, 19.5, 19.6, 20.2, 20.9, 20.10_

- [x] 11. Checkpoint — exam screen tests pass
  - Ensure all exam screen tests pass. Ask the user if questions arise.

- [x] 12. Implement the admin test management pages
  - [x] 12.1 Create `frontend/app/admin/tests/[id]/page.tsx` — test detail page
    - Fetch test by id from `testsApi.getById`
    - Render `TestDetailHeader`: title, status badge, Test Code in visually distinct element with `CopyButton`
    - Render `TestStatusControls`: compute allowed transitions via `nextStatuses(status)`; each allowed transition is a button that calls `testsApi.update(id, { status: next })` after confirmation; on failure: show error, retain current displayed status; validate zero-questions guard before activating (Req 8.4)
    - Render `QuestionImportForm`: JSON textarea + mode selector (`append`/`replace`); call `testsApi.importQuestions`; on success: update question count and total marks in-place without page reload; on failure: list each invalid question by 1-based index and failing field; disable form when test is not `draft` or `scheduled` with message "Questions cannot be modified once a test is active"
    - Render regenerate code button calling `testsApi.regenerateCode`; replace displayed code on success; show error on failure
    - When test status is `active`: render `LiveParticipantCount` polling `adminApi.getAttempts({ testId, status: "in_progress" })` every 30 s
    - Show delete button only when status is `draft`, `scheduled`, or `archived`; on confirm: `testsApi.delete` then navigate to test list; on failure: show error, stay on page
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 6.6, 6.7, 6.8, 6.9, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 12.2 Extend `frontend/app/admin/tests/page.tsx` — test list with creation form
    - Add `TestListFilter` status dropdown populated with all distinct statuses + "All"; filter results within 500 ms; show "No tests found" when nothing matches
    - Add `CreateTestButton` that shows inline creation form (title, description, duration) or navigates to `/admin/tests/new`
    - Test creation form validates all required fields and duration range via `validateDuration` before submitting; on success: navigate to detail page within 1 s; on failure: retain field values and show error; append new test to list without full reload
    - Render each test with all required metadata fields; tap/click navigates to detail page within 500 ms
    - Mobile: single-column card list; Desktop: multi-column table
    - Min touch target height 44 px on all cards/rows
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.8, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 13. Implement the admin dashboard pages
  - [x] 13.1 Create `frontend/app/admin/attempts/page.tsx` — attempts view
    - Render `AttemptFilterBar`: test selector dropdown + status filter (`in_progress`, `submitted`, `graded`, `force_submitted`); apply `filterItems` and reflect results within 3 s
    - Render each attempt with: student username, student name, test title, score, totalMarks, `computePercentage` value, correctCount, answeredCount, submittedAt, status
    - `ViolationBadge` per attempt: distinct visual state for 0 violations vs ≥1 violations (color + icon, not color alone)
    - Sort by score descending via `sortAttemptsByScore` when sort action triggered; reflect within 3 s
    - On attempt select: open `AttemptDetailDrawer` with per-question breakdown (student's selected option, correct/incorrect for each question) and `ViolationList` (type, timestamp, metadata for each violation; "no violations" message if empty)
    - Mobile: single-column card list; Desktop: table with horizontal scroll if needed; min touch target 44 px
    - _Requirements: 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 12.1, 12.2, 12.3_

  - [x] 13.2 Create `frontend/app/admin/monitor/[testId]/page.tsx` — live monitor
    - Poll `adminApi.getAttempts({ testId, status: "in_progress" })` every 15 s; display each in-progress attempt with username, name, answeredCount, violationCount, and remaining time via `formatTimeMMSS`
    - On attempt transitioning to `graded`/`force_submitted` during refresh: move row from active list to completed list without full page reload
    - Force Submit: show confirmation prompt; on confirm call `adminApi.forceSubmit(attemptId)`; on success update row to `force_submitted` status with `score / totalMarks`; on failure show error and retain previous state
    - On refresh failure: show error message, continue polling at 15 s interval
    - Mobile: single-column card list, no horizontal scroll; min touch target 44 px for Force Submit button
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10_

  - [x] 13.3 Extend `frontend/app/admin/dashboard/page.tsx` — summary cards
    - For each test with `active` status: render summary card showing total participants, count of participants with ≥1 violation, and average score rounded to 2 decimal places
    - Refresh card data every 30 s while at least one test is active
    - Mobile: full-width single-column cards
    - _Requirements: 12.4, 12.5, 12.8_

- [x] 14. Checkpoint — admin panel tests pass
  - Ensure all admin panel and dashboard tests pass. Ask the user if questions arise.

- [x] 15. Integration and accessibility tests
  - [x] 15.1 Write end-to-end lobby polling integration test
    - Simulate server returning `waiting` → `ready` → `in_progress` on successive poll responses; verify LobbyScreen transitions and navigates to exam without page reload
    - Verify polling stops on `ended` state
    - _Requirements: 3.2, 3.4, 3.6_

  - [x] 15.2 Write end-to-end exam submission integration test
    - Start an attempt, answer questions via autosave, submit via dialog; verify result screen shows graded score
    - Verify `EXAM_STARTED` and `EXAM_SUBMITTED` audit log entries are written
    - _Requirements: 14.1, 14.2, 15.3, 17.3_

  - [x] 15.3 Write admin force-submit flow integration test
    - Simulate in-progress attempt; admin force-submits; verify `force_submitted` status, score display, and `EXAM_FORCE_SUBMITTED` audit log entry
    - _Requirements: 13.4, 13.5, 14.3_

  - [x] 15.4 Write violation recording integration test
    - Simulate browser violation event; verify violation document persisted and appears in Admin Attempts View violation list
    - Verify violation attempt rejected for non-`in_progress` attempt with 409 response
    - _Requirements: 11.2, 11.3, 12.6_

  - [x] 15.5 Write axe-core accessibility tests for exam screen
    - Run `axe-core` on rendered exam page; verify zero violations
    - Verify keyboard Tab order: options → Mark for Review → Previous → Next/Submit → nav toggle
    - Verify digit key shortcuts (1–4) select options on `pointer: fine` devices
    - Verify arrow key navigation between options; Space/Enter selects focused option
    - Verify ARIA roles: `role="radiogroup"`, `role="radio"`, correct `aria-checked` values
    - Verify live-region announcements on answer change
    - _Requirements: 20.1, 20.2, 20.3, 20.7, 20.8_

  - [x] 15.6 Write accessibility tests for BottomSheet focus trap
    - Verify Tab key cycles within BottomSheet when open
    - Verify Escape key closes sheet and returns focus to trigger element
    - Verify backdrop tap closes sheet
    - Verify focus indicator contrast ≥3:1 against adjacent background on all interactive elements
    - _Requirements: 16.8, 17.2, 20.7_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests use **fast-check** and must run a minimum of 100 iterations each
- Tag each property test with the comment format: `// Feature: exam-lobby-admin-panel, Property {N}: {title}`
- Unit tests cover specific examples, boundary values, and error conditions complementing property tests
- All Firestore writes that pair a primary document with an audit log must use Firestore batch writes for atomicity (Requirements 14.7, 11 Violation_Service)
- The `ViolationType` model in `backend/src/types/models.ts` includes `"other"` — the frontend API only sends the 8 enumerated types; the `"other"` variant is reserved for internal use
- Check `frontend/node_modules/next/dist/docs/` for Next.js 16 App Router specifics before creating new routes

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5", "2.7", "2.9", "2.11", "2.13", "3.1", "3.3"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.8", "2.10", "2.12", "2.14", "3.2", "3.4"] },
    { "id": 3, "tasks": ["4.1", "4.5"] },
    { "id": 4, "tasks": ["4.2", "4.4", "4.6", "4.7"] },
    { "id": 5, "tasks": ["4.3", "4.8", "4.9"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "7.1"] },
    { "id": 7, "tasks": ["7.2", "8.1", "8.3"] },
    { "id": 8, "tasks": ["8.2", "8.4"] },
    { "id": 9, "tasks": ["8.5", "8.6", "10.1", "10.2", "10.3", "10.4"] },
    { "id": 10, "tasks": ["10.5"] },
    { "id": 11, "tasks": ["10.6", "12.1", "12.2"] },
    { "id": 12, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 13, "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5", "15.6"] }
  ]
}
```
