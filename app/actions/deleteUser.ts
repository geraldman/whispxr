"use server";

import { adminAuth } from "@/lib/firebase/firebaseAdmin";

export async function deleteUserAccount(uid: string) {
  try {
    await adminAuth.deleteUser(uid);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
