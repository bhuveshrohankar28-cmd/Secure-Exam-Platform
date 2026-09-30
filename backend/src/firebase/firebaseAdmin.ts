import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let db: Firestore | null = null;

/**
 * Initializes Firebase Admin SDK for Firestore database storage.
 * Note: Firebase Authentication has been removed in favor of direct
 * RTF ID verification and Admin approval authorization.
 */
function initializeFirebase(): void {
  if (getApps().length > 0) {
    app = getApps()[0];
    db = getFirestore(app);
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[Firebase] Missing Firebase environment variables. Firestore not connected.\n" +
        "  Running in local memory fallback mode for student RTF ID & test data."
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
    console.log("[Firebase] Firestore Admin initialized successfully.");
  } catch (error) {
    console.error("[Firebase] Failed to initialize Firebase Admin SDK:", error);
  }
}

initializeFirebase();

export { app, db };
export default app;
