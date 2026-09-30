# Firebase Setup Guide

## Overview

This platform uses three Firebase services:

| Service                 | Purpose                                   |
|-------------------------|-------------------------------------------|
| Firebase Authentication | User login, ID token generation           |
| Cloud Firestore         | Primary database for all application data |
| Firebase Admin SDK      | Server-side (backend only) privileged access |

---

## Important Security Rule

**The Firebase Admin SDK is used ONLY by the backend.**

The frontend uses Firebase's client SDK only for:
1. Calling `signInWithEmailAndPassword` (or similar)
2. Calling `user.getIdToken()` to get the Firebase ID token

The frontend **never** writes to Firestore directly.
All writes go through the backend REST API.

---

## Creating a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name your project (e.g., `secure-exam-platform`)
4. (Optional) Disable Google Analytics
5. Click **"Create project"**

---

## Enabling Firebase Authentication

1. In the Firebase Console, go to **Build → Authentication**
2. Click **"Get started"**
3. Under **Sign-in method**, enable **Email/Password**
4. Save

---

## Creating Firestore Database

1. Go to **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** for development
   - ⚠️ Before production, set proper Security Rules
4. Choose a region (e.g., `asia-south1` for India)
5. Click **"Enable"**

---

## Getting Firebase Admin SDK Credentials

1. In Firebase Console, click the **gear icon** → **Project settings**
2. Go to the **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Download the JSON file

⚠️ **NEVER commit this file to Git. Add it to `.gitignore`.**

---

## Configuring the Backend

Copy the values from the downloaded JSON into your backend `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

> **Note:** The private key contains newline characters. Keep them as `\n` in the `.env` file. The backend replaces `\n` → actual newlines automatically.

---

## Firestore Collections

| Collection   | Document ID     | Description                           |
|--------------|-----------------|---------------------------------------|
| `users`      | Firebase UID    | User profiles (students, admins)      |
| `tests`      | auto-generated  | MCQ test definitions                  |
| `questions`  | auto-generated  | Individual questions per test         |
| `testAccess` | auto-generated  | Student → test access grants          |
| `testAttempts` | auto-generated | In-progress and completed attempts    |
| `answers`    | auto-generated  | Student answers per question          |
| `violations` | auto-generated  | Browser integrity violation events    |
| `auditLogs`  | auto-generated  | Immutable audit trail                 |

---

## Development Without Real Firebase Credentials

The backend is designed to start without Firebase credentials:

- If `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` are missing, Firebase Admin SDK initialization is skipped
- A warning is printed to the console
- The health endpoint still works
- Endpoints that require Firebase return a `503` response

This lets frontend developers run the backend locally without needing Firebase access.

---

## Firestore Security Rules (Production)

When ready for production, update Firestore Security Rules to:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // All reads/writes must go through the backend (Admin SDK bypasses these rules)
    // Direct client access is locked down
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Since the backend uses the Admin SDK, it bypasses Security Rules entirely. Locking the client side prevents any accidental direct access.
