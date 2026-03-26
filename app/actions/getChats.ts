"use server";

import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { unstable_noStore as noStore } from "next/cache";

export async function getChats(uid: string) {
  noStore();

  if (!uid) return [];

  const snapshot = await adminDb
    .collection("chats")
    .where("participants", "array-contains", uid)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    
    // Get the other participant (not current user)
    const otherParticipantId = data.participants.find((p: string) => p !== uid);

    return {
      id: doc.id,
      participants: data.participants,
      otherParticipantId,
      isFriendChat: data.isFriendChat ?? false,
      createdAt: data.createdAt ? data.createdAt.toMillis() : null,
      saved: data.saved ?? false,
    };
  });
}
