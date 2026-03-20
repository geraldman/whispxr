"use client";

import { signOut } from "firebase/auth";
import { auth, rtdb } from "@/lib/firebase/firebase";
import { deleteDB } from "@/lib/db/indexeddb";
import { ref, set, serverTimestamp } from "firebase/database";

export async function logout() {
  try {
    // 1. Set user presence to offline in Realtime Database
    const uid = auth.currentUser?.uid;
    if (uid) {
      await set(ref(rtdb, `presence/${uid}`), {
        online: false,
        lastSeen: serverTimestamp(),
      });
    }

    // 2. Completely delete IndexedDB (all crypto material and cached data)
    await deleteDB();
    
    // 3. Firebase sign out
    await signOut(auth);
    
  } catch (error) {
    // Still attempt Firebase sign out even if other operations fail
    await signOut(auth);
  }
}