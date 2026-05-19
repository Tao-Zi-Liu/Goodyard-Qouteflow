import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {CallableRequest} from "firebase-functions/v2/https";
import {Firestore} from "@google-cloud/firestore";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: "Admin" | "Sales" | "Purchasing" | "Order Manager" | "Finance";
  language: "en" | "de" | "zh";
  // Optional database id so the function writes to the same Firestore
  // database the caller's app is reading from (e.g. "staging" for
  // staging app, "(default)" for production). Defaults to "(default)".
  databaseId?: string;
}

/**
 * Return a Firestore instance targeting the requested database.
 * Cache instances per-databaseId so we don't recreate clients on every call.
 */
const firestoreClients = new Map<string, Firestore>();
function getDb(databaseId: string): Firestore {
  const key = databaseId || "(default)";
  let client = firestoreClients.get(key);
  if (!client) {
    // For "(default)" we use the admin SDK's bundled client so server-side
    // auth from initializeApp() is reused; for named databases we use
    // @google-cloud/firestore directly with the databaseId option.
    if (key === "(default)") {
      client = admin.firestore() as unknown as Firestore;
    } else {
      client = new Firestore({databaseId: key});
    }
    firestoreClients.set(key, client);
  }
  return client;
}

export const createUser = functions.https.onCall(
  async (request: CallableRequest<CreateUserData>) => {
    // Verify the caller is an admin
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to create users."
      );
    }
    try {
      const databaseId = request.data.databaseId || "(default)";
      const db = getDb(databaseId);

      functions.logger.info(
        `createUser called by ${request.auth.uid} on database='${databaseId}'`
      );

      // Check if the calling user is an admin (look up in the SAME database)
      const callerDoc = await db
        .collection("users")
        .doc(request.auth.uid)
        .get();
      if (!callerDoc.exists || callerDoc.data()?.role !== "Admin") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only administrators can create user accounts."
        );
      }
      const {email, password, name, role, language} = request.data;
      // Validate input
      if (!email || !password || !name || !role) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email, password, name, and role are required."
        );
      }
      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: name,
        emailVerified: true,
      });
      // Create user profile in Firestore (in the same database the caller used)
      await db.collection("users").doc(userRecord.uid).set({
        name: name,
        email: email,
        role: role,
        language: language || "en",
        status: "Active",
        registrationDate: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginTime: null,
        avatar: "https://placehold.co/100x100",
        mustChangePassword: true,
        createdBy: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Set custom claims for role-based access
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: role,
      });
      functions.logger.info(
        `User created: ${email} (role=${role}) in database='${databaseId}' by ${request.auth.uid}`
      );
      return {
        success: true,
        uid: userRecord.uid,
        message: `User account created successfully for ${name}`,
      };
    } catch (error: any) {
      functions.logger.error("Error creating user:", error);
      // Handle specific Firebase Auth errors
      if (error.code === "auth/email-already-exists") {
        throw new functions.https.HttpsError(
          "already-exists",
          "An account with this email already exists."
        );
      }
      if (error.code === "auth/invalid-email") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid email address."
        );
      }
      if (error.code === "auth/weak-password") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Password is too weak. Must be at least 6 characters."
        );
      }
      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      // Generic error
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while creating the user account."
      );
    }
  }
);