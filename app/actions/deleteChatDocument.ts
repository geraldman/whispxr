"use server";

import { adminDb } from "@/lib/firebase/firebaseAdmin";

interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Immediately deletes a chat document and all its messages.
 * This triggers real-time updates to all listeners via onSnapshot.
 */
export async function deleteChatDocument(
  chatId: string,
  userId: string
): Promise<DeleteResult> {
  try {

    // Get the chat document
    const chatRef = adminDb.collection("chats").doc(chatId);
    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
      return { success: true };
    }

    const chatData = chatSnap.data();
    
    // Verify user is a participant
    if (!chatData?.participants?.includes(userId)) {
      return {
        success: false,
        error: "Chat not found"
      };
    }

    // Delete all messages in the chat (subcollection)
    const messagesRef = chatRef.collection("messages");
    const messagesSnapshot = await messagesRef.get();
    
    // Delete all sessions in the chat (subcollection)
    const sessionsRef = chatRef.collection("sessions");
    const sessionsSnapshot = await sessionsRef.get();
    
    const batch = adminDb.batch();
    
    messagesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    sessionsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the chat document itself
    batch.delete(chatRef);

    await batch.commit();
    

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
