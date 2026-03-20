"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { getDB } from "@/lib/db/indexeddb";
import { storeSessionKey } from "@/app/actions/getOrCreateSessionKey";
import { getUserPublicKeys } from "@/app/actions/getUserPublicKey";
import { initializeChatSession } from "@/app/actions/initializeChatSession";
import { ensureChatFromFriendRequest } from "@/app/actions/ensureChatFromFriendRequest";
import { unlinkChatFromFriendRequest } from "@/app/actions/unlinkChatFromFriendRequest";
import { deleteChatDocument } from "@/app/actions/deleteChatDocument";
import { CHAT_INACTIVITY_TIMEOUT } from "@/lib/config/chatConfig";
import { importPrivateKey } from "@/lib/crypto/rsa";
import {
  generateSessionAESKey,
  exportSessionKey,
  importSessionKey,
  encryptSessionKeyForUser,
  decryptSessionKey,
} from "@/lib/crypto/sessionKey";

interface ChatSessionContextValue {
  activeChatId: string | null;
  sessionKey: CryptoKey | null;
  loading: boolean;
  error: string | null;
  chatExpired: boolean;
  isCleaningUp: boolean;
}

interface ChatSessionProviderProps {
  chatId: string;
  uid: string | null;
  children: React.ReactNode;
}

interface InitResult {
  activeChatId: string | null;
  sessionKey: CryptoKey | null;
  chatExpired: boolean;
  error: string | null;
  redirected: boolean;
}

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);
const initPromiseCache = new Map<string, Promise<InitResult>>();

async function decryptSessionKeyForCurrentUser(encryptedSessionKey: string): Promise<CryptoKey> {
  const indexedDB = await getDB();
  const privateKeyPKCS8 = await indexedDB.get("keys", "userPrivateKey");

  if (!privateKeyPKCS8 || typeof privateKeyPKCS8 !== "string") {
    throw new Error("Private key not found. Please log in again to restore your encryption keys.");
  }

  const privateKey = await importPrivateKey(privateKeyPKCS8);
  const decryptedKeyBase64 = await decryptSessionKey(encryptedSessionKey, privateKey);
  return importSessionKey(decryptedKeyBase64);
}

export function ChatSessionProvider({ chatId, uid, children }: ChatSessionProviderProps) {
  const router = useRouter();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatExpired, setChatExpired] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const cleanupStartedRef = useRef(false);

  useEffect(() => {
    if (!chatId || !uid) return;

    let mounted = true;
    cleanupStartedRef.current = false;

    const initCacheKey = `${uid}:${chatId}`;

    const initSession = async (): Promise<InitResult> => {
      if (chatId.startsWith("friend_")) {
        const friendRequestId = chatId.replace("friend_", "");
        const friendResult = await ensureChatFromFriendRequest(friendRequestId, uid);

        if (friendResult.chatId !== chatId) {
          router.replace(`/chat/${friendResult.chatId}`);
          return {
            activeChatId: null,
            sessionKey: null,
            chatExpired: false,
            error: null,
            redirected: true,
          };
        }
      }

      const result = await initializeChatSession(chatId, uid);

      if (!result.success) {
        return {
          activeChatId: null,
          sessionKey: null,
          chatExpired: false,
          error: result.error || "Failed to initialize chat session",
          redirected: false,
        };
      }

      if (result.chatExpired) {
        return {
          activeChatId: result.chatId,
          sessionKey: null,
          chatExpired: true,
          error: null,
          redirected: false,
        };
      }

      if (result.recreated) {
        router.replace(`/chat/${result.chatId}`);
        return {
          activeChatId: null,
          sessionKey: null,
          chatExpired: false,
          error: null,
          redirected: true,
        };
      }

      const resolvedChatId = result.chatId;
      const sessionData = result.sessionData;

      if (!sessionData) {
        return {
          activeChatId: null,
          sessionKey: null,
          chatExpired: false,
          error: "Missing session data",
          redirected: false,
        };
      }

      if (sessionData.isNew) {
        const participants = "participants" in sessionData ? sessionData.participants : [];
        const newSessionKey = await generateSessionAESKey();
        const sessionKeyBase64 = await exportSessionKey(newSessionKey);
        const encryptedKeys: Record<string, string> = {};
        const publicKeys = await getUserPublicKeys(participants);

        for (const participantId of participants) {
          const publicKeyBase64 = publicKeys[participantId];
          if (!publicKeyBase64) {
            throw new Error(`Public key not found for participant ${participantId}`);
          }

          encryptedKeys[`encryptedKey_${participantId}`] = await encryptSessionKeyForUser(
            sessionKeyBase64,
            publicKeyBase64
          );
        }

        const storeResult = await storeSessionKey(resolvedChatId, encryptedKeys);

        if (storeResult.alreadyExisted) {
          const retryResult = await initializeChatSession(resolvedChatId, uid);
          if (!retryResult.success || !retryResult.sessionData || retryResult.sessionData.isNew) {
            throw new Error("Race condition error: expected existing session");
          }

          const importedSessionKey = await decryptSessionKeyForCurrentUser(
            retryResult.sessionData.encryptedSessionKey
          );

          return {
            activeChatId: resolvedChatId,
            sessionKey: importedSessionKey,
            chatExpired: false,
            error: null,
            redirected: false,
          };
        }

        return {
          activeChatId: resolvedChatId,
          sessionKey: newSessionKey,
          chatExpired: false,
          error: null,
          redirected: false,
        };
      }

      const importedSessionKey = await decryptSessionKeyForCurrentUser(sessionData.encryptedSessionKey);

      return {
        activeChatId: resolvedChatId,
        sessionKey: importedSessionKey,
        chatExpired: false,
        error: null,
        redirected: false,
      };
    };

    const inFlightPromise =
      initPromiseCache.get(initCacheKey) ||
      initSession().finally(() => {
        initPromiseCache.delete(initCacheKey);
      });

    initPromiseCache.set(initCacheKey, inFlightPromise);

    inFlightPromise
      .then((initResult) => {
        if (!mounted) return;

        if (initResult.redirected) {
          return;
        }

        if (initResult.error) {
          if (initResult.error.includes("Chat not found") || initResult.error.includes("not found")) {
            router.push("/chat?error=notfound");
            return;
          }

          setError(initResult.error);
          setLoading(false);
          return;
        }

        setActiveChatId(initResult.activeChatId);
        setSessionKey(initResult.sessionKey);
        setChatExpired(initResult.chatExpired);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;

        const errorMessage = err instanceof Error ? err.message : "Failed to initialize encryption";

        if (errorMessage.includes("Chat not found") || errorMessage.includes("not found")) {
          router.push("/chat?error=notfound");
          return;
        }

        if (errorMessage.includes("Private key not found") || errorMessage.includes("log in again")) {
          router.push("/login?error=keys_missing");
          return;
        }

        setError(errorMessage);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [chatId, uid, router]);

  useEffect(() => {
    if (!activeChatId || !uid || chatExpired) return;

    let mounted = true;
    let lastActivityTime: number | null = null;

    const chatDocRef = doc(db, "chats", activeChatId);
    let unsubscribe: (() => void) | undefined;
    let checkInterval: NodeJS.Timeout | undefined;

    const checkExpiry = () => {
      if (!mounted || !lastActivityTime) return;

      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;

      if (timeSinceActivity > CHAT_INACTIVITY_TIMEOUT) {
        setChatExpired(true);
        setLoading(false);
      }
    };

    const setupMonitor = async () => {
      try {
        const chatSnapshot = await getDoc(chatDocRef);

        if (!mounted || !chatSnapshot.exists()) {
          return;
        }

        const initialData = chatSnapshot.data();
        if (initialData.lastActivity) {
          lastActivityTime = initialData.lastActivity.toMillis();
        }

        unsubscribe = onSnapshot(
          chatDocRef,
          (snapshot) => {
            if (!mounted) return;

            if (!snapshot.exists()) {
              setChatExpired(true);
              setLoading(false);
              return;
            }

            const chatData = snapshot.data();
            if (chatData.lastActivity) {
              lastActivityTime = chatData.lastActivity.toMillis();
              checkExpiry();
            }
          },
          (snapshotError) => {
            if (!mounted) return;
          }
        );

        checkInterval = setInterval(checkExpiry, 1000);
      } catch (monitorError) {
        if (!mounted) return;
      }
    };

    setupMonitor();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [activeChatId, uid, chatExpired]);

  useEffect(() => {
    if (!chatExpired || !uid || !activeChatId || cleanupStartedRef.current) return;

    cleanupStartedRef.current = true;

    let mounted = true;

    const startCleaningTimeout = setTimeout(() => {
      if (mounted) {
        setIsCleaningUp(true);
      }
    }, 0);

    const cleanupTimeout = setTimeout(async () => {
      if (!mounted) return;

      await deleteChatDocument(activeChatId, uid);
      await unlinkChatFromFriendRequest(activeChatId, uid);

      if (mounted) {
        router.push("/chat");
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(startCleaningTimeout);
      clearTimeout(cleanupTimeout);
    };
  }, [chatExpired, activeChatId, uid, router]);

  const value = useMemo(
    () => ({
      activeChatId,
      sessionKey,
      loading,
      error,
      chatExpired,
      isCleaningUp,
    }),
    [activeChatId, sessionKey, loading, error, chatExpired, isCleaningUp]
  );

  return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>;
}

export function useChatSession() {
  const context = useContext(ChatSessionContext);

  if (!context) {
    throw new Error("useChatSession must be used within ChatSessionProvider");
  }

  return context;
}
