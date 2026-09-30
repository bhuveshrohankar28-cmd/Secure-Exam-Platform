import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

/**
 * Initializes Firebase Admin SDK using environment variables.
 * The private key newline characters must be unescaped (replace \\n with \n).
 */
function initializeFirebase(): void {
  if (getApps().length > 0) {
    app = getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[Firebase] Missing Firebase environment variables. Firebase Admin SDK not initialized.\n" +
        "  Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env"
    );
    return;
  }

  try {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("[Firebase] Admin SDK initialized successfully.");
  } catch (error) {
    console.error("[Firebase] Failed to initialize Firebase Admin SDK:", error);
  }
}

initializeFirebase();

export { app, db, auth };
export default app;
