"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { sendMessage } from "@/app/actions/sendMessage";
import { encryptMessageWithSession } from "@/lib/crypto/messageEncryption";
import { useChatSession } from "@/lib/context/ChatSessionContext";

function MessageInput() {
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { uid } = useAuth();
    const { activeChatId, sessionKey, chatExpired, loading } = useChatSession();

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

            // Encrypt message with session key
            const { encryptedContent, iv } = await encryptMessageWithSession(
                message,
                sessionKey
            );


            // Send encrypted message to server
            await sendMessage(activeChatId, uid, encryptedContent, iv);


            // Clear input
            setMessage("");
        } catch (err) {
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
                    disabled={sending || loading || !sessionKey}
                />

                {/* SEND BUTTON (FRONTEND STYLING + BACKEND LOGIC) */}
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || sending || loading || !sessionKey}
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
