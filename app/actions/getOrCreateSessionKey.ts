"use server";

import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Get or create a session key for a user in a chat.
 * Session keys are encrypted with each participant's RSA public key.
 * Returns the encrypted session key for the requesting user.
 */
export async function getOrCreateSessionKey(chatId: string, userId: string) {
  if (!chatId || !userId) {
    throw new Error("Invalid chat id or user id");
  }

  const chatRef = adminDb.collection("chats").doc(chatId);
  const chatSnap = await chatRef.get();

  if (!chatSnap.exists) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();
  const participants = chatData?.participants || [];

  // Verify user is a participant
  if (!participants.includes(userId)) {
    throw new Error("Chat not found");
  }

  // Check if session keys already exist
  const sessionsRef = chatRef.collection("sessions");
  const sessionSnapshot = await sessionsRef
    .orderBy("createdAt", "desc") // Get the most recent session
    .limit(1)
    .get();

  if (!sessionSnapshot.empty) {
    // Session exists - return the encrypted key for this user
    const sessionDoc = sessionSnapshot.docs[0];
    const sessionData = sessionDoc.data();
    
    
    // Each user has their own encrypted version of the session key
    const encryptedKeyForUser = sessionData[`encryptedKey_${userId}`];
    
    if (!encryptedKeyForUser) {
      throw new Error("Session key not found for this user");
    }

    
    return {
      sessionId: sessionDoc.id,
      encryptedSessionKey: encryptedKeyForUser,
      isNew: false,
    };
  }

  // No session exists - need to generate one on client side
  // Return null to signal client to generate and store session key
  
  return {
    sessionId: null,
    encryptedSessionKey: null,
    isNew: true,
    participants, // Return participants so client can encrypt for each
  };
}

/**
 * Store encrypted session keys for all participants.
 * Called by client after generating a new session key.
 */
export async function storeSessionKey(
  chatId: string,
  encryptedKeys: Record<string, string> // { userId: encryptedKey }
) {
  if (!chatId || !encryptedKeys) {
    throw new Error("Invalid chat id or encrypted keys");
  }

  const chatRef = adminDb.collection("chats").doc(chatId);
  const chatSnap = await chatRef.get();

  if (!chatSnap.exists) {
    throw new Error("Chat not found");
  }

  const chatData = chatSnap.data();
  const participants = chatData?.participants || [];

  // Verify all participants have encrypted keys
  for (const participantId of participants) {
    if (!encryptedKeys[`encryptedKey_${participantId}`]) {
      throw new Error(`Missing encrypted key for participant ${participantId}`);
    }
  }

  // Check if a session already exists (race condition check)
  const sessionsRef = chatRef.collection("sessions");
  const existingSessionSnapshot = await sessionsRef
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!existingSessionSnapshot.empty) {
    const existingSession = existingSessionSnapshot.docs[0];
    return {
      success: true,
      sessionId: existingSession.id,
      alreadyExisted: true,
    };
  }

  // Store session keys
  const sessionDoc = await sessionsRef.add({
    ...encryptedKeys,
    createdAt: FieldValue.serverTimestamp(),
  });


  return {
    success: true,
    sessionId: sessionDoc.id,
    alreadyExisted: false,
  };
}
