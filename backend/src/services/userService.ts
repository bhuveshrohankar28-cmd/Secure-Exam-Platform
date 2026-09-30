import { db } from "../firebase/firebaseAdmin";
import { User, ISOTimestamp } from "../types/models";

// In-memory fallback database for local development and testing
const inMemoryUsers: Map<string, User> = new Map([
  [
    "usr_admin",
    {
      id: "usr_admin",
      rtfId: "ADMIN001",
      name: "Platform Administrator",
      email: "admin@college.edu",
      role: "admin",
      accountStatus: "active",
      isAllowed: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "usr_1",
    {
      id: "usr_1",
      rtfId: "RTF2024001",
      name: "Arjun Sharma",
      email: "arjun.sharma@college.edu",
      collegeEnrollmentNo: "CE2024001",
      branch: "Computer Engineering",
      domain: "Software",
      yearOfPassing: 2027,
      role: "student",
      accountStatus: "active",
      isAllowed: true, // Already approved by admin
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "usr_2",
    {
      id: "usr_2",
      rtfId: "RTF2024002",
      name: "Priya Patel",
      email: "priya.patel@college.edu",
      collegeEnrollmentNo: "EE2024002",
      branch: "Electrical Engineering",
      domain: "Electrical",
      yearOfPassing: 2027,
      role: "student",
      accountStatus: "active",
      isAllowed: true, // Already approved by admin
      lastSeen: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "usr_3",
    {
      id: "usr_3",
      rtfId: "RTF2024003",
      name: "Rahul Mehta",
      email: "rahul.mehta@college.edu",
      collegeEnrollmentNo: "ME2024003",
      branch: "Mechanical Engineering",
      domain: "Mechanical",
      yearOfPassing: 2026,
      role: "student",
      accountStatus: "pending",
      isAllowed: false, // Pending admin approval!
      lastSeen: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
]);

/**
 * Fetch a user by their unique RTF ID
 */
export async function getUserByRtfId(rtfId: string): Promise<User | null> {
  const normalizedRtf = rtfId.trim().toUpperCase();

  if (db) {
    try {
      const snapshot = await db
        .collection("users")
        .where("rtfId", "==", normalizedRtf)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...(doc.data() as Omit<User, "id">) };
      }
    } catch (e) {
      console.warn("[UserService] Firestore query error, falling back to memory:", e);
    }
  }

  // Memory fallback
  for (const user of inMemoryUsers.values()) {
    if (user.rtfId.toUpperCase() === normalizedRtf) {
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
        return { id: doc.id, ...(doc.data() as Omit<User, "id">) };
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
  rtfId: string;
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
  const normalizedRtf = data.rtfId.trim().toUpperCase();

  const newUser: User = {
    id,
    rtfId: normalizedRtf,
    name: data.name.trim(),
    email: data.email?.trim() || `${normalizedRtf.toLowerCase()}@college.edu`,
    domain: data.domain || "General",
    branch: data.branch || "Engineering",
    yearOfPassing: data.yearOfPassing || 2027,
    role: data.role || "student",
    // By default, students must be approved by admin unless explicitly pre-allowed
    isAllowed: data.isAllowed ?? false,
    accountStatus: data.isAllowed ? "active" : "pending",
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
    accountStatus: isAllowed ? "active" : "pending",
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
          id: doc.id,
          ...(doc.data() as Omit<User, "id">),
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
