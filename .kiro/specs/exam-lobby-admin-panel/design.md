# Design Document — Exam Lobby & Admin Panel

## Overview

This feature builds three interconnected surfaces on top of the existing Express + Firestore backend:

1. **Student Exam Lobby** — a mobile-first entry form and waiting/ready lobby that polls live test state, then transitions the student into the exam screen.
2. **Admin Panel — Test Management** — improved admin pages for creating tests, importing questions in bulk, managing the test status lifecycle, and monitoring live participants.
3. **Score, Identity & Violations Tracking** — server-side persistence of scores, violation events, and audit logs, exposed through structured admin dashboard views.

The backend already serves most required API routes. This design adds one new backend endpoint (`POST /api/violations`), extends the admin attempts endpoint to include violation counts, and builds all new frontend pages on top of the Next.js 16 App Router that is already running in `/frontend`.

---

## Architecture

### System Layers

```
Browser (student / admin)
          │
          ▼
Next.js 16 App Router  (/frontend)
  ├── app/(student)/lobby/page.tsx        ← NEW
  ├── app/student/exam/[id]/page.tsx      ← EXTEND (existing stub)
  ├── app/admin/tests/page.tsx            ← EXTEND (existing)
  ├── app/admin/tests/[id]/page.tsx       ← NEW
  ├── app/admin/attempts/page.tsx         ← NEW
  └── app/admin/monitor/[testId]/page.tsx ← NEW
          │  (all /api/* proxied via next.config.ts rewrites to :5000)
          ▼
Express REST API  (/backend)
  ├── POST /api/violations           ← NEW
  ├── GET  /api/admin/attempts       ← EXTEND (add violationCount, testTitle)
  ├── POST /api/admin/attempts/:id/force-submit ← NEW
  └── GET  /api/admin/audit-logs     ← NEW
          │
          ▼
Firebase Admin SDK
          │
          ▼
Cloud Firestore
  ├── tests / {testId}
  ├── questions / {questionId}
  ├── testAccess / {accessId}
  ├── testAttempts / {attemptId}
  ├── answers / {answerId}
  ├── violations / {violationId}   ← already modelled in types/models.ts
  └── auditLogs / {logId}          ← already modelled in types/models.ts
```

### Frontend ↔ Backend Route Map

| Frontend page | Backend endpoints used |
|---|---|
| `(student)/lobby` | `GET /api/tests/code/:code` (polling) |
| `student/exam/[id]` | `GET /api/attempts/:id`, `POST /api/attempts/:id/answers`, `POST /api/attempts/:id/submit`, `POST /api/violations` |
| `admin/tests` | `GET /api/admin/tests`, `POST /api/tests`, `PUT /api/tests/:id`, `DELETE /api/tests/:id` |
| `admin/tests/[id]` | `GET /api/tests/:id`, `PUT /api/tests/:id`, `DELETE /api/tests/:id`, `POST /api/tests/:id/questions/import`, `POST /api/tests/:id/regenerate-code` |
| `admin/attempts` | `GET /api/admin/attempts?testId=&status=` |
| `admin/monitor/[testId]` | `GET /api/admin/attempts?testId=&status=in_progress`, `POST /api/admin/attempts/:id/force-submit` |

### Auth Flow

All student pages use the existing `authMiddleware` JWT path. The frontend's `lib/api/client.ts` already attaches the stored JWT on every request. Lobby polling uses the same token; no unauthenticated polling is allowed.

---

## Components and Interfaces

### Student Flow — Page/Component Tree

```
app/
└── (student)/
    └── lobby/
        └── page.tsx
            ├── LobbyEntryForm            ← username + test code → auth + lookup
            └── LobbyScreen               ← rendered after successful code lookup
                ├── LobbyWaiting          ← state: "waiting"
                ├── LobbyReady            ← state: "ready"  (shows guidelines + checkboxes)
                ├── LobbyInProgress       ← state: "in_progress" (redirects to exam)
                ├── LobbyFinished         ← state: "finished" (shows score)
                └── LobbyEnded            ← state: "ended"

app/student/exam/[id]/
    └── page.tsx  (existing; refactored into sub-components)
        ├── StickyTimerBar                ← HH:MM:SS, pinned top on mobile
        ├── QuestionCard                  ← question text + 4 radio options
        ├── FixedActionBar                ← Previous / Next/Submit / Mark for Review (mobile)
        ├── QuestionNavPanel              ← desktop: sidebar; mobile: BottomSheet
        │   └── QuestionNavButton × N
        ├── QuestionNavFAB                ← mobile FAB (answered/total badge)
        ├── SubmitConfirmationDialog      ← desktop: modal; mobile: BottomSheet
        └── ViolationOverlay              ← non-dismissible warning overlay
```

### Admin Flow — Page/Component Tree

```
app/admin/
├── tests/
│   ├── page.tsx (existing — extended)
│   │   ├── TestListFilter              ← status dropdown
│   │   ├── TestCard / TestRow
│   │   └── CreateTestButton → navigates to /admin/tests/new
│   └── [id]/
│       └── page.tsx (NEW)
│           ├── TestDetailHeader        ← title, status badge, Test Code + copy button
│           ├── TestStatusControls      ← transition buttons
│           ├── QuestionImportForm      ← JSON textarea + mode selector
│           ├── LiveParticipantCount    ← refreshed every 30 s when status=active
│           └── TestDeleteButton
├── attempts/
│   └── page.tsx (NEW)
│       ├── AttemptFilterBar            ← test selector + status filter
│       ├── AttemptCard / AttemptRow
│       │   └── ViolationBadge
│       └── AttemptDetailDrawer
│           ├── PerQuestionBreakdown
│           └── ViolationList
└── monitor/
    └── [testId]/
        └── page.tsx (NEW)
            ├── ParticipantCard / ParticipantRow
            │   └── ForceSubmitButton
            └── CompletedParticipantList
```

### Shared UI Primitives

These components are reused across both flows and must be mobile-first.

| Component | Purpose | Mobile behavior |
|---|---|---|
| `BottomSheet` | Replaces modals on mobile | Slides up from bottom; overlay backdrop |
| `FixedActionBar` | Exam nav buttons | Pinned to bottom of viewport |
| `StickyTimerBar` | Countdown timer | Pinned to top of viewport |
| `FAB` | QuestionNavPanel toggle | Bottom-right, above FixedActionBar |
| `ViolationOverlay` | Non-dismissible exam warning | Full-screen overlay |
| `CopyButton` | Test Code copy + 2s feedback | Same on all viewports |

All interactive elements must meet the 44×44 CSS pixel Touch_Target minimum (WCAG 2.5.5).

---

## Data Models

### Existing models (unchanged)

`TestAttempt`, `Answer`, `Question`, `Test`, `TestAccess`, `User` — defined in `backend/src/types/models.ts` and mirrored in `frontend/types/index.ts`. No schema changes needed.

### `Violation` (existing model — needs write path)

Already typed in `backend/src/types/models.ts`:

```typescript
interface Violation {
  id: string;           // auto-generated
  attemptId: string;
  userId: string;
  type: ViolationType;  // "tab_switch" | "window_blur" | "visibility_hidden" |
                        // "fullscreen_exit" | "copy_attempt" | "paste_attempt" |
                        // "context_menu" | "keyboard_shortcut"
  timestamp: ISOTimestamp;  // server-assigned UTC, not client-supplied
  metadata: Record<string, unknown>; // max 10 KB total document
}
```

**New Firestore collection:** `violations/{violationId}` — documents created by `POST /api/violations`. An index on `(attemptId)` is needed for the admin detail view lookup.

### `AuditLog` (existing model — needs write path)

Already typed in `backend/src/types/models.ts`:

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;  // "EXAM_STARTED" | "EXAM_SUBMITTED" | "EXAM_FORCE_SUBMITTED" |
                        // "TEST_ACCESS_GRANTED" | "TEST_ACCESS_REVOKED" | "VIOLATION_DETECTED" | ...
  entityType: AuditEntityType;
  entityId: string;
  timestamp: ISOTimestamp;
  metadata: Record<string, unknown>;
}
```

**New Firestore collection:** `auditLogs/{logId}` — append-only. Indexed on `(userId)`, `(testId metadata field)`, and `(entityId)` for filtered queries.

### New frontend types (additions to `frontend/types/index.ts`)

```typescript
export type ViolationType =
  | "tab_switch" | "window_blur" | "visibility_hidden" | "fullscreen_exit"
  | "copy_attempt" | "paste_attempt" | "context_menu" | "keyboard_shortcut";

export interface Violation {
  id: string;
  attemptId: string;
  userId: string;
  type: ViolationType;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface AttemptWithViolations extends TestAttempt {
  violationCount: number;
  violations?: Violation[];
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface LobbyState {
  test: Pick<Test, "title" | "description" | "duration" | "totalMarks" | "questionCount" | "status">;
  state: "waiting" | "ready" | "in_progress" | "finished" | "ended";
  attempt: TestAttempt | null;
}
```

### New API additions to `frontend/lib/api/endpoints.ts`

```typescript
export const violationsApi = {
  record: (violation: {
    attemptId: string;
    type: ViolationType;
    metadata?: Record<string, unknown>;
  }) => apiRequest("/api/violations", { method: "POST", body: violation }),
};

export const adminAttemptsApi = {
  list: (params?: { testId?: string; status?: string }) =>
    apiRequest<AttemptWithViolations[]>(`/api/admin/attempts${...}`),
  forceSubmit: (attemptId: string) =>
    apiRequest<AttemptView>(`/api/admin/attempts/${attemptId}/force-submit`, { method: "POST" }),
  violations: (attemptId: string) =>
    apiRequest<Violation[]>(`/api/admin/attempts/${attemptId}/violations`),
};
```

---

## Key Data Flows

### 1. Lobby Polling

```
LobbyScreen mounts with testCode and userId
    │
    ├── immediate: GET /api/tests/code/:code
    │       └── response.state === "waiting"
    │               │
    │               └── setInterval(10_000):
    │                   ├── await GET /api/tests/code/:code
    │                   ├── if timeout > 15s → show degraded indicator + retry
    │                   └── if state transitions:
    │                       "waiting" → "ready"   → re-render to ready state
    │                       "ready"   → "in_progress" → navigate to /student/exam/:attemptId
    │                       any       → "ended"   → show ended message, stop polling
    │
    └── polling cleanup: clearInterval on unmount or state=ended
```

**Implementation note:** Use `useRef` to track the interval ID. Derive the next poll time from the *completion* of the previous response (not wall-clock), to match the requirement of "10 seconds between completion of one response and initiation of the next."

### 2. Exam Autosave

```
Student selects answer
    │
    └── setAnswers({ ...prev, [questionId]: selectedIndex })
        └── useEffect on answers dependency
            ├── diff: answersRef vs savedAnswersRef → find changed pairs
            ├── debounce 800ms (existing pattern)
            └── POST /api/attempts/:id/answers  { answers: [...changed] }
                ├── success → update savedAnswersRef, clear error
                └── failure → show inline error, retry once after 3s
                    └── retry failure → retain error indicator, preserve in-memory state
```

Only changed answers are sent (delta, not full answer map). The server's `upsertAnswers` is idempotent — sending the same answer twice is safe.

### 3. Violation Recording

```
Browser event fires (visibilitychange, blur, copy, paste, contextmenu,
                     fullscreen change, keyboard shortcut)
    │
    ├── Exam_Client records event type + metadata
    ├── Shows ViolationOverlay (non-dismissible until acknowledged)
    └── POST /api/violations { attemptId, type, metadata }
        ├── success → violation stored, ViolationOverlay shows confirmation
        └── failure → queue locally
            └── retry every 5s, max 3 attempts
                └── all retries exhausted → discard record silently
```

Violation metadata payload is validated to stay under 10 KB total document size before submission.

### 4. Timer Synchronization

```
Exam page loads
    │
    └── GET /api/attempts/:id
        ├── response.remainingMs → deadlineRef.current = Date.now() + remainingMs
        └── setInterval(1000):
            ├── remaining = max(0, deadlineRef.current - Date.now())
            ├── setRemainingMs(remaining)
            └── if remaining === 0 → trigger submitExam()
```

The deadline is a fixed absolute timestamp (`deadlineRef = Date.now() + remainingMs`). All subsequent ticks subtract from that anchor, so accumulated drift is bounded by the resolution of `setInterval` (~1ms per tick), never by per-tick rounding. On page reload, `GET /api/attempts/:id` returns a fresh `remainingMs` which resets the anchor.

### 5. Force Submit (Admin)

```
Admin clicks Force Submit on a participant row
    │
    └── Confirmation prompt
        └── POST /api/admin/attempts/:id/force-submit
            ├── backend: calls finalizeAttempt() + writes EXAM_FORCE_SUBMITTED audit log
            ├── success → move row to completed list, show graded score
            └── failure → show error, retain row in previous state
```

---

## Mobile-First Layout System

### Breakpoints

```css
/* Mobile-first base: ≤767px */
/* Desktop enhancement: ≥768px */

@media (min-width: 768px) { /* desktop overrides */ }
```

All layouts are written mobile-first. Desktop styles are additive overrides.

### Responsive Patterns by Context

| Component | Mobile (≤767px) | Desktop (≥768px) |
|---|---|---|
| `LobbyEntryForm` | Single column, full-width fields, 44px submit button | Centered card, max-width 480px |
| `LobbyScreen` | Single-column vertical scroll; Start Exam in FixedActionBar | Two-column or centered single column |
| `StickyTimerBar` | `position: sticky; top: 0` inside scrolling container | `position: fixed` anywhere visible |
| `FixedActionBar` | `position: fixed; bottom: 0; left: 0; right: 0` | Inline below question content |
| `QuestionNavPanel` | `BottomSheet` (collapsed by default, toggled by FAB) | Persistent sidebar (flex row layout) |
| `FAB` | `position: fixed; bottom: calc(FixedActionBar height + 16px); right: 16px` | Hidden |
| `SubmitConfirmationDialog` | Full-screen `BottomSheet` | Centered modal overlay |
| `AdminTestsList` | Single-column card list | Multi-column table |
| `AdminAttemptsView` | Single-column card list | Table with horizontal scroll |
| `AdminDashboardSummary` | Full-width single-column cards | Multi-column grid |

### BottomSheet Behavior

```
BottomSheet (collapsed)
    └── FAB tap / action trigger
        ├── animate: translateY(100%) → translateY(0)
        ├── backdrop: rgba overlay covering everything except FixedActionBar
        ├── focus trap: Tab key cycles within sheet
        └── dismiss: tap backdrop, swipe down, or Escape key
            └── animate: translateY(0) → translateY(100%)
```

The BottomSheet must not obscure the `FixedActionBar`. It slides up to the top of the FixedActionBar, not to the top of the viewport.

### Touch Target Enforcement

Every interactive element must have a computed hit area of at least 44×44 CSS pixels. For small icons or compact buttons, use padding to expand the hit area without expanding the visible element:

```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## New Backend Endpoints

### `POST /api/violations`

Records a browser integrity violation for an active attempt.

**Auth:** `verifyToken` + `requireAllowedStudent`

**Request body:**
```json
{
  "attemptId": "att_<testId>_<userId>",
  "type": "tab_switch",
  "metadata": { "key": "Tab", "count": 1 }
}
```

**Validation:**
- `attemptId`: required, non-empty string
- `type`: required, one of the 8 allowed `ViolationType` values
- `metadata`: optional object; total serialized document must be ≤ 10 KB
- Attempt must exist and must belong to the requesting user
- Attempt status must be `in_progress`

**Success response (201):**
```json
{ "success": true, "data": { "id": "vio_...", "timestamp": "2026-..." } }
```

**Error responses:**
- `400` — invalid body
- `403` — attempt not owned by requesting user
- `409` — attempt is not `in_progress`
- `413` — metadata payload exceeds 10 KB

**Side effects:**
- Writes `Violation` document to `violations` collection
- Writes `VIOLATION_DETECTED` `AuditLog` entry

### `POST /api/admin/attempts/:id/force-submit`

Force-submits an in-progress attempt on behalf of a student.

**Auth:** `verifyToken` + `requireRole(["admin", "superadmin"])`

**Success response (200):**
```json
{ "success": true, "data": { "attempt": { ...AttemptView } } }
```

**Side effects:**
- Calls `finalizeAttempt(attempt)` (grades the attempt)
- Sets `attempt.status = "force_submitted"`
- Writes `EXAM_FORCE_SUBMITTED` `AuditLog` entry

### `GET /api/admin/attempts/:id/violations`

Returns all violation records for an attempt.

**Auth:** `verifyToken` + `requireRole(["admin", "superadmin"])`

**Response:**
```json
{ "success": true, "data": [ ...Violation[] ] }
```

### `GET /api/admin/audit-logs`

Returns audit log entries. At least one filter parameter must be provided.

**Auth:** `verifyToken` + `requireRole(["admin", "superadmin"])`

**Query params:** `userId`, `testId`, `attemptId` (at least one required)

**Response:** Up to 500 entries ordered by timestamp ascending.

---

## State Management

### React State Strategy

The exam page is the most stateful component. The existing pattern in `app/student/exam/[id]/page.tsx` uses a mix of `useState` and `useRef`; this pattern is kept and extended.

| State category | Mechanism | Rationale |
|---|---|---|
| Current answers | `useState(answers)` + `useRef(answersRef)` | `useRef` gives synchronous access in timer/submit callbacks without stale closures |
| Saved answers (server) | `useRef(savedAnswersRef)` | Only needed for diff computation, never renders |
| Timer deadline | `useRef(deadlineRef)` | Avoids re-renders on every tick; the `remainingMs` state drives the display |
| Submission in flight | `useRef(submittingRef)` | Guards against double-submission in callbacks |
| Question index | `useState(currentQuestion)` | Drives re-render for navigation |
| Marked for review | `useState(markedForReview: Set<string>)` | Client-side only; resets on reload |
| Violation queue | `useRef(violationQueue: ViolationRecord[])` | Not rendered; managed by retry logic |
| Lobby poll interval | `useRef(pollIntervalId)` | Cleaned up on unmount |

### Server-Authoritative vs. Client State

- **Timer deadline** is server-authoritative on first load (`remainingMs` from API) and on every page reload. Client clock only drives ticks.
- **Answer selections** are optimistic (update UI immediately), with server confirmation tracked via `savedAnswersRef`.
- **Violation count** for the admin view is server-authoritative; the admin monitor refreshes every 15 seconds.
- **Mark for review** is purely client-side (not persisted to server).

---

## Error Handling

### Student-Facing Errors

| Error scenario | User-visible behavior |
|---|---|
| Lobby entry — invalid credentials | Inline error message; field values retained |
| Lobby entry — test code not found | Inline error message; field values retained |
| Lobby polling failure (timeout > 15s) | Connection status indicator; polling continues |
| Autosave failure | Non-blocking inline error adjacent to answer options; retry once after 3s |
| Autosave retry failure | Error indicator persists; in-memory answer state preserved |
| Timer-zero auto-submit failure | Retry up to 3 times at 2s intervals; then show error + "contact examiner" |
| Violation record failure | Queue locally; retry 3× at 5s; discard if all fail (silent to student) |
| Exam session load failure | Error message + "Return to dashboard" link |
| Final submit failure | Error in confirmation dialog; re-enable buttons; retain answer state |

### Admin-Facing Errors

| Error scenario | User-visible behavior |
|---|---|
| Test creation failure | Error message; all form field values retained |
| Question import failure | Error listing 1-based index of each failing question |
| Status transition failure | Error message; displayed status unchanged |
| Force submit failure | Error message; row retains previous state |
| Participant list refresh failure | Error message; polling continues at 15s interval |
| Deletion failure | Error message; no navigation |

### Backend Error Conventions

All errors follow the existing envelope format:
```json
{ "success": false, "error": "...", "details": ["..."] }
```

The `Violation_Service` must not partially write — if the Firestore batch commit fails, neither the `violations` document nor the `auditLogs` document should be written. Use a Firestore batch write for the two documents together.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property reflection:** After reviewing the prework analysis, the following redundancies were consolidated:
- Properties about timer formatting (HH:MM:SS from Req 4.1 and MM:SS from Req 13.1) are kept separate because the format differs (HH:MM:SS vs MM:SS).
- Properties about filter behavior (attempts by status from Req 10.3-10.5 and tests by status from Req 9.3) are combined into one general filter-correctness property.
- Properties about sort ordering (Req 10.7) and count accuracy (Req 16.6-16.7, 17.1) are kept distinct as they test different structures.
- Properties about the mark-for-review toggle (Req 15.11/18.1) and the dialog counts (Req 17.1) are combined because both hinge on the correctness of the in-memory toggle state.

---

### Property 1: Exam timer formatted as HH:MM:SS

*For any* non-negative integer millisecond value `ms`, `formatTimeHHMMSS(ms)` shall return a string matching the regular expression `^\d{2}:\d{2}:\d{2}$`, where the hours, minutes, and seconds components are the correct decomposition of `Math.floor(ms / 1000)` total seconds, and the function shall not return negative values for any `ms ≥ 0`.

**Validates: Requirements 4.1, 19.1**

---

### Property 2: Timer drift is bounded by one second

*For any* server-authoritative `endsAt` timestamp and any elapsed client time `T` milliseconds since the timer was initialised with `remainingMs = endsAt - startTime`, the timer's displayed remaining milliseconds shall differ from `max(0, endsAt - (startTime + T))` by at most 1 000 ms.

**Validates: Requirements 4.2, 19.2**

---

### Property 3: Timer color state is determined solely by remaining time

*For any* remaining time `t` in milliseconds, the timer's color state shall be exactly:
- `critical` iff `t ≤ 60_000`
- `warning` iff `60_000 < t ≤ 300_000`
- `default` iff `t > 300_000`

Each adjacent pair of states shall be visually distinguishable with a contrast ratio of at least 3:1.

**Validates: Requirements 4.8, 19.3, 19.4**

---

### Property 4: Lobby entry form rejects empty or overlong fields without a network request

*For any* username string `u` and test code string `c`, the lobby entry form shall not issue any network request if:
- `u.trim().length === 0`, or
- `c.trim().length === 0`, or
- `u.length > 100`, or
- `c.length > 50`

In all such cases, a field-level validation error shall be displayed adjacent to the offending field, and the other field's value shall be retained unchanged.

**Validates: Requirements 1.2, 1.3, 1.4, 1.9**

---

### Property 5: Acknowledgment checkboxes gate the Start Exam button

*For any* array of `N` boolean acknowledgment checkbox states `[c₁, c₂, …, cN]`, the Start Exam button shall be enabled iff every `cᵢ` is `true`; the button shall be disabled iff any `cᵢ` is `false`. The enable/disable transition shall occur within 100 ms of any checkbox state change.

**Validates: Requirements 2.4, 2.5, 2.6**

---

### Property 6: Test metadata is fully rendered for any valid test

*For any* valid test data object with title, description, totalMarks, questionCount, and duration, the rendered LobbyScreen shall contain each of those five fields in the DOM with non-empty text content.

**Validates: Requirements 2.1**

---

### Property 7: Grade computation invariants

*For any* non-empty array of questions `Q` and any answer map `A`, `gradeAttempt(Q, A)` shall satisfy all of the following simultaneously:
- `totalMarks = Σ q.marks for q in Q`
- `0 ≤ score ≤ totalMarks`
- `0 ≤ correctCount ≤ answeredCount`
- `answeredCount ≤ Q.length`
- `score = Σ q.marks for each q where A[q.id] === q.correctOptionIndex`

**Validates: Requirements 10.1**

---

### Property 8: Percentage score formula

*For any* score `s` and total marks `t` where `t > 0`, the displayed percentage shall equal `Math.round((s / t) * 100 * 10) / 10`. When `t = 0`, the displayed percentage shall be `0.0` regardless of `s`.

**Validates: Requirements 10.6**

---

### Property 9: Test creation form validates duration range

*For any* integer `d`, the test creation form's duration field validation shall accept `d` iff `5 ≤ d ≤ 300`; for any `d < 5` or `d > 300` or any non-integer value, the form shall display the error "Duration must be between 5 and 300 minutes" and shall not submit the request.

**Validates: Requirements 6.5**

---

### Property 10: Question import rejects the entire payload when any entry is invalid

*For any* question array payload `P` containing at least one question with an invalid field (text length outside 1–1000, options count ≠ 4, any option empty, `correctOptionIndex` outside 0–3, or `marks` outside 0.5–100), the import validator shall reject the entire payload — no questions shall be stored — and shall identify the 1-based index of each failing question and the specific field that failed.

**Validates: Requirements 7.1, 7.3**

---

### Property 11: Test status transition function is exhaustive and correct

*For any* `TestStatus` value `s`, `nextStatuses(s)` shall return exactly the following sets:
- `draft` → `["scheduled", "active", "archived"]`
- `scheduled` → `["draft", "active", "archived"]`
- `active` → `["completed"]`
- `completed` → `["archived"]`
- `archived` → `[]`

No other transitions shall be returned for any input, and every input in the set of valid `TestStatus` values shall produce a defined (non-undefined) result.

**Validates: Requirements 8.1**

---

### Property 12: Filter-then-display invariant

*For any* collection of items (tests, attempts, or audit log entries) and any filter criterion `F`, the filtered and rendered result shall contain only items satisfying `F`, and shall contain all items from the collection that satisfy `F`. No items that do not satisfy `F` shall appear, and no satisfying items shall be omitted.

**Validates: Requirements 9.3, 10.4**

---

### Property 13: Sort by score descending produces a non-increasing sequence

*For any* non-empty array of graded attempts sorted by score descending, for all indices `i` where `i + 1 < attempts.length`, `attempts[i].score ≥ attempts[i+1].score` shall hold.

**Validates: Requirements 10.7**

---

### Property 14: Mark-for-review is a pure toggle (round trip)

*For any* boolean review state `b` of a question, toggling twice shall return the original state: `toggle(toggle(b)) === b`. Consequently, for any initial set of review flags `R`, `toggle(toggle(R)) equals R` element-wise.

**Validates: Requirements 15.11, 18.1**

---

### Property 15: Question nav panel state priority is total and deterministic

*For any* combination of question state flags `(isCurrent, isMarkedForReview, isAnswered)`, the Question_Nav_Panel shall display exactly one of the four states, chosen by the priority order: current (highest) > marked-for-review > answered > unanswered (lowest). No combination of flags shall result in an undefined state or a mixture of two states simultaneously.

**Validates: Requirements 16.2, 16.3**

---

### Property 16: Summary row counts are consistent with individual question states

*For any* array of `N` questions, each with a state in `{answered, unanswered, marked-for-review}`, the summary row shall display:
- `answeredCount = |{ q : q.state == answered }|`
- `unansweredCount = |{ q : q.state == unanswered }|`
- `markedCount = |{ q : q.state == marked-for-review }|`

and `answeredCount + unansweredCount + markedCount = N`.

**Validates: Requirements 16.6, 16.7**

---

### Property 17: Submit confirmation dialog counts match in-memory state

*For any* in-memory answer map and mark-for-review set at the moment the Submit Confirmation dialog opens, the dialog shall display counts such that:
- `answeredCount = |{ q : answers[q.id] !== null && answers[q.id] !== undefined }|`
- `unansweredCount = totalQuestions - answeredCount`
- `markedCount = markedForReview.size`

**Validates: Requirements 17.1**

---

### Property 18: Violation submission rejected for non-in_progress attempts

*For any* attempt whose status is not `in_progress`, a `POST /api/violations` request targeting that attempt shall be rejected with a 4xx response, and no violation document shall be written to Firestore. Any existing violation records for that attempt shall remain unchanged.

**Validates: Requirements 11.3**

---

### Property 19: Autosave is idempotent

*For any* answer map state `A`, sending the same `POST /api/attempts/:id/answers` payload twice shall produce the same final server-side answer state as sending it once. The second call shall succeed (200) and not create duplicate answer documents — it shall overwrite the first with the same values.

**Validates: Requirements 15.3**

---

## Testing Strategy

### Dual Testing Approach

Property-based tests verify universal invariants across all valid inputs. Unit tests verify specific examples, edge cases, and error conditions. Both are required.

### Property-Based Testing Library

Use **fast-check** (`fast-check` npm package) for both frontend (TypeScript/Vitest) and any backend property tests (TypeScript/Jest or Vitest).

Each property test must run a minimum of **100 iterations** (fast-check default is 100; do not reduce it). Tag each test with a comment referencing the design property:

```typescript
// Feature: exam-lobby-admin-panel, Property 1: Exam timer formatted as HH:MM:SS
fc.assert(fc.property(fc.nat(), (ms) => {
  const result = formatTimeHHMMSS(ms);
  return /^\d{2}:\d{2}:\d{2}$/.test(result);
}));
```

Tag format: **`Feature: exam-lobby-admin-panel, Property {N}: {property_title}`**

### Property Tests to Implement

| Property | Test target | Module |
|---|---|---|
| 1 — HH:MM:SS formatting | `formatTimeHHMMSS(ms)` pure function | `frontend/lib/utils/time.ts` |
| 2 — Timer drift | Timer hook with mocked `Date.now()` | `frontend/hooks/useExamTimer.ts` |
| 3 — Timer color state | `timerColorState(remainingMs)` pure function | `frontend/lib/utils/time.ts` |
| 4 — Entry form field validation | `validateLobbyEntry(username, code)` | `frontend/lib/utils/validation.ts` |
| 5 — Checkbox gates Start Exam | `allAcknowledged(checkboxStates)` | `frontend/lib/utils/lobby.ts` |
| 6 — Test metadata rendering | Lobby component render | Component test |
| 7 — Grade computation invariants | `gradeAttempt(questions, answers)` | `backend/src/services/gradingService.ts` |
| 8 — Percentage score formula | `computePercentage(score, totalMarks)` | `frontend/lib/utils/scores.ts` |
| 9 — Duration range validation | `validateDuration(d)` | `frontend/lib/utils/validation.ts` |
| 10 — Question import all-or-nothing | `validateImportPayload(questions)` | `backend/src/validators/testValidator.ts` |
| 11 — Status transition function | `nextStatuses(status)` | `frontend/app/admin/tests/page.tsx` → extract to `frontend/lib/utils/testStatus.ts` |
| 12 — Filter invariant | `filterItems(items, criterion)` | `frontend/lib/utils/filter.ts` |
| 13 — Sort descending | `sortAttemptsByScore(attempts)` | `frontend/lib/utils/sort.ts` |
| 14 — Mark-for-review toggle round-trip | `toggleReview(state)` | `frontend/lib/utils/exam.ts` |
| 15 — Nav panel state priority | `questionNavState(flags)` | `frontend/lib/utils/exam.ts` |
| 16 — Summary row count consistency | `computeSummary(questions)` | `frontend/lib/utils/exam.ts` |
| 17 — Dialog counts match state | `computeDialogCounts(answers, marked)` | `frontend/lib/utils/exam.ts` |
| 18 — Violation rejected for non-in_progress | `POST /api/violations` handler | `backend/src/controllers/violationController.ts` |
| 19 — Autosave idempotency | `upsertAnswers()` service | `backend/src/services/attemptService.ts` |

### Unit Tests

Unit tests should cover:
- Specific examples that demonstrate correct behavior (e.g., `formatTimeHHMMSS(0)` → `"00:00:00"`, `formatTimeHHMMSS(3661000)` → `"01:01:01"`)
- Integration points between the LobbyScreen polling state machine and its rendered output
- Error conditions: network failure in lobby polling, autosave failure, violation submission failure, force-submit failure
- Boundary values: 0 questions, 500 questions, duration=5, duration=300, marks=0.5, marks=100
- Mobile layout assertions: FixedActionBar present on mobile, sidebar present on desktop

### Integration Tests (1–3 examples each)

- End-to-end lobby polling: server returns `waiting` → `ready` → navigate to exam
- End-to-end exam submission with grading
- Admin force-submit flow
- Audit log written on `EXAM_STARTED` and `EXAM_SUBMITTED`
- Violation document persisted on `POST /api/violations`

### Accessibility Tests

- All interactive elements pass automated axe-core checks
- Keyboard navigation through exam screen (Tab order, digit keys, arrow keys)
- ARIA roles on radio buttons: `role="radio"`, correct `aria-checked`
- Screen reader live region announcements on answer change
- Focus trap in BottomSheet and SubmitConfirmationDialog
- Visible focus indicators with ≥3:1 contrast ratio against adjacent background
