"use client";

import { useParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import MessageInput from "@/app/components/messageinput";
import MessageBox from "../../layout/messageBox";
import ContactInfo from "@/app/components/ContactInfo";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useChatContext } from "@/lib/context/ChatContext";
import { CHAT_INACTIVITY_TIMEOUT } from "@/lib/config/chatConfig";
import LoadingScreen from "@/app/components/LoadingScreenFixed";
import { useRouter } from "next/navigation";
import { ChatSessionProvider } from "@/lib/context/ChatSessionContext";

export default function ChatDetailPage() {
    const params = useParams();
    const chatId = params?.chatid as string;
    const { user, loading } = useRequireAuth();
    const uid = user?.uid;
    const { getChatMetadata } = useChatContext();
    const [chatExpired, setChatExpired] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const router = useRouter();

    // Get chat metadata from context
    const chatMetadata = getChatMetadata(chatId);
    const otherUsername = chatMetadata?.username || "Loading...";
    const otherUserInitial = chatMetadata?.userInitial || "?";

    // Real-time countdown monitoring (BACKEND LOGIC)
    useEffect(() => {
        if (!chatId || !uid || chatId.startsWith("friend_")) return;

        let mounted = true;
        let lastActivityTime: number | null = null;
        const chatDocRef = doc(db, "chats", chatId);

        // Function to update countdown and check expiry
        const updateCountdown = () => {
            if (!mounted || !lastActivityTime) return;

            const now = Date.now();
            const timeSinceActivity = now - lastActivityTime;
            const remaining = CHAT_INACTIVITY_TIMEOUT - timeSinceActivity;

            // If expired
            if (remaining <= 0) {
                setChatExpired(true);
                setTimeRemaining(null);
                return;
            }

            // Show countdown if less than 5 minutes remaining
            const fiveMinutes = 5 * 60 * 1000;
            if (remaining <= fiveMinutes) {
                setTimeRemaining(Math.ceil(remaining / 1000));
            } else {
                setTimeRemaining(null);
            }
        };

        const checkInterval: NodeJS.Timeout = setInterval(updateCountdown, 1000);

        // Set up real-time listener
        const unsubscribe = onSnapshot(
            chatDocRef,
            (snapshot) => {
                if (!mounted) return;

                if (!snapshot.exists()) {
                    setChatExpired(true);
                    setTimeRemaining(null);
                    return;
                }

                const chatData = snapshot.data();
                if (chatData.lastActivity) {
                    lastActivityTime = chatData.lastActivity.toMillis();
                    updateCountdown();
                }
            },
            (error) => {
                if (!mounted) return;
            }
        );

        return () => {
            mounted = false;
            unsubscribe();
            clearInterval(checkInterval);
        };
    }, [chatId, uid]);

    // Format countdown as MM:SS
    const formatCountdown = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <LoadingScreen mode="logout" />;
    }

    return (
        <ChatSessionProvider key={`${uid ?? "anon"}:${chatId}`} chatId={chatId} uid={uid ?? null}>
        <div className="relative flex flex-col h-dvh md:h-full bg-[#F6F1E3]">
            {/* ================= CHAT HEADER (FRONTEND STYLING) ================= */}
            <div
                className="fixed md:relative top-0 left-0 right-0 h-14 px-3 md:px-6 w-full z-20 flex items-center justify-between
                           bg-[#E6D5BC]
                           border border-[#74512D]/15"
            >
                {/* Mobile Menu Button */}
                <button
                    onClick={() => {router.push("/chat");}}
                    className="
                        cursor-pointer md:hidden
                        w-9 h-9 flex items-center justify-center rounded-full
                        bg-[#74512D]/10 text-[#74512D]
                        hover:bg-[#74512D]/20
                        active:scale-95
                        transition mr-2
                    "
                    aria-label="Back"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                    </svg>
                </button>

                {/* User Info */}
                <div
                    onClick={() => setShowProfile(true)}
                    className="flex items-center gap-2 md:gap-3 cursor-pointer
                               hover:opacity-80 transition flex-1 min-w-0"
                >
                    <div
                        className="w-8 h-8 rounded-full bg-white border border-black/10
                                   flex items-center justify-center flex-shrink-0
                                   text-xs font-medium text-[#2B1B12]"
                    >
                        {otherUserInitial}
                    </div>

                    <div className="leading-tight min-w-0">
                        <p className="text-sm font-medium text-[#2B1B12] truncate">
                            {otherUsername}
                        </p>
                        <p className="text-[11px] text-black/50 truncate">
                            End-to-end encrypted
                        </p>
                    </div>
                </div>

                {/* Countdown Timer (BACKEND FEATURE) */}
                {timeRemaining !== null && (
                    <div
                        className={`
                            flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg
                            text-sm font-semibold flex-shrink-0
                            ${timeRemaining <= 60
                                ? 'bg-red-50 border border-red-200 text-red-600'
                                : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                            }
                        `}
                    >
                        <span className="text-base hidden xs:inline">⏱️</span>
                        <span className="text-xs md:text-sm">{formatCountdown(timeRemaining)}</span>
                    </div>
                )}
            </div>

            {/* Mobile spacer so fixed navbar never overlaps top messages */}
            <div className="h-14 md:hidden flex-shrink-0" />

            {/* ================= MESSAGES (BACKEND COMPONENT) ================= */}
            <div className="flex-1 overflow-y-auto chat-scroll px-3 md:px-6 pt-4 md:pt-6 pb-32 md:pb-28">
                <MessageBox />
            </div>

            {/* ================= INPUT (BACKEND COMPONENT - only if not expired) ================= */}
            {!chatExpired && (
            <div className="
                fixed md:absolute
                bottom-4
                left-0 right-0
                md:left-0 md:right-0
                w-full
                px-3 md:px-6
                z-40
            ">
            <div className="
                w-full
                rounded-3xl
                bg-white/90 backdrop-blur-xl
                border border-[#74512D]/15
                shadow-[0_20px_40px_rgba(0,0,0,0.18)]
                px-2 py-2
            ">
                <MessageInput />
            </div>
            </div>
            )}

            {/* ================= CONTACT INFO SHEET (FRONTEND FEATURE) ================= */}
            <AnimatePresence>
                {showProfile && (
                    <ContactInfo onClose={() => setShowProfile(false)} />
                )}
            </AnimatePresence>
        </div>
        </ChatSessionProvider>
    );
}

