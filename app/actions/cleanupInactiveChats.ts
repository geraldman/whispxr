"use server";

import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { CHAT_INACTIVITY_TIMEOUT } from "@/lib/config/chatConfig";

/**
 * Cleans up inactive chats that haven't had any messages for the configured timeout period
 * Deletes the chat document and all associated messages and sessions
 */
export async function cleanupInactiveChats(uid: string) {
  if (!uid) return { success: false, error: "No user ID provided" };

  try {
    const now = Date.now();
    const timeoutThreshold = now - CHAT_INACTIVITY_TIMEOUT;

    // Get all chats for this user
    const chatsSnapshot = await adminDb
      .collection("chats")
      .where("participants", "array-contains", uid)
      .get();

    const chatsToDelete: string[] = [];

    for (const chatDoc of chatsSnapshot.docs) {
      const chatData = chatDoc.data();
      const chatId = chatDoc.id;

      // Skip saved chats - they are permanent and won't be cleaned up
      if (chatData.saved === true) {
        continue;
      }

      // Check if chat has lastActivity field
      let lastActivityTime = 0;

      if (chatData.lastActivity) {
        lastActivityTime = chatData.lastActivity.toMillis();
      } else if (chatData.createdAt) {
        // Fallback to createdAt if no lastActivity
        lastActivityTime = chatData.createdAt.toMillis();
      }

      // Check if chat is inactive
      if (lastActivityTime < timeoutThreshold) {
        chatsToDelete.push(chatId);
      }
    }

    // Delete inactive chats
    const batch = adminDb.batch();
    let deletedCount = 0;

    for (const chatId of chatsToDelete) {
      // Delete chat document
      batch.delete(adminDb.collection("chats").doc(chatId));

      // Delete all messages in the chat
      const messagesSnapshot = await adminDb
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .get();

      messagesSnapshot.docs.forEach((msgDoc) => {
        batch.delete(msgDoc.ref);
      });

      // Delete all sessions in the chat
      const sessionsSnapshot = await adminDb
        .collection("chats")
        .doc(chatId)
        .collection("sessions")
        .get();

      sessionsSnapshot.docs.forEach((sessionDoc) => {
        batch.delete(sessionDoc.ref);
      });

      deletedCount++;
    }

    if (deletedCount > 0) {
      await batch.commit();
    }

    return {
      success: true,
      deletedCount,
      timeoutHours: CHAT_INACTIVITY_TIMEOUT / (60 * 60 * 1000),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
