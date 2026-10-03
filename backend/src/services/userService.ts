import { db } from "../firebase/firebaseAdmin";
import { User } from "../types/models";

// Empty volatile store is used only when Firebase is not configured.
const inMemoryUsers = new Map<string, User>();

function toUser(id: string, data: Record<string, unknown>): User {
  const { rtfId, ...userData } = data;
  return {
    ...userData,
    id,
    username:
      typeof data.username === "string"
        ? data.username
        : typeof rtfId === "string"
          ? rtfId
          : "",
  } as User;
}

/**
 * Fetch a user by username. Legacy records are read during migration.
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const normalizedUsername = username.trim().toUpperCase();

  if (db) {
    try {
      let snapshot = await db
        .collection("users")
        .where("username", "==", normalizedUsername)
        .limit(1)
        .get();

      if (snapshot.empty) {
        snapshot = await db
          .collection("users")
          .where("rtfId", "==", normalizedUsername)
          .limit(1)
          .get();
      }

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return toUser(doc.id, doc.data());
      }
    } catch (e) {
      console.warn("[UserService] Firestore query error, falling back to memory:", e);
    }
  }

  // Memory fallback
  for (const user of inMemoryUsers.values()) {
    if (user.username.toUpperCase() === normalizedUsername) {
      return user;
    }
  }

  return null;
}

/**
 * Fetch a user by internal ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  if (db) {
    try {
      const doc = await db.collection("users").doc(userId).get();
      if (doc.exists) {
        return toUser(doc.id, doc.data() ?? {});
      }
    } catch (e) {
      console.warn("[UserService] Firestore error, falling back to memory:", e);
    }
  }

  return inMemoryUsers.get(userId) ?? null;
}

/**
 * Register or create a student/user
 */
export async function createUser(data: {
  username: string;
  name: string;
  email?: string;
  domain?: string;
  branch?: string;
  yearOfPassing?: number;
  role?: "student" | "admin";
  isAllowed?: boolean;
}): Promise<User> {
  const now = new Date().toISOString();
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const normalizedUsername = data.username.trim().toUpperCase();

  const newUser: User = {
    id,
    username: normalizedUsername,
    name: data.name.trim(),
    email: data.email?.trim() || `${normalizedUsername.toLowerCase()}@users.local`,
    domain: data.domain || "General",
    branch: data.branch || "Engineering",
    yearOfPassing: data.yearOfPassing || 2027,
    role: data.role || "student",
    isAllowed: data.isAllowed ?? true,
    accountStatus: data.isAllowed === false ? "blocked" : "active",
    lastSeen: null,
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    try {
      await db.collection("users").doc(id).set(newUser);
    } catch (e) {
      console.warn("[UserService] Firestore write failed, stored in memory:", e);
    }
  }

  inMemoryUsers.set(id, newUser);
  return newUser;
}

/**
 * Admin action: allow or revoke student access
 */
export async function updateUserAllowed(
  userId: string,
  isAllowed: boolean
): Promise<User | null> {
  const user = await getUserById(userId);
  if (!user) return null;

  const now = new Date().toISOString();
  const updatedUser: User = {
    ...user,
    isAllowed,
    accountStatus: isAllowed ? "active" : "blocked",
    updatedAt: now,
  };

  if (db) {
    try {
      await db.collection("users").doc(userId).update({
        isAllowed,
        accountStatus: updatedUser.accountStatus,
        updatedAt: now,
      });
    } catch (e) {
      console.warn("[UserService] Firestore update error:", e);
    }
  }

  inMemoryUsers.set(userId, updatedUser);
  return updatedUser;
}

/**
 * Fetch all users (for admin listing)
 */
export async function getAllUsers(): Promise<User[]> {
  if (db) {
    try {
      const snapshot = await db.collection("users").get();
      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          ...toUser(doc.id, doc.data()),
        }));
      }
    } catch (e) {
      console.warn("[UserService] Firestore getAllUsers error:", e);
    }
  }

  return Array.from(inMemoryUsers.values());
}

/**
 * Update user heartbeat lastSeen
 */
export async function updateLastSeen(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const user = inMemoryUsers.get(userId);
  if (user) {
    user.lastSeen = now;
    user.updatedAt = now;
  }

  if (db) {
    try {
      await db.collection("users").doc(userId).update({
        lastSeen: now,
        updatedAt: now,
      });
    } catch {
      // Ignored in dev
    }
  }
}
