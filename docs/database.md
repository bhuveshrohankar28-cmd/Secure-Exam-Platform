# Database Schema — Firestore Collections

This document describes all Firestore collections and their document structures.

See also: [`../backend/src/types/models.ts`](../backend/src/types/models.ts) for the canonical TypeScript interfaces.

---

## Collection: `users`

**Document ID:** Firebase Authentication UID

| Field                 | Type      | Description                            |
|-----------------------|-----------|----------------------------------------|
| `id`                  | string    | Firebase UID (same as document ID)     |
| `name`                | string    | Full name                              |
| `email`               | string    | Login email                            |
| `collegeEnrollmentNo` | string    | College enrollment number (unique)     |
| `collegeEmail`        | string    | Official college email                 |
| `branch`              | string    | Engineering branch                     |
| `domain`              | string    | Domain/specialization                  |
| `yearOfPassing`       | number    | Expected graduation year               |
| `phone`               | string    | Phone number                           |
| `role`                | string    | `student` / `admin` / `superadmin`     |
| `accountStatus`       | string    | `pending` / `active` / `rejected` / `blocked` |
| `lastSeen`            | string    | ISO timestamp — updated by heartbeat   |
| `createdAt`           | string    | ISO timestamp                          |
| `updatedAt`           | string    | ISO timestamp                          |

**Roles:**
- `student` — can take exams
- `admin` — can manage tests and users
- `superadmin` — full access including managing admins

**Account States:**
- `pending` — registered but not approved
- `active` — can use the platform
- `rejected` — rejected by admin
- `blocked` — temporarily blocked

---

## Collection: `tests`

**Document ID:** auto-generated

| Field         | Type   | Description                         |
|---------------|--------|-------------------------------------|
| `id`          | string | Document ID                         |
| `title`       | string | Test title                          |
| `description` | string | Description/instructions            |
| `duration`    | number | Duration in minutes                 |
| `totalMarks`  | number | Total marks                         |
| `status`      | string | See below                           |
| `createdBy`   | string | userId of admin who created it      |
| `createdAt`   | string | ISO timestamp                       |
| `updatedAt`   | string | ISO timestamp                       |

**Status flow:** `draft` → `scheduled` → `active` → `completed` → `archived`

---

## Collection: `questions`

**Document ID:** auto-generated

| Field                | Type     | Description                        |
|----------------------|----------|------------------------------------|
| `id`                 | string   | Document ID                        |
| `testId`             | string   | Parent test ID                     |
| `text`               | string   | Question text                      |
| `options`            | string[] | Array of 4 answer options          |
| `correctOptionIndex` | number   | Index of correct option (0–3). **NEVER sent to frontend during exam** |
| `marks`              | number   | Marks for this question            |
| `order`              | number   | Display order                      |
| `createdAt`          | string   | ISO timestamp                      |
| `updatedAt`          | string   | ISO timestamp                      |

> ⚠️ **Security:** `correctOptionIndex` must never be returned to students during an active exam. The backend enforces this.

---

## Collection: `testAccess`

**Document ID:** auto-generated

| Field       | Type   | Description                              |
|-------------|--------|------------------------------------------|
| `id`        | string | Document ID                              |
| `testId`    | string | Test being granted access to             |
| `userId`    | string | Student being granted access             |
| `status`    | string | `allowed` / `revoked` / `completed`      |
| `grantedAt` | string | ISO timestamp                            |
| `grantedBy` | string | userId of admin who granted access       |
| `revokedAt` | string | ISO timestamp (null if not revoked)      |

**Access Flow:**
1. Admin selects a test
2. Admin selects one or more students
3. Admin creates `testAccess` records with `status: "allowed"`
4. Students with `status: "allowed"` can see and start the test

---

## Collection: `testAttempts`

**Document ID:** auto-generated

| Field         | Type   | Description                              |
|---------------|--------|------------------------------------------|
| `id`          | string | Document ID                              |
| `testId`      | string | Which test                               |
| `userId`      | string | Which student                            |
| `status`      | string | `in_progress` / `submitted` / `graded` / `force_submitted` |
| `startedAt`   | string | ISO timestamp                            |
| `submittedAt` | string | ISO timestamp (null until submitted)     |
| `score`       | number | Final score (null until graded)          |
| `gradedAt`    | string | ISO timestamp (null until graded)        |

---

## Collection: `answers`

**Document ID:** auto-generated

| Field                | Type   | Description                          |
|----------------------|--------|--------------------------------------|
| `id`                 | string | Document ID                          |
| `attemptId`          | string | Parent attempt                       |
| `questionId`         | string | Which question                       |
| `userId`             | string | Which student                        |
| `selectedOptionIndex`| number | 0–3 (null if skipped)                |
| `answeredAt`         | string | ISO timestamp of last update         |

---

## Collection: `violations`

**Document ID:** auto-generated

| Field       | Type   | Description                              |
|-------------|--------|------------------------------------------|
| `id`        | string | Document ID                              |
| `attemptId` | string | Parent attempt                           |
| `userId`    | string | Student                                  |
| `type`      | string | `tab_switch` / `window_blur` / etc.      |
| `timestamp` | string | ISO timestamp                            |
| `metadata`  | object | Extra context (key pressed, URL, etc.)   |

> **Disclaimer:** Browser-based violation detection cannot prevent screenshots, external devices, or AI usage in other applications.

---

## Collection: `auditLogs`

**Document ID:** auto-generated

| Field        | Type   | Description                              |
|--------------|--------|------------------------------------------|
| `id`         | string | Document ID                              |
| `userId`     | string | Who performed the action                 |
| `action`     | string | e.g. `TEST_ACCESS_GRANTED`, `EXAM_SUBMITTED` |
| `entityType` | string | e.g. `test`, `user`, `attempt`           |
| `entityId`   | string | ID of the affected entity                |
| `timestamp`  | string | ISO timestamp                            |
| `metadata`   | object | Extra context                            |

Audit logs are **append-only** and should never be modified or deleted.
