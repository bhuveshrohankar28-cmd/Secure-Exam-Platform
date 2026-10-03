# Secure Exam Platform — Backend

Express.js + TypeScript + Firebase Admin SDK backend for the Secure MCQ Examination Platform.

## Stack

| Layer      | Technology               |
|------------|--------------------------|
| Runtime    | Node.js                  |
| Framework  | Express.js               |
| Language   | TypeScript               |
| Auth DB    | Firebase Authentication  |
| Database   | Cloud Firestore          |
| Firebase   | Firebase Admin SDK       |
| Validation | Zod                      |
| Security   | Helmet, CORS             |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase Admin SDK credentials.

### 3. Run in development mode

```bash
npm run dev
```

Server starts at `http://localhost:5000`

### 4. Verify

```
GET http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Secure Exam Backend is running"
}
```

## Architecture

```
Routes
   ↓
Controllers  (HTTP layer — parse request, send response)
   ↓
Services     (Business logic)
   ↓
Firebase Admin SDK
   ↓
Firestore / Firebase Auth
```

## Folder Structure

```
src/
├── config/         — Future: shared config constants
├── controllers/    — HTTP request handlers (thin layer)
├── firebase/       — Firebase Admin SDK initialization
├── middleware/     — Auth verification, role checking
├── routes/         — Express route definitions
├── services/       — Business logic
├── types/          — TypeScript interfaces (data models)
├── utils/          — Shared utilities
├── validators/     — Zod schemas for request validation
└── app.ts          — Express app setup
server.ts           — Server entry point (starts listening)
```

## API Endpoints

| Method | Path                    | Auth | Role         | Status      |
|--------|-------------------------|------|--------------|-------------|
| GET    | /api/health             | No   | —            | ✅ Working   |
| POST   | /api/auth/login         | No   | —            | ✅ Working   |
| POST   | /api/auth/logout        | Yes  | any          | ✅ Working   |
| GET    | /api/auth/me            | Yes  | any          | ✅ Working   |
| GET    | /api/users/me           | Yes  | any          | ✅ Working   |
| POST   | /api/users/heartbeat    | Yes  | any          | ✅ Working   |
| GET    | /api/tests              | Yes  | admin/student| ✅ Working   |
| POST   | /api/tests              | Yes  | admin        | ✅ Working   |
| GET    | /api/test-access        | Yes  | any          | ✅ Working   |
| POST   | /api/test-access        | Yes  | admin        | ✅ Working   |
| POST   | /api/attempts           | Yes  | student      | ✅ Working   |
| GET    | /api/admin/users        | Yes  | admin        | ✅ Working   |

Students only receive assigned tests and must have an active access grant to view a test lobby or start it. Without Firebase configuration, data is stored in memory for local development and is lost when the server restarts.

## Firebase Setup

See [`../docs/firebase.md`](../docs/firebase.md) for detailed instructions.
