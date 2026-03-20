"use server";

import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { randomUUID } from "crypto";

interface EnsureChatResult {
  success: boolean;
  exists: boolean;
  recreated: boolean;
  chatId: string;
  oldChatId?: string;
  chatData?: any;
  error?: string;
}

/**
 * Ensures a chat exists for the given chatId.
 * If the chat was deleted (due to inactivity), recreates it and updates the friend request.
 * Returns the chat data and whether it was recreated (requiring new session keys).
 */
export async function ensureChatExists(
  chatId: string, 
  currentUserId: string
): Promise<EnsureChatResult> {
  if (!chatId || !currentUserId) {
    return {
      success: false,
      exists: false,
      recreated: false,
      chatId: "",
      error: "Invalid chat id or user id"
    };
  }

  // Check if chat exists
  const chatRef = adminDb.collection("chats").doc(chatId);
  const chatSnap = await chatRef.get();

  if (chatSnap.exists) {
    // Chat exists, return it
    const data = chatSnap.data();
    return {
      success: true,
      exists: true,
      recreated: false,
      chatId,
      chatData: {
        ...data,
        createdAt: data?.createdAt?.toMillis?.() ?? null,
        lastActivity: data?.lastActivity?.toMillis?.() ?? null,
      },
    };
  }

  // Chat doesn't exist - it may have been cleaned up
  // First, try to find the friend request associated with this chatId
  let friendRequestsSnapshot = await adminDb
    .collection("friend_requests")
    .where("chatId", "==", chatId)
    .where("status", "==", "accepted")
    .limit(1)
    .get();

  // If no friend request found by chatId (e.g., after unlinking), 
  // search for accepted friend requests involving the current user
  if (friendRequestsSnapshot.empty) {
    
    // We need to check both directions since we can't use 'in' with two fields
    // First check where current user is 'from'
    const fromSnapshot = await adminDb
      .collection("friend_requests")
      .where("from", "==", currentUserId)
      .where("status", "==", "accepted")
      .get();
    
    // Then check where current user is 'to'
    const toSnapshot = await adminDb
      .collection("friend_requests")
      .where("to", "==", currentUserId)
      .where("status", "==", "accepted")
      .get();
    
    // Find a friend request that has no chatId or chatId matches the expired one
    const allDocs = [...fromSnapshot.docs, ...toSnapshot.docs];
    const matchingDoc = allDocs.find(doc => {
      const data = doc.data();
      return !data.chatId || data.chatId === chatId;
    });
    
    if (!matchingDoc) {
      return {
        success: false,
        exists: false,
        recreated: false,
        chatId: "",
        error: "Chat not found. This chat may have been deleted or you don't have permission to access it."
      };
    }
    
    // Create a mock snapshot with just this document
    friendRequestsSnapshot = {
      empty: false,
      docs: [matchingDoc]
    } as any;
  }

  const friendRequestDoc = friendRequestsSnapshot.docs[0];
  const friendRequestData = friendRequestDoc.data();
  const { from, to } = friendRequestData;

  // Verify current user is a participant
  if (from !== currentUserId && to !== currentUserId) {
    return {
      success: false,
      exists: false,
      recreated: false,
      chatId: "",
      error: "Chat not found"
    };
  }

  // Recreate the chat with a new ID
  const newChatId = randomUUID();

  await adminDb.collection("chats").doc(newChatId).set({
    participants: [from, to],
    isFriendChat: true,
    maxMessages: null,
    createdAt: new Date(),
    lastActivity: new Date(),
    saved: false, // Can be set to true to prevent cleanup
  });

  // Update the friend request with the new chatId
  await friendRequestDoc.ref.update({
    chatId: newChatId,
    chatRecreatedAt: new Date(),
  });

  // Add a system message indicating the chat was recreated
  await adminDb
    .collection("chats")
    .doc(newChatId)
    .collection("messages")
    .add({
      senderId: "system",
      type: "chat_recreated",
      text: "Chat recreated with new encryption keys",
      participants: [from, to],
      createdAt: new Date(),
    });

  const now = Date.now();
  
  return {
    success: true,
    exists: false,
    recreated: true,
    chatId: newChatId,
    oldChatId: chatId,
    chatData: {
      participants: [from, to],
      isFriendChat: true,
      maxMessages: null,
      createdAt: now,
      lastActivity: now,
      saved: false,
    },
  };
}
