"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/context/AuthContext";
import { getDB } from "@/lib/db/indexeddb";
import { getOrCreateSessionKey, storeSessionKey } from "@/app/actions/getOrCreateSessionKey";
import { getUserPublicKeys } from "@/app/actions/getUserPublicKey";
import { sendMessage } from "@/app/actions/sendMessage";
import { ensureChatExists } from "@/app/actions/ensureChatExists";
import { CHAT_INACTIVITY_TIMEOUT } from "@/lib/config/chatConfig";
import { importPrivateKey } from "@/lib/crypto/rsa";
import { 
  generateSessionAESKey, 
  exportSessionKey, 
  importSessionKey,
  encryptSessionKeyForUser,
  decryptSessionKey 
} from "@/lib/crypto/sessionKey";
import { encryptMessageWithSession } from "@/lib/crypto/messageEncryption";

function MessageInput() {
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeChatId, setActiveChatId] = useState<string>("");
    const [chatExpired, setChatExpired] = useState(false);
    
    const params = useParams();
    const router = useRouter();
    const chatId = params?.chatid as string;
    const { uid } = useAuth();

    // Check if chat has expired before showing input
    useEffect(() => {
        if (!chatId || !uid || chatId.startsWith("friend_")) return;

        let mounted = true;

        async function checkChatExpiry() {
            try {
                const chatDocRef = doc(db, "chats", chatId);
                const chatSnapshot = await getDoc(chatDocRef);

                if (!mounted) return;

                if (!chatSnapshot.exists()) {
                    console.log("⚠️ MessageInput: Chat document doesn't exist");
                    setChatExpired(true);
                    return;
                }

                const chatData = chatSnapshot.data();
                const lastActivity = chatData.lastActivity;

                if (lastActivity) {
                    const lastActivityTime = lastActivity.toMillis();
                    const now = Date.now();
                    const timeSinceActivity = now - lastActivityTime;

                    if (timeSinceActivity > CHAT_INACTIVITY_TIMEOUT) {
                        console.log(`⏰ MessageInput: Chat expired - hiding input`);
                        setChatExpired(true);
                        return;
                    }
                }

                setChatExpired(false);
            } catch (error) {
                if (!mounted) return;
                console.error("MessageInput: Failed to check chat expiry:", error);
            }
        }

        checkChatExpiry();

        return () => {
            mounted = false;
        };
    }, [chatId, uid]);

    // Initialize session key
    useEffect(() => {
        if (!chatId || !uid || chatId.startsWith("friend_") || chatExpired) return;

        let isMounted = true;

        async function initSessionKey() {
            try {
                if (!uid) {
                    throw new Error("User not authenticated");
                }
                
                console.log("🔑 MessageInput: Initializing session key for chat:", chatId);
                
                // Ensure chat exists (handles cleanup/recreation)
                const chatStatus = await ensureChatExists(chatId, uid);

                if (!chatStatus.success) {
                    console.error("❌ MessageInput: Chat not found:", chatStatus.error);
                    // Redirect to chat list if chat doesn't exist
                    router.replace("/chat");
                    return;
                }

                const currentChatId = chatStatus.chatId;

                if (chatStatus.recreated) {
                    console.log("♻️ MessageInput: Chat was recreated with new ID:", currentChatId);
                    // Navigate to the new chat URL
                    router.replace(`/chat/${currentChatId}`);
                    return; // Exit since we're navigating away
                }

                setActiveChatId(currentChatId);

                const sessionData = await getOrCreateSessionKey(currentChatId, uid);

                if (sessionData.isNew) {
                    // Generate new session key
                    console.log("🆕 MessageInput: Generating new session key for participants:", sessionData.participants);
                    
                    const newSessionKey = await generateSessionAESKey();
                    const sessionKeyBase64 = await exportSessionKey(newSessionKey);

                    const participants = sessionData.participants || [];
                    const encryptedKeys: Record<string, string> = {};

                    // Get public keys for all participants
                    console.log("🔑 MessageInput: Fetching public keys for participants:", participants);
                    const publicKeys = await getUserPublicKeys(participants);
                    console.log("✅ MessageInput: Retrieved public keys for:", Object.keys(publicKeys));

                    for (const participantId of participants) {
                        const publicKeyBase64 = publicKeys[participantId];

                        if (!publicKeyBase64) {
                            throw new Error(`Public key not found for participant ${participantId}`);
                        }

                        console.log(`🔐 MessageInput: Encrypting session key for participant: ${participantId}`);
                        const encryptedForParticipant = await encryptSessionKeyForUser(
                            sessionKeyBase64,
                            publicKeyBase64
                        );

                        encryptedKeys[`encryptedKey_${participantId}`] = encryptedForParticipant;
                        console.log(`✅ MessageInput: Encrypted session key for: ${participantId}`);
                    }

                    // Store encrypted session keys
                    console.log("💾 MessageInput: Storing encrypted session keys for all participants");
                    const storeResult = await storeSessionKey(currentChatId, encryptedKeys);
                    console.log("✅ MessageInput: Session keys stored, session ID:", storeResult.sessionId);

                    if (storeResult.alreadyExisted) {
                        // Race condition: another user created the session first
                        console.log("⚠️ MessageInput: Session already existed, fetching and decrypting the existing session");
                        
                        const existingSessionData = await getOrCreateSessionKey(currentChatId, uid);

                        if (!existingSessionData.isNew) {
                            const indexedDB = await getDB();
                            const privateKeyPKCS8 = await indexedDB.get("keys", "userPrivateKey");

                            if (!privateKeyPKCS8 || typeof privateKeyPKCS8 !== 'string') {
                                console.error("❌ Private key not found in IndexedDB. User needs to log in again.");
                                throw new Error("Private key not found. Please log in again to restore your encryption keys.");
                            }

                            const privateKey = await importPrivateKey(privateKeyPKCS8);
                            const decryptedKeyBase64 = await decryptSessionKey(
                                existingSessionData.encryptedSessionKey,
                                privateKey
                            );

                            const importedSessionKey = await importSessionKey(decryptedKeyBase64);

                            if (isMounted) {
                                setSessionKey(importedSessionKey);
                                console.log("✅ MessageInput: Using existing session key from other user");
                            }
                        } else {
                            throw new Error("Race condition error: expected existing session but got isNew");
                        }
                    } else {
                        // We successfully created the session
                        if (isMounted) {
                            setSessionKey(newSessionKey);
                            console.log("✅ MessageInput: Using newly created session key");
                        }
                    }
                } else {
                    // Decrypt existing session key
                    console.log("🔓 MessageInput: Decrypting existing session key, session ID:", sessionData.sessionId);
                    
                    const indexedDB = await getDB();
                    const privateKeyPKCS8 = await indexedDB.get("keys", "userPrivateKey");

                    if (!privateKeyPKCS8) {
                        console.error("❌ Private key not found in IndexedDB. User needs to log in again.");
                        throw new Error("Private key not found. Please log in again to restore your encryption keys.");
                    }

                    if (typeof privateKeyPKCS8 !== 'string') {
                        console.error('Private key in IndexedDB is not a string:', typeof privateKeyPKCS8);
                        throw new Error("Private key is corrupted. Please log out and log back in.");
                    }

                    const privateKey = await importPrivateKey(privateKeyPKCS8);
                    console.log("🔐 MessageInput: Decrypting session key with user's private key");
                    
                    const decryptedKeyBase64 = await decryptSessionKey(
                        sessionData.encryptedSessionKey,
                        privateKey
                    );

                    console.log("✅ MessageInput: Session key decrypted successfully");
                    
                    const importedSessionKey = await importSessionKey(decryptedKeyBase64);

                    if (isMounted) {
                        setSessionKey(importedSessionKey);
                        console.log("✅ MessageInput: Session key set and ready for encryption/decryption");
                    }
                }
            } catch (err) {
                console.error("❌ MessageInput: Error initializing session key:", err);
                
                if (isMounted) {
                    const errorMessage = err instanceof Error ? err.message : "Failed to initialize encryption";
                    
                    // If chat not found, redirect to /chat with error message
                    if (errorMessage.includes("Chat not found") || errorMessage.includes("not found")) {
                        router.push("/chat?error=notfound");
                        return;
                    }

                    // If private key is missing, redirect to login
                    if (errorMessage.includes("Private key not found") || errorMessage.includes("log in again")) {
                        console.log("↩️ Redirecting to login due to missing encryption keys...");
                        router.push("/login?error=keys_missing");
                        return;
                    }

                    setError(errorMessage);
                }
            }
        }

        initSessionKey();

        return () => {
            isMounted = false;
        };
    }, [chatId, uid, chatExpired]);

    // Don't render input if chat is expired
    if (chatExpired) {
        return null;
    }

    const handleSend = async () => {
        if (!message.trim() || !sessionKey || !uid || !activeChatId) {
            return;
        }

        setSending(true);
        setError(null);

        try {
            console.log("🔐 Encrypting message...");

            // Encrypt message with session key
            const { encryptedContent, iv } = await encryptMessageWithSession(
                message,
                sessionKey
            );

            console.log("📤 Sending encrypted message...");

            // Send encrypted message to server
            await sendMessage(activeChatId, uid, encryptedContent, iv);

            console.log("✅ Message sent successfully");

            // Clear input
            setMessage("");
        } catch (err) {
            console.error("❌ Error sending message:", err);
            setError(err instanceof Error ? err.message : "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div>
            {/* Error Message (BACKEND LOGIC) */}
            {error && (
                <div className="mb-3 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Input Container (FRONTEND STYLING) */}
            <div className="flex items-end gap-3">
                
                {/* TEXTAREA (FRONTEND STYLING) */}
                <textarea
                    className="
                        flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm
                        bg-white text-[#2B1B12]
                        outline-none
                        border border-black/5
                        focus:border-[#AF8F6F]/40
                        shadow-sm
                        disabled:bg-gray-50 disabled:text-gray-400
                    "
                    placeholder={sessionKey ? "Write your message…" : "Setting up encryption..."}
                    value={message}
                    rows={1}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={sending || !sessionKey}
                />

                {/* SEND BUTTON (FRONTEND STYLING + BACKEND LOGIC) */}
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || sending || !sessionKey}
                    className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        transition-all
                        ${
                            message.trim() && !sending && sessionKey
                                ? "bg-[#7A573A] hover:bg-[#6A4B33] shadow-md shadow-black/10"
                                : "bg-[#CFC5BA] cursor-not-allowed"
                        }
                    `}
                >
                    {sending ? (
                        <svg
                            className="w-4 h-4 text-white animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    ) : (
                        <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M22 2L11 13"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M22 2L15 22l-4-9-9-4 20-7z"
                            />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}

export default MessageInput;
