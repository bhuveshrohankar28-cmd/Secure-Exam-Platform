# Requirements Document

## Introduction

This feature covers three interconnected areas of the Secure Exam Platform, designed mobile-first. All screens are designed for mobile viewports (≤767px) as the baseline, with progressive enhancements for desktop (≥768px).

1. **Student Exam Lobby** — A simplified entry flow where a student provides only their Username/ID and a Test Code, then lands in a lobby screen that displays test guidelines, security rules, a live countdown timer, and real-time waiting states based on test status.

2. **Admin Panel — Test Creation & Management** — An improved admin interface for creating tests with all metadata, importing questions, managing test status lifecycle, and storing all data in Firebase Firestore with a unique Test Code.

3. **Score, Identity & Violations Tracking** — Server-side storage of student scores, identity information, and browser-based violations, reflected in structured admin dashboard views so admins can monitor live exam activity and review results after completion.

The backend already provides the API surface for most of these capabilities. This feature focuses on the frontend pages and any missing backend endpoints needed to complete the experience.

---

## Glossary

- **Student**: A user with `role: "student"` who takes exams.
- **Admin**: A user with `role: "admin"` or `role: "superadmin"` who manages the platform.
- **Lobby**: The waiting/entry screen a student sees after entering a Test Code, before the exam begins.
- **Test_Code**: A short alphanumeric code that uniquely identifies a test for student entry (the `testCode` field on a Test document).
- **Test**: An examination document stored in the `tests` Firestore collection.
- **Attempt**: A record in `testAttempts` created when a student starts a test.
- **Violation**: A browser-integrity event recorded in the `violations` Firestore collection, linked to an Attempt.
- **Lobby_State**: One of five states returned by `GET /api/tests/code/:code` — `waiting`, `ready`, `in_progress`, `finished`, or `ended`.
- **Countdown_Timer**: A client-side countdown that renders time remaining until the exam starts (when `waiting`) or time remaining in the exam (when `in_progress`).
- **Answer**: A student's selected option for a question, stored in the `answers` Firestore collection.
- **Grading_Service**: The server-side module that computes score from questions and answers.
- **AuditLog**: An immutable record in the `auditLogs` Firestore collection.
- **Test_Status**: One of `draft`, `scheduled`, `active`, `completed`, `archived`.
- **Violation_Service**: The backend module responsible for writing Violation documents to Firestore.
- **Dashboard**: The admin overview page showing live exam activity, user stats, and result summaries.
- **Mobile_Viewport**: A device viewport with a CSS width of 767px or fewer.
- **Desktop_Viewport**: A device viewport with a CSS width of 768px or greater.
- **Touch_Target**: A tappable UI element; the minimum touch target size is 44×44 CSS pixels per WCAG 2.5.5.
- **Bottom_Sheet**: A panel that slides up from the bottom of the screen, used as a mobile-friendly alternative to modals and sidebars.
- **FAB**: Floating Action Button — a circular button fixed to the bottom-right of the viewport used to trigger the Question_Nav_Panel on mobile.
- **Fixed_Action_Bar**: A bar fixed to the bottom of the viewport on mobile that holds the Previous, Next/Submit, and Mark for Review buttons.

---

## Requirements

### Requirement 1: Student Lobby Entry

**User Story:** As a student, I want to enter my Username/ID and a Test Code on a single entry form, so that I can access the exam lobby without needing to navigate multiple pages.

#### Acceptance Criteria

1. THE Lobby_Entry_Form SHALL display one field for Username/ID (maximum 100 characters) and one field for Test Code (maximum 50 characters).
2. WHEN the student submits the Lobby_Entry_Form, THE Lobby_Entry_Form SHALL validate that both the Username/ID field and the Test Code field are non-empty before sending any server request.
3. IF the Username/ID field is empty when the student submits the Lobby_Entry_Form, THEN THE Lobby_Entry_Form SHALL display a validation error adjacent to the Username/ID field indicating the field is required, and the other field's value SHALL be retained.
4. IF the Test Code field is empty when the student submits the Lobby_Entry_Form, THEN THE Lobby_Entry_Form SHALL display a validation error adjacent to the Test Code field indicating the field is required, and the other field's value SHALL be retained.
5. WHEN the student submits a valid Username/ID and Test Code, THE Lobby_Entry_Form SHALL first authenticate the student, and upon successful authentication SHALL look up the test by its Test Code and navigate to the Lobby screen.
6. IF the authentication request returns an invalid credentials or insufficient permissions response, THEN THE Lobby_Entry_Form SHALL display an error message indicating the credentials were rejected without navigating away, and all entered field values SHALL be retained.
7. IF the test lookup returns a not-found response after successful authentication, THEN THE Lobby_Entry_Form SHALL display an error message indicating the Test Code is invalid without navigating away, and all entered field values SHALL be retained.
8. WHILE an authentication or test-lookup request is in flight, THE Lobby_Entry_Form SHALL disable the submit button and display a loading indicator.
9. THE Lobby_Entry_Form SHALL reject any Username/ID exceeding 100 characters or any Test Code exceeding 50 characters by displaying a field-level validation error before sending any server request.
10. ON a Mobile_Viewport, THE Lobby_Entry_Form SHALL stack the Username/ID field above the Test Code field in a single column, each field occupying the full available width.
11. ON a Mobile_Viewport, THE Lobby_Entry_Form SHALL render the submit button at full width below the Test Code field with a minimum height of 44 CSS pixels.
12. ALL interactive form elements in THE Lobby_Entry_Form SHALL have a minimum Touch_Target size of 44×44 CSS pixels.

---

### Requirement 2: Lobby Screen — Test Guidelines and Security Rules

**User Story:** As a student, I want to see the test guidelines and security rules clearly before my exam begins, so that I understand what is expected of me and what actions are prohibited.

#### Acceptance Criteria

1. WHEN a student reaches the Lobby screen, THE Lobby_Screen SHALL display the test title (maximum 200 characters), description (maximum 1000 characters), total marks, question count, and duration in minutes.
2. THE Lobby_Screen SHALL display a Security Rules section listing every prohibited action: tab switching, window switching, copy attempts, paste attempts, right-click context menu, restricted keyboard shortcuts, fullscreen exit, and screen visibility changes.
3. THE Lobby_Screen SHALL display a Guidelines section describing the exam format (MCQ), number of questions, marks per question, and the no-negative-marking policy.
4. WHILE the Lobby_State is `waiting` or `ready`, THE Lobby_Screen SHALL display the security rules and guidelines each as a separate acknowledgment checkbox, with the Start Exam button disabled until all checkboxes are checked.
5. WHEN the student checks all acknowledgment checkboxes, THE Lobby_Screen SHALL enable the Start Exam button within 100 milliseconds.
6. IF the student unchecks any acknowledgment checkbox after the Start Exam button is enabled, THEN THE Lobby_Screen SHALL disable the Start Exam button within 100 milliseconds.
7. IF the Lobby_Screen fails to load test metadata (title, description, total marks, question count, or duration), THEN THE Lobby_Screen SHALL display an error message indicating the data could not be retrieved and SHALL NOT render the acknowledgment checkboxes or the Start Exam button.
8. ON a Mobile_Viewport, THE Lobby_Screen SHALL render the test metadata and acknowledgment checklist in a vertically scrollable single-column layout.
9. ON a Mobile_Viewport, THE Lobby_Screen SHALL render the Start Exam button in a Fixed_Action_Bar pinned to the bottom of the viewport, so the button remains reachable without the student needing to scroll to the bottom of the checklist.
10. THE Start Exam button in the Fixed_Action_Bar SHALL span the full width of the Fixed_Action_Bar and SHALL have a minimum height of 44 CSS pixels.
11. ALL acknowledgment checkboxes SHALL have a minimum Touch_Target size of 44×44 CSS pixels.

---

### Requirement 3: Lobby Screen — Waiting State

**User Story:** As a student, I want to see a clear waiting state with live status when my test has not yet been activated by the admin, so that I know the exam will start soon without needing to refresh manually.

#### Acceptance Criteria

1. WHILE the Lobby_State is `waiting`, THE Lobby_Screen SHALL display a message indicating that the admin has not yet started the test.
2. WHILE the Lobby_State is `waiting`, THE Lobby_Screen SHALL poll `GET /api/tests/code/:code` at an interval of exactly 10 seconds between the completion of one response and the initiation of the next request.
3. WHILE the Lobby_State is `waiting`, IF the poll request fails to receive a response within 15 seconds, THEN THE Lobby_Screen SHALL retry the request and display a connection status indicator showing that connectivity is degraded.
4. WHEN the Lobby_State transitions from `waiting` to `ready` during polling, THE Lobby_Screen SHALL update the display to the ready state without a full page reload within 2 seconds of receiving the `ready` status in the poll response.
5. WHILE the Lobby_State is `waiting`, THE Lobby_Screen SHALL display the student's full name and the test name as returned by the most recent successful poll response.
6. IF the Lobby_State is `ended`, THEN THE Lobby_Screen SHALL display a message indicating the exam session is closed and is no longer accepting participants, and THE Lobby_Screen SHALL stop all active polling.
7. ON a Mobile_Viewport, THE Lobby_Screen SHALL display the student's full name and the test name stacked vertically and centered horizontally within the waiting state view.

---

### Requirement 4: Lobby Screen — Countdown Timer

**User Story:** As a student, I want to see a live countdown timer in the lobby and during the exam, so that I can manage my time effectively.

#### Acceptance Criteria

1. WHILE the Lobby_State is `in_progress`, THE Lobby_Screen SHALL display a countdown timer showing the time remaining until `attempt.endsAt`, formatted as `HH:MM:SS`.
2. THE Countdown_Timer SHALL update every second without requiring a page reload, with a maximum drift of 1 second from the server-authoritative `attempt.endsAt` timestamp.
3. WHEN the Countdown_Timer reaches zero, THE Lobby_Screen SHALL disable all answer input fields within 1 second of reaching zero.
4. WHEN the Countdown_Timer reaches zero, THE Lobby_Screen SHALL display a message indicating that the time has expired.
5. WHEN the Countdown_Timer reaches zero and the attempt status is `in_progress`, THE Lobby_Screen SHALL automatically submit the attempt.
6. IF the automatic submission request fails, THEN THE Lobby_Screen SHALL retry the submission up to 3 times at 2-second intervals before displaying an error message indicating that submission failed and instructing the student to contact their examiner.
7. IF the attempt status is not `in_progress` at the time the Countdown_Timer reaches zero, THEN THE Lobby_Screen SHALL NOT send an automatic submission request.
8. WHILE the Countdown_Timer shows 300 seconds or less remaining, THE Lobby_Screen SHALL render the timer text in a color visually distinct from its default display color.
9. WHILE the Lobby_State is `ready` and the test has a scheduled start time, THE Countdown_Timer SHALL display the time remaining until that scheduled start time, formatted as `HH:MM:SS`.
10. ON a Mobile_Viewport, THE Countdown_Timer SHALL be rendered inside a sticky bar pinned to the top of the viewport so that it remains visible at all times without the student needing to scroll.
11. ON a Desktop_Viewport, THE Countdown_Timer MAY use fixed positioning anywhere in the viewport provided it remains continuously visible during scroll.

---

### Requirement 5: Lobby Screen — Restricted State

**User Story:** As a student, I want a clear message when my access to a test is restricted or revoked, so that I understand why I cannot proceed and who to contact.

#### Acceptance Criteria

1. IF the Lobby_State lookup returns a 403 status and the student's account `isAllowed` field is not `false`, THEN THE Lobby_Screen SHALL display a message indicating the student does not have access to the test and should contact their examiner.
2. IF the student's account `isAllowed` field is `false`, THEN THE Lobby_Screen SHALL display a message indicating the student's account has been disabled and should contact their examiner, regardless of the Lobby_State lookup status.
3. WHILE the Lobby_State is `finished` and the completed attempt data is available, THE Lobby_Screen SHALL display the student's score, total marks, correct answer count, and answered question count from the completed attempt.
4. IF the Lobby_State is `finished` and the completed attempt data cannot be retrieved, THEN THE Lobby_Screen SHALL display an error message indicating that the results could not be loaded.

---

### Requirement 6: Admin Panel — Test Creation Form

**User Story:** As an admin, I want a form to create a new test with all required metadata, so that the test is stored in Firebase with a unique Test Code immediately upon creation.

#### Acceptance Criteria

1. THE Test_Creation_Form SHALL include fields for: test title (required, 1–120 characters), description (required, 1–500 characters), and duration in minutes (required, integer between 5 and 300).
2. WHEN an admin submits a valid Test_Creation_Form, THE Test_Creation_Form SHALL call `POST /api/tests` and, upon receiving a success response, display the returned test data including its auto-generated Test Code.
3. WHEN a test is created successfully, THE Admin_Panel SHALL navigate to the test detail page for the newly created test within 1 second of receiving the success response.
4. IF any required field is empty when the admin submits the Test_Creation_Form, THEN THE Test_Creation_Form SHALL display a validation error message adjacent to each empty field without submitting the request.
5. IF the duration value is not an integer between 5 and 300, THEN THE Test_Creation_Form SHALL display the error "Duration must be between 5 and 300 minutes."
6. THE Admin_Panel SHALL display the Test Code on the test detail page in a visually distinct element with a copy button that, when clicked, copies the Test Code to the clipboard and displays a confirmation indicator for 2 seconds.
7. WHEN an admin clicks the regenerate code button on a test detail page, THE Admin_Panel SHALL call `POST /api/tests/:id/regenerate-code` and, upon receiving a success response, replace the displayed Test Code with the new Test Code.
8. IF the `POST /api/tests` call fails, THEN THE Test_Creation_Form SHALL display an error message indicating the test could not be created and keep all entered field values intact.
9. IF the `POST /api/tests/:id/regenerate-code` call fails, THEN THE Admin_Panel SHALL display an error message indicating the code could not be regenerated and keep the existing Test Code displayed.
10. ON a Mobile_Viewport, THE Test_Creation_Form SHALL render all fields in a single-column layout, each field occupying the full available width.
11. ON a Mobile_Viewport, THE Test_Creation_Form submit button SHALL be full-width with a minimum height of 44 CSS pixels.
12. ALL interactive form elements in THE Test_Creation_Form SHALL have a minimum Touch_Target size of 44×44 CSS pixels.

---

### Requirement 7: Admin Panel — Question Import

**User Story:** As an admin, I want to import questions into a test in bulk via JSON, so that I can set up a complete MCQ exam quickly.

#### Acceptance Criteria

1. THE Question_Import_Form SHALL accept a JSON payload conforming to `{ "mode": "append" | "replace", "questions": [...] }` where each question has `text` (1–1000 characters), `options` (array of exactly 4 non-empty strings, each 1–500 characters), `correctOptionIndex` (integer 0–3), and optional `marks` (positive number in range 0.5–100, default 1).
2. WHEN an admin submits a valid Question_Import_Form, THE Question_Import_Form SHALL call `POST /api/tests/:id/questions/import` and display the count of questions added and the updated total marks within 5 seconds of receiving a successful response.
3. IF the import payload contains any invalid question, THEN THE Question_Import_Form SHALL reject the entire import without storing any questions, and SHALL display each validation error indicating the 1-based question index and the specific field that failed validation.
4. IF the import payload contains a `questions` array exceeding 500 entries, THEN THE Question_Import_Form SHALL reject the payload and display an error indicating the maximum allowed count of 500 questions per import.
5. WHILE the test status is `draft` or `scheduled`, THE Question_Import_Form SHALL be accessible to the admin.
6. IF the test status is not `draft` or `scheduled`, THEN THE Question_Import_Form SHALL display the message "Questions cannot be modified once a test is active." and disable the import action.
7. THE Admin_Panel SHALL display the current question count and total marks on the test detail page, updating immediately after a successful import without requiring a full page reload.

---

### Requirement 8: Admin Panel — Test Status Lifecycle

**User Story:** As an admin, I want to manage the full lifecycle of a test through explicit status transitions, so that students see the test only when it is ready and the data is protected after completion.

#### Acceptance Criteria

1. THE Test_Detail_Page SHALL display the current test status and the set of allowed next statuses based on the transition rules: `draft` → `scheduled` or `active` or `archived`; `scheduled` → `draft` or `active` or `archived`; `active` → `completed`; `completed` → `archived`.
2. WHEN an admin selects an allowed status transition and confirms, THE Test_Detail_Page SHALL call `PUT /api/tests/:id` with the new status and update the displayed status on success.
3. IF the `PUT /api/tests/:id` call fails, THEN THE Test_Detail_Page SHALL display an error message indicating the status change failed and SHALL retain the previously displayed status without modification.
4. IF an admin attempts to activate a test with zero questions, THEN THE Test_Detail_Page SHALL display an error message indicating that questions must be imported before activation and SHALL NOT submit the status change request.
5. WHILE a test status is `active`, THE Test_Detail_Page SHALL display a live participant count showing the number of attempts with status `in_progress`, refreshed at intervals of no greater than 30 seconds.
6. THE Test_Detail_Page SHALL display a delete button only when the test status is `draft`, `scheduled`, or `archived`.
7. WHEN an admin confirms test deletion, THE Test_Detail_Page SHALL call `DELETE /api/tests/:id` and navigate back to the tests list on success.
8. IF the `DELETE /api/tests/:id` call fails, THEN THE Test_Detail_Page SHALL display an error message indicating the deletion failed and SHALL NOT navigate away from the current page.

---

### Requirement 9: Admin Panel — Test List View

**User Story:** As an admin, I want a list view of all tests with their key metadata and status, so that I can quickly find and manage any test.

#### Acceptance Criteria

1. THE Admin_Tests_List SHALL display each test with: title (maximum 200 characters), Test Code, status (one of: Draft, Active, Closed), question count, total marks, duration in minutes, and creation date in ISO 8601 format (YYYY-MM-DD).
2. WHEN the Admin_Tests_List loads, THE Admin_Tests_List SHALL populate the status filter dropdown with all distinct status values present across tests, plus an "All" option selected by default.
3. WHEN an admin selects a status value from the filter dropdown, THE Admin_Tests_List SHALL display only the tests whose status matches the selected value within 500 milliseconds.
4. WHEN an admin taps or clicks a test entry in the Admin_Tests_List, THE Admin_Panel SHALL navigate to the test detail page for that test within 500 milliseconds.
5. IF no tests match the current filter selection, THEN THE Admin_Tests_List SHALL display the message "No tests found" in place of the test list entries.
6. WHEN a new test is created, THE Admin_Tests_List SHALL append the new test entry to the list without requiring a full page reload, preserving the current filter selection and scroll position.
7. ON a Mobile_Viewport, THE Admin_Tests_List SHALL render each test as a card in a single-column vertical list, showing all required metadata fields stacked within the card.
8. ON a Desktop_Viewport, THE Admin_Tests_List MAY render tests in a multi-column table layout.
9. ALL test entry cards and rows in THE Admin_Tests_List SHALL have a minimum Touch_Target height of 44 CSS pixels.

---

### Requirement 10: Score Storage and Display

**User Story:** As an admin, I want each student's score, identity, and attempt metadata stored automatically after submission and visible in the admin dashboard, so that I can review results after the exam.

#### Acceptance Criteria

1. WHEN an attempt is graded by the Grading_Service, THE Grading_Service SHALL persist `score`, `totalMarks`, `correctCount`, `answeredCount`, `submittedAt`, and `gradedAt` on the TestAttempt document in Firestore within 5 seconds of grading completion.
2. IF the Grading_Service fails to persist any of the required fields to Firestore, THEN THE Grading_Service SHALL retain the attempt in its previous state without partial writes and surface an error indicating that score persistence failed.
3. THE Admin_Attempts_View SHALL display each attempt with: student username, student name, test title, score, total marks, correct count, answered count, submission time, and attempt status.
4. THE Admin_Attempts_View SHALL support filtering attempts by test and by attempt status (`in_progress`, `submitted`, `graded`, `force_submitted`), with the filtered results reflecting the applied filter within 3 seconds of the filter being selected.
5. WHEN an admin selects an attempt in the Admin_Attempts_View, THE Admin_Panel SHALL display the per-question breakdown showing the student's selected option and whether it was correct for each question in the attempt.
6. THE Admin_Attempts_View SHALL display a percentage score computed as `(score / totalMarks) * 100`, rounded to one decimal place, and SHALL display `0.0` when `totalMarks` is zero.
7. THE Admin_Attempts_View SHALL support sorting attempts by score descending, scoped to a single selected test, to produce a ranked leaderboard, with results reflecting the new sort order within 3 seconds of the sort action.
8. ON a Mobile_Viewport, THE Admin_Attempts_View SHALL render each attempt as a card in a single-column vertical list rather than a horizontal scrolling table.
9. ALL attempt cards and interactive rows in THE Admin_Attempts_View SHALL have a minimum Touch_Target height of 44 CSS pixels.

---

### Requirement 11: Violation Recording

**User Story:** As an admin, I want browser-integrity violations logged per attempt with the violation type, timestamp, and context metadata, so that I can identify suspicious behavior during and after an exam.

#### Acceptance Criteria

1. WHEN a student triggers a browser violation event during an active attempt, THE Exam_Client SHALL send a violation record to the Violation_Service containing: `attemptId`, `userId`, `type` (one of `tab_switch`, `window_blur`, `visibility_hidden`, `fullscreen_exit`, `copy_attempt`, `paste_attempt`, `context_menu`, `keyboard_shortcut`), and optional `metadata` with a maximum payload size of 10 KB.
2. THE Violation_Service SHALL persist each violation as a document in the `violations` Firestore collection with a server-assigned ISO 8601 UTC timestamp, within 2 seconds of receiving the submission request.
3. THE Violation_Service SHALL accept violation submissions only for attempts whose status is `in_progress` and SHALL return an error response indicating the attempt is not in progress for any violation submitted against a non-in_progress attempt, leaving any existing violation records unchanged.
4. THE Exam_Client SHALL detect and report the following browser events as violations: `visibilitychange` to hidden, window `blur`, `copy` event, `paste` event, `contextmenu` event, fullscreen API exit, and restricted keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+Shift+I, F12, Alt+Tab).
5. WHILE the exam is active, THE Exam_Client SHALL enforce fullscreen mode and SHALL display a non-dismissible warning overlay when fullscreen is exited, requiring the student to re-enter fullscreen within 30 seconds before any answer input fields are re-enabled.
6. WHEN a violation is detected, THE Exam_Client SHALL display a non-dismissible warning overlay informing the student that the action has been recorded, and SHALL dismiss the overlay automatically after the student acknowledges it by clicking a single confirmation control with a minimum Touch_Target size of 44×44 CSS pixels.
7. IF the Violation_Service is unreachable when a violation record is submitted, THEN THE Exam_Client SHALL queue the violation record locally and SHALL reattempt submission at intervals of 5 seconds for a maximum of 3 retry attempts, discarding the record if all retries fail.

---

### Requirement 12: Violation Display in Admin Dashboard

**User Story:** As an admin, I want to see each student's violation count and violation details per attempt, so that I can assess exam integrity for individual students.

#### Acceptance Criteria

1. THE Admin_Attempts_View SHALL display a violation count badge next to each attempt, showing the total number of violations recorded.
2. WHEN an admin selects an attempt to view its violation details, THE Admin_Panel SHALL display each recorded violation with its type, timestamp, and any available contextual details; IF the attempt has zero recorded violations, THEN THE Admin_Panel SHALL display a message indicating no violations were recorded for that attempt.
3. THE Admin_Attempts_View SHALL render the violation count badge differently for attempts with zero violations versus attempts with one or more violations, such that the two states are distinguishable without relying solely on the numeric value (e.g., using a distinct color or icon).
4. THE Admin_Dashboard SHALL display a summary card for each test in `active` status showing: total participants, count of participants with at least one violation, and average score rounded to two decimal places.
5. WHILE at least one test is in `active` status, THE Admin_Dashboard SHALL refresh the summary card data from the server every 30 seconds.
6. WHEN the Exam_Client records a violation event for an attempt, THE Violation_Service SHALL persist the violation — including its type, timestamp, and contextual details — and make it visible in the Admin_Attempts_View within the next refresh cycle.
7. THE Violation_Service SHALL record an audit log entry for every persisted violation, capturing the violation type, affected attempt identifier, and timestamp, such that the audit log reflects all violations recorded during an exam session.
8. ON a Mobile_Viewport, THE Admin_Dashboard SHALL render each active-test summary card as a full-width card in a single-column vertical list.
9. ON a Mobile_Viewport, THE Admin_Panel SHALL render each violation detail row as a card rather than a table row, with all fields visible without horizontal scrolling.

---

### Requirement 13: Live Participant Monitoring

**User Story:** As an admin, I want to see a live list of students currently taking an exam, so that I can monitor exam activity in real time.

#### Acceptance Criteria

1. WHILE a test status is `active`, THE Admin_Test_Monitor_View SHALL display each in-progress attempt with: student username, student name, answered question count, violation count, and time remaining displayed as a countdown in MM:SS format.
2. WHILE a test status is `active`, THE Admin_Test_Monitor_View SHALL automatically refresh the participant list every 15 seconds.
3. WHEN an in-progress attempt transitions to `graded` or `force_submitted` during a refresh, THE Admin_Test_Monitor_View SHALL move that student's row from the active list to a completed list without a full page reload.
4. WHEN the Admin selects the "Force Submit" action on an in-progress attempt row, THE Admin_Test_Monitor_View SHALL prompt the Admin for confirmation before submitting the attempt on the student's behalf.
5. WHEN the Admin confirms the force-submit action, THE Admin_Test_Monitor_View SHALL submit the attempt and update the attempt row to reflect the `force_submitted` status and display the score as points earned out of total possible points.
6. IF the force-submit action fails, THEN THE Admin_Test_Monitor_View SHALL display an error message indicating the submission could not be completed and retain the attempt row in its previous state.
7. IF a scheduled participant list refresh fails, THEN THE Admin_Test_Monitor_View SHALL display an error message indicating the data could not be refreshed and continue attempting subsequent refreshes at the 15-second interval.
8. ON a Mobile_Viewport, THE Admin_Test_Monitor_View SHALL render each participant as a card in a single-column vertically scrolling list with no horizontal overflow.
9. THE Force Submit action button SHALL have a minimum Touch_Target size of 44×44 CSS pixels on all viewports.
10. ON a Mobile_Viewport, THE Admin_Test_Monitor_View SHALL NOT use horizontal-scroll tables; all participant data SHALL be visible within the card layout without horizontal scrolling.

---

### Requirement 14: Audit Logging

**User Story:** As an admin, I want critical exam actions automatically recorded in an immutable audit log, so that there is a traceable record for compliance and dispute resolution.

#### Acceptance Criteria

1. WHEN a student starts an attempt, THE Attempt_Service SHALL write an `EXAM_STARTED` AuditLog entry containing `userId`, `attemptId`, `testId`, and a server-generated UTC timestamp accurate to the millisecond.
2. WHEN an attempt is submitted or auto-submitted on timer expiry, THE Attempt_Service SHALL write an `EXAM_SUBMITTED` AuditLog entry containing `userId`, `attemptId`, `score`, `totalMarks`, and a server-generated UTC timestamp accurate to the millisecond.
3. WHEN an attempt is force-submitted by an admin, THE Attempt_Service SHALL write an `EXAM_FORCE_SUBMITTED` AuditLog entry containing the admin's `userId`, the student's `userId`, the student's `attemptId`, and a server-generated UTC timestamp accurate to the millisecond.
4. WHEN an admin grants test access to a student, THE TestAccess_Service SHALL write a `TEST_ACCESS_GRANTED` AuditLog entry containing `grantedBy`, `userId`, `testId`, and a server-generated UTC timestamp accurate to the millisecond.
5. WHEN an admin revokes test access, THE TestAccess_Service SHALL write a `TEST_ACCESS_REVOKED` AuditLog entry containing `revokedBy`, `userId`, `testId`, and a server-generated UTC timestamp accurate to the millisecond.
6. THE AuditLog documents in Firestore SHALL be append-only; no backend endpoint SHALL permit modification or deletion of AuditLog records.
7. IF writing an AuditLog entry fails, THEN THE system SHALL reject the triggering operation with an error indicating audit failure and leave the associated resource state unchanged.
8. WHEN an admin queries the audit log, THE system SHALL return AuditLog entries filtered by at least one of `userId`, `testId`, or `attemptId`, returning a maximum of 500 entries per request ordered by timestamp ascending.

---

### Requirement 15: Exam Question View

**User Story:** As a student, I want to see one question at a time with its options and navigation buttons, so that I can read and answer each question clearly without distraction.

#### Acceptance Criteria

1. WHEN an active attempt is loaded, THE Exam_Screen SHALL display the current question's 1-based index, total question count, question text, and exactly 4 selectable answer options.
2. THE Exam_Screen SHALL display a Previous button, a Next button, and a Mark for Review button persistently available for the entire duration of the attempt.
3. WHEN a student selects an answer option, THE Exam_Screen SHALL display the selected option in a visually distinct selected state, different from the unselected state of all other options, and persist the selection to the server via the autosave endpoint within 3 seconds.
4. WHEN a student activates the Next button and the current question is not the last question, THE Exam_Screen SHALL advance to the next question within 200 milliseconds without a page reload.
5. WHEN a student activates the Previous button and the current question is not the first question, THE Exam_Screen SHALL navigate to the previous question within 200 milliseconds without a page reload.
6. IF the current question is the first question, THEN THE Exam_Screen SHALL disable the Previous button.
7. IF the current question is the last question, THEN THE Exam_Screen SHALL replace the Next button with a Submit Exam button.
8. WHEN a student returns to a question that already has a saved answer, THE Exam_Screen SHALL pre-select the option corresponding to the most recently selected in-memory selection state during the current attempt.
9. IF the autosave request fails, THEN THE Exam_Screen SHALL display a non-blocking inline error indicator adjacent to the answer options indicating that the answer could not be saved, SHALL retry once after 3 seconds, and if the retry also fails, SHALL retain the error indicator and preserve the in-memory selection state.
10. THE Exam_Screen SHALL render only the current question in the DOM at any time; all other questions SHALL NOT be rendered in the DOM.
11. WHEN a student activates the Mark for Review button, THE Exam_Screen SHALL toggle the marked-for-review state of the current question and update the Mark for Review button's appearance to reflect the new state within 200 milliseconds.
12. ON a Mobile_Viewport, THE Exam_Screen SHALL render the Previous, Next/Submit, and Mark for Review buttons inside a Fixed_Action_Bar pinned to the bottom of the viewport, so the buttons are always reachable without scrolling.
13. ON a Mobile_Viewport, each answer option SHALL be rendered as a full-width card with a minimum height of 48 CSS pixels and a minimum Touch_Target height of 44 CSS pixels.
14. ON a Desktop_Viewport, the action buttons MAY appear inline below the question content or in a fixed sidebar, provided they are always visible.
15. ALL interactive elements in THE Exam_Screen SHALL have a minimum Touch_Target size of 44×44 CSS pixels on all viewports.

---

### Requirement 16: Question Navigation Panel

**User Story:** As a student, I want a panel showing all question numbers with color-coded states, so that I can see my progress at a glance and jump directly to any question.

#### Acceptance Criteria

1. THE Question_Nav_Panel SHALL display a numbered button for every question in the attempt, ordered by question index from 1 to N, where N is the total number of questions in the attempt and does not exceed 200.
2. THE Question_Nav_Panel SHALL render each question button in exactly one of four states — answered (an option has been selected), unanswered (no option selected), marked-for-review (the student flagged the question), and current (the question currently displayed) — where each state is represented by a unique combination of background fill, border style, and icon, such that the states are distinguishable without relying on color alone.
3. WHEN a question has more than one applicable state simultaneously, THE Question_Nav_Panel SHALL display the button using the highest-priority state according to the following precedence order: current (highest), then marked-for-review, then answered, then unanswered (lowest).
4. WHEN a student taps or clicks a question number button in THE Question_Nav_Panel, THE Exam_Screen SHALL navigate to that question within 200 milliseconds without a page reload.
5. WHEN the state of a question changes (answered, unanswered, or marked-for-review), THE Question_Nav_Panel SHALL update that question's button state within 200 milliseconds without a page reload.
6. THE Question_Nav_Panel SHALL display a summary row showing the total count of answered questions, unanswered questions, and questions marked for review.
7. WHEN the state of any question changes, THE Question_Nav_Panel SHALL update the summary row counts within 200 milliseconds without a page reload.
8. ON a Mobile_Viewport, THE Question_Nav_Panel SHALL be rendered as a Bottom_Sheet that is collapsed by default and opened by tapping a FAB positioned at the bottom-right of the viewport, above the Fixed_Action_Bar.
9. THE FAB SHALL display the answered/total count (e.g., "12/30") so the student can see their progress without opening the panel.
10. WHEN the student taps the FAB, THE Question_Nav_Panel Bottom_Sheet SHALL slide up and display all question number buttons without obscuring the Fixed_Action_Bar.
11. ON a Desktop_Viewport, THE Question_Nav_Panel SHALL be rendered as a persistent sidebar visible alongside the question content without requiring any toggle action.
12. ALL question number buttons in THE Question_Nav_Panel SHALL have a minimum Touch_Target size of 44×44 CSS pixels.
13. THE FAB SHALL have a minimum Touch_Target size of 44×44 CSS pixels.

---

### Requirement 17: Submit Exam Confirmation

**User Story:** As a student, I want a confirmation dialog showing my attempt summary before I submit, so that I can review my progress and avoid accidental submission.

#### Acceptance Criteria

1. WHEN a student activates the Submit Exam button, THE Exam_Screen SHALL display a confirmation dialog — with the Confirm Submit button receiving initial focus — showing the count of answered questions, unanswered questions, and questions marked for review before any submission request is sent.
2. WHEN a student activates the Cancel button or presses the Escape key while THE Submit_Confirmation_Dialog is open, THE Submit_Confirmation_Dialog SHALL close and return focus to the Submit Exam button on the Exam_Screen, with all answer state and marked-for-review state unchanged.
3. WHEN the student activates the Confirm Submit button in THE Submit_Confirmation_Dialog, THE Exam_Screen SHALL submit the attempt and navigate to the Result_Screen on receiving a successful response.
4. WHILE the submission request is in flight after confirmation, THE Submit_Confirmation_Dialog SHALL disable both the Confirm Submit button and the Cancel button and display a loading indicator.
5. IF the submission request returns an HTTP 4xx or 5xx response, THEN THE Submit_Confirmation_Dialog SHALL display an error message indicating submission failed, re-enable the Confirm Submit and Cancel buttons, and retain all answer state.
6. IF the submission request fails and all retry attempts are exhausted, THEN THE Submit_Confirmation_Dialog SHALL close and THE Exam_Screen SHALL display a persistent error banner instructing the student to contact their examiner, while the Submit Exam button remains visible and active.
7. WHEN the Enter key is pressed and the Confirm Submit button has focus, THE Submit_Confirmation_Dialog SHALL trigger the Confirm Submit action; WHEN the Enter key is pressed and the Cancel button has focus, THE Submit_Confirmation_Dialog SHALL trigger the Cancel action.
8. ON a Mobile_Viewport, THE Submit_Confirmation_Dialog SHALL be rendered as a full-screen Bottom_Sheet that slides up from the bottom of the viewport rather than a centered overlay modal.
9. ON a Desktop_Viewport, THE Submit_Confirmation_Dialog SHALL be rendered as a centered modal overlay.
10. Both the Confirm Submit button and the Cancel button inside THE Submit_Confirmation_Dialog SHALL be full-width on a Mobile_Viewport and SHALL have a minimum height of 44 CSS pixels.

---

### Requirement 18: Mark for Review

**User Story:** As a student, I want to flag any question for review so that I can return to uncertain answers before submitting.

#### Acceptance Criteria

1. WHEN a student activates the Mark for Review button on a question, THE Exam_Screen SHALL toggle that question's review state: if the question is not marked for review it SHALL become marked for review, and if it is already marked for review it SHALL be unmarked.
2. WHEN a question is marked for review, THE Mark_For_Review_Button label SHALL change to indicate the question is marked, and the question's button in THE Question_Nav_Panel SHALL display a visually distinct appearance that differentiates the marked-for-review state from both the answered and unanswered states within 200 milliseconds.
3. WHEN a question is unmarked from review, THE Mark_For_Review_Button label SHALL revert to its default label, and the question's button in THE Question_Nav_Panel SHALL display the answered appearance if the question has a saved answer, or the unanswered appearance if it has no saved answer, within 200 milliseconds.
4. THE Exam_Screen SHALL allow a question to simultaneously hold a saved answer and be marked for review; the Question_Nav_Panel SHALL display such a question using the marked-for-review appearance to indicate the student wishes to revisit it.
5. THE Exam_Screen SHALL persist the review flag state in client-side memory for the duration of the attempt session; the review flag SHALL NOT be sent to the server as a graded field and SHALL reset if the page is reloaded.
6. THE Submit_Confirmation_Dialog SHALL display the count of questions marked for review, calculated from the in-memory review flags at the moment the dialog opens, so the student is aware of unreviewed flags before confirming final submission.

---

### Requirement 19: Persistent Exam Timer

**User Story:** As a student, I want a countdown timer always visible throughout the entire exam, so that I can manage my time without leaving the current question view.

#### Acceptance Criteria

1. WHILE an attempt status is `in_progress`, THE Exam_Screen SHALL display a countdown timer showing the time remaining until `attempt.endsAt`, formatted as `HH:MM:SS`, visible regardless of scroll position or which question is currently displayed.
2. THE Exam_Timer SHALL derive its initial value from the server-authoritative `remainingMs` field returned by the attempt endpoint and SHALL decrement using the client clock, with a maximum drift of 1 second from the server-authoritative `attempt.endsAt` timestamp.
3. WHILE the Exam_Timer shows 300 seconds or fewer remaining, THE Exam_Screen SHALL render the timer in a warning color with a contrast ratio of at least 3:1 against the default timer color, so that the visual change is objectively distinguishable.
4. WHILE the Exam_Timer shows 60 seconds or fewer remaining, THE Exam_Screen SHALL render the timer in a critical color that is visually distinct from both the default timer color and the 300-second warning color, each pair achieving a contrast ratio of at least 3:1 against one another.
5. WHEN the Exam_Timer reaches zero, THE Exam_Screen SHALL commit the currently selected answer for the displayed question to the attempt state and SHALL disable all answer option inputs and the Mark for Review button within 1 second, preventing any further answer changes.
6. WHEN the Exam_Timer reaches zero, THE Exam_Screen SHALL automatically trigger the submission flow without requiring any student interaction.
7. IF the page is reloaded during an active attempt, THE Exam_Screen SHALL re-fetch the remaining time from the server and resume the countdown from the corrected server-authoritative value within 2 seconds of the page becoming interactive.
8. IF the server re-fetch of remaining time fails during a page reload, THEN THE Exam_Screen SHALL resume the countdown from the last known client-side remaining value and SHALL display an error message indicating that the timer could not be synchronized with the server.
9. ON a Mobile_Viewport, THE Exam_Timer SHALL be displayed inside the sticky top bar so that it occupies a fixed position at the top of the viewport and remains visible as the student scrolls through answer options.
10. ON a Desktop_Viewport, THE Exam_Timer SHALL be displayed in a fixed-position element that does not scroll out of view.

---

### Requirement 20: Exam Interface Keyboard Accessibility

**User Story:** As a student, I want to navigate and answer the exam entirely using a keyboard, so that the exam is accessible to students who rely on keyboard navigation or assistive technologies.

#### Acceptance Criteria

1. THE Exam_Screen SHALL assign logical tab order to all interactive elements — answer options (1–4), the Mark for Review button, the Previous button, the Next or Submit Exam button, and the Question_Nav_Panel toggle — such that a single Tab key sequence traverses them in the listed order, and WHEN a student navigates to a new question, focus SHALL be placed on the first answer option.
2. WHEN a question is displayed, a physical keyboard is detected (CSS media feature `pointer: fine`), and focus is not inside a text input, THE Exam_Screen SHALL allow the student to select answer options using the digit keys 1, 2, 3, and 4 corresponding to options A, B, C, and D respectively.
3. WHEN an answer option has keyboard focus, THE Exam_Screen SHALL allow the student to move focus between options using the Up Arrow and Down Arrow keys, and SHALL select the focused option when the student presses the Space or Enter key.
4. WHEN a physical keyboard is detected (`pointer: fine`), the student presses the Right Arrow key or the N key (case-insensitive), and focus is not on an answer option and not inside a text input, THE Exam_Screen SHALL navigate to the next question if the current question is not the last question; IF the current question is the last question, the keypress SHALL have no effect.
5. WHEN a physical keyboard is detected (`pointer: fine`), the student presses the Left Arrow key or the P key (case-insensitive), and focus is not inside a text input, THE Exam_Screen SHALL navigate to the previous question, equivalent to activating the Previous button.
6. WHEN a physical keyboard is detected (`pointer: fine`), the student presses the R key (case-insensitive), and focus is not inside a text input, THE Exam_Screen SHALL toggle the Mark for Review state for the current question, equivalent to activating the Mark for Review button.
7. ALL interactive elements in THE Exam_Screen SHALL display a visible focus indicator that meets WCAG 2.1 Success Criterion 2.4.7: the focus indicator SHALL be a visible outline with a minimum area of 1 CSS pixel around the component's perimeter and a contrast ratio of at least 3:1 against the adjacent background color.
8. THE Exam_Screen SHALL be navigable using screen reader virtual cursor mode; all answer options SHALL have ARIA radio-button roles and labels that announce the option text, its 1-based position (e.g., "Option 1 of 4"), whether it is currently selected, and SHALL emit a live-region announcement when the selected answer changes.
9. IF a keyboard shortcut defined in Acceptance Criteria 2–6 conflicts with a browser-monitored violation shortcut defined in Requirement 11, THEN THE Exam_Screen SHALL give precedence to the exam navigation action and SHALL NOT record a violation for those specific keys.
10. ON a device where only a touch input is detected (`pointer: coarse` and no physical keyboard), THE Exam_Screen SHALL NOT activate any keyboard navigation shortcuts defined in Acceptance Criteria 2–6, preventing false violation triggers on touch-only devices.
