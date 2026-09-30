import { db } from "../firebase/firebaseAdmin";

/**
 * updateLastSeen
 *
 * Updates the lastSeen field on a user document.
 * Called by the heartbeat endpoint.
 *
 * Admin uses this value to determine online/offline:
 *   ONLINE  → Date.now() - lastSeen < ONLINE_THRESHOLD_MS (e.g. 60_000ms)
 *   OFFLINE → otherwise
 */
export async function updateLastSeen(userId: string): Promise<void> {
  if (!db) {
    // Firebase not initialized — skip silently in dev
    console.warn("[UserService] Firebase not initialized. Skipping updateLastSeen.");
    return;
  }

  await db.collection("users").doc(userId).update({
    lastSeen: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * getUserById
 *
 * Fetches a user document from Firestore by userId.
 * Returns null if the user does not exist.
 */
export async function getUserById(userId: string): Promise<unknown | null> {
  if (!db) {
    console.warn("[UserService] Firebase not initialized. Skipping getUserById.");
    return null;
  }

  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}
