"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/context/AuthContext";
import { acceptFriendRequest } from "@/app/actions/friend/acceptFriendRequest";

interface FriendRequest {
  id: string;
  from: string;
  fromUsername: string | null;
  to: string;
  status: string;
  chatId?: string;
  createdAt: number | null;
}

export default function RequestsContent({ onBack }: { onBack: () => void }) {
  const { uid } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!uid) return;

    // Real-time listener for friend requests
    const requestsQuery = query(
      collection(db, "friend_requests"),
      where("to", "==", uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const reqData = doc.data();
          return {
            id: doc.id,
            from: reqData.from,
            fromUsername: reqData.fromUsername ?? null,
            to: reqData.to,
            status: reqData.status,
            chatId: reqData.chatId,
            createdAt: reqData.createdAt ? reqData.createdAt.toMillis() : null,
          };
        });

        // Only show requests with valid username
        const validRequests = data.filter(
          (r) => typeof r.fromUsername === "string" && r.fromUsername.trim() !== ""
        );

        setRequests(validRequests);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  async function handleAccept(reqId: string) {
    try {
      const result = await acceptFriendRequest(reqId);

      // Navigate to the newly created chat
      if (result.chatId) {
        router.push(`/chat/${result.chatId}`);
      }
    } catch (error) {
    }
  }

  return (
    <Section
      title="Friend Requests"
      description="Manage incoming connection requests"
      onBack={onBack}
    >
      {loading ? (
        <p className="text-sm text-[#74512D]/70">Loading requests...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-[#74512D]/70">No pending requests.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg px-4 py-3 border border-[#D4C4A8] shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#543310]">
                    {request.fromUsername}
                  </p>
                  <p className="text-xs text-[#74512D]/70 mt-0.5">
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleDateString()
                      : "Recently"}
                  </p>
                </div>
                <button
                  onClick={() => handleAccept(request.id)}
                  className="
                    px-4 py-2 rounded-lg
                    bg-[#74512D] text-white text-sm font-medium
                    hover:bg-[#543310]
                    transition-colors duration-200
                  "
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Section({
  title,
  description,
  children,
  onBack,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="h-full bg-[#F6F1E3] px-10 py-8">
      {/* Back Button - Mobile Only */}
      <button
        type="button"
        onClick={onBack}
        className="md:hidden cursor-pointer mb-4 w-9 h-9 rounded-full flex items-center justify-center
              bg-[#74512D]/10 text-[#74512D]
              hover:bg-[#74512D]/20 active:scale-95 transition"
        aria-label="Back"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M15 18l-6-6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <h1 className="text-xl font-semibold text-[#543310]">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-[#74512D]/70 mt-1 mb-6">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
