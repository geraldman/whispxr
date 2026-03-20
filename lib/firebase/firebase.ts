import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Set persistence to LOCAL so user stays logged in across browser sessions
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
  });
}

export const db = getFirestore(app);
export const rtdb = getDatabase(app);

/**
 * Fetches user encryption keys from Firestore for login
 */
export async function getUserEncryptionKeysSimplified(uid: string) {
  const userDoc = await getDoc(doc(db, "users", uid));
  
  if (!userDoc.exists()) {
    throw new Error("User not found");
  }
  
  const data = userDoc.data();
  
  return {
    publicKey: data.publicKey,
    encryptedPrivateKey: data.encryptedPrivateKey,
    salt: data.salt,
    iv: data.iv,
  };
}

export async function updateUserEncryptionKeysSimplified(
  uid: string,
  publicKey: string,
  encryptedPrivateKey: string,
  salt: string,
  iv: string
){
  try{
    await updateDoc(doc(db, "users", uid), {
      publicKey: publicKey,
      encryptedPrivateKey: encryptedPrivateKey,
      iv: iv,
      salt: salt
    });
  }
  catch(error){
    throw error;
  }
}