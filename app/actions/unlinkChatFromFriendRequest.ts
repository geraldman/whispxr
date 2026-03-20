"use server";

import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface UnlinkResult {
  success: boolean;
  error?: string;
}

export async function unlinkChatFromFriendRequest(
  chatId: string,
  userId: string
): Promise<UnlinkResult> {
  try {

    // Find all friend_requests that reference this chatId
    const friendRequestsRef = adminDb.collection("friend_requests");
    
    // Query where user is either sender or receiver and chatId matches
    const fromQuery = friendRequestsRef
      .where("from", "==", userId)
      .where("chatId", "==", chatId)
      .get();
    
    const toQuery = friendRequestsRef
      .where("to", "==", userId)
      .where("chatId", "==", chatId)
      .get();

    const [fromSnapshot, toSnapshot] = await Promise.all([fromQuery, toQuery]);

    // Update all matching documents to remove chatId
    const batch = adminDb.batch();
    let updateCount = 0;

    fromSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.update(doc.ref, { chatId: FieldValue.delete() });
      updateCount++;
    });

    toSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.update(doc.ref, { chatId: FieldValue.delete() });
      updateCount++;
    });

    if (updateCount > 0) {
      await batch.commit();
    } else {
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
