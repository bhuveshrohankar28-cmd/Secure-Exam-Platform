# API Reference

## Base URL

| Environment | URL                   |
|-------------|-----------------------|
| Development | `http://localhost:5000` |
| Production  | Set via `FRONTEND_URL` |

## Response Format

All endpoints return a consistent JSON envelope.

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

## Authentication

Protected endpoints require a Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase-id-token>
```

Obtain the token by signing in via Firebase Authentication on the frontend, then calling `user.getIdToken()`.

---

## Endpoints

### Health

#### `GET /api/health`

Public. Returns server status.

- **Auth required:** No
- **Request body:** None
- **Response:**
```json
{
  "success": true,
  "message": "Secure Exam Backend is running",
  "timestamp": "2026-10-01T00:00:00.000Z",
  "environment": "development"
}
```

---

### Authentication `/api/auth`

#### `POST /api/auth/register`

Registers a new student account.

- **Auth required:** No
- **Status:** 🚧 Phase 2
- **Request body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "collegeEnrollmentNo": "string",
  "collegeEmail": "string",
  "branch": "string",
  "domain": "string",
  "yearOfPassing": 2027,
  "phone": "string"
}
```
- **Response:** `{ "success": true, "data": { "userId": "..." } }`

#### `POST /api/auth/login`

- **Auth required:** No
- **Status:** 🚧 Phase 2
- **Note:** Login is handled by Firebase Auth on the frontend. Backend validates the resulting token.

#### `POST /api/auth/logout`

- **Auth required:** Yes
- **Status:** 🚧 Phase 2

#### `GET /api/auth/me`

Returns the authenticated user from the token.

- **Auth required:** Yes
- **Status:** ✅ Working
- **Response:**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "role": "student"
  }
}
```

---

### Users `/api/users`

#### `GET /api/users/me`

Returns full user profile from Firestore.

- **Auth required:** Yes
- **Status:** 🚧 Phase 3

#### `POST /api/users/heartbeat`

Updates the user's `lastSeen` timestamp. Called periodically from the student dashboard.

- **Auth required:** Yes
- **Status:** ✅ Working
- **Request body:** None
- **Response:** `{ "success": true, "data": { "message": "Heartbeat recorded." } }`

---

### Tests `/api/tests`

#### `GET /api/tests`

Admins receive all tests. Students receive only tests with an active access grant.

- **Auth required:** Yes
- **Status:** Working

#### `GET /api/tests/:id`

Returns one test with questions and answer keys; admins only.

- **Auth required:** Yes — admin/superadmin
- **Status:** Working

#### `GET /api/tests/code/:code`

Returns the student-safe test lobby state for an assigned test.

- **Auth required:** Yes — enabled student
- **Status:** Working

#### `POST /api/tests`

Creates a new test.

- **Auth required:** Yes — admin/superadmin only
- **Status:** Working
- **Request body:**
```json
{
  "title": "string",
  "description": "string",
  "duration": 60
}
```

#### `PUT /api/tests/:id`

Updates a test.

- **Auth required:** Yes — admin/superadmin only
- **Status:** Working

#### `DELETE /api/tests/:id`

Deletes a test.

- **Auth required:** Yes — admin/superadmin only
- **Status:** Working

#### `POST /api/tests/:id/questions/import`

Imports validated MCQ question data as `{ "mode": "append" | "replace", "questions": [...] }`. Questions must contain a prompt, four distinct options, `correctOptionIndex` (0–3), and optional `marks` (default 1).

- **Auth required:** Yes — admin/superadmin
- **Status:** Working

---

### Test Access `/api/test-access`

#### `GET /api/test-access`

Returns test access records for the authenticated user.

- **Auth required:** Yes
- **Status:** Working

#### `POST /api/test-access`

Admin grants a student access to a test.

- **Auth required:** Yes — admin/superadmin only
- **Status:** Working
- **Request body:**
```json
{
  "testId": "string",
  "userId": "string"
}
```

#### `DELETE /api/test-access/:id`

Admin revokes a student's test access.

- **Auth required:** Yes — admin/superadmin only
- **Status:** Working

---

### Attempts `/api/attempts`

#### `POST /api/attempts`

Student starts a test attempt.

- **Auth required:** Yes
- **Status:** Working
- **Request body:**
```json
{
  "code": "string"
}
```

#### `GET /api/attempts/:id`

Returns attempt details.

- **Auth required:** Yes
- **Status:** Working

#### `POST /api/attempts/:id/answers`

Autosaves answers during the exam.

- **Auth required:** Yes
- **Status:** Working

#### `POST /api/attempts/:id/submit`

Student submits the exam.

- **Auth required:** Yes
- **Status:** Working

---

### Admin `/api/admin`

All admin endpoints require admin or superadmin role.

#### `GET /api/admin/users`

Returns all registered users. Supports future query params:

| Param    | Type   | Description                |
|----------|--------|----------------------------|
| `search` | string | Search by name/email/enrollment |
| `year`   | number | Filter by year of passing  |
| `domain` | string | Filter by domain           |
| `branch` | string | Filter by branch           |
| `status` | string | Filter by account status   |
| `online` | boolean| Filter by online/offline   |

- **Auth required:** Yes — admin
- **Status:** Working

#### `GET /api/admin/tests`

- **Auth required:** Yes — admin
- **Status:** Working

#### `GET /api/admin/attempts`

- **Auth required:** Yes — admin
- **Status:** Working
