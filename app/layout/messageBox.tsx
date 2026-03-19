"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/context/AuthContext";
import { decryptMessageWithSession } from "@/lib/crypto/messageEncryption";
import MessageComponent from "@/app/components/messageComponent";
import { useChatSession } from "@/lib/context/ChatSessionContext";

interface Message {
  id: string;
  senderId: string;
  encryptedContent: string;
  iv: string;
  createdAt: unknown;
  type: string;
  text?: string; // For system messages
  decryptedText?: string; // Added after decryption
}

function MessageBox() {
  const { uid } = useAuth();
  const { activeChatId, sessionKey, loading, error, chatExpired, isCleaningUp } = useChatSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen to messages in real-time
  useEffect(() => {
    if (!activeChatId || !sessionKey || chatExpired) return;

    let mounted = true;
    console.log("👂 Setting up real-time message listener");

    const messagesRef = collection(db, "chats", activeChatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!mounted) return;
      
      const fetchedMessages: Message[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          senderId: data.senderId,
          encryptedContent: data.encryptedContent,
          iv: data.iv,
          createdAt: data.createdAt,
          type: data.type || "text",
          text: data.text, // For system messages
        });
      }

      // Decrypt all messages
      const decryptedMessages = await Promise.all(
        fetchedMessages.map(async (msg) => {
          try {
            if (msg.type === "text" && msg.encryptedContent && msg.iv) {
              const decrypted = await decryptMessageWithSession(
                msg.encryptedContent,
                msg.iv,
                sessionKey
              );
              return { ...msg, decryptedText: decrypted };
            } else if (msg.type === "friend_connected" || msg.type === "chat_recreated") {
              // System messages (not encrypted)
              return { ...msg, decryptedText: msg.text || "System message" };
            }
            return msg;
          } catch (err) {
            console.error("Failed to decrypt message:", msg.id, err);
            return { ...msg, decryptedText: "[Decryption failed]" };
          }
        })
      );

      if (mounted) {
        setMessages(decryptedMessages);
      }
    });

    return () => {
      mounted = false;
      console.log("🔇 Unsubscribing from messages");
      unsubscribe();
    };
  }, [activeChatId, sessionKey, chatExpired]);

  // Handle expired chat with loading
  if (chatExpired) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center max-w-md item-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-20 h-20 mx-auto block mb-4">
              <path fill="#6b4a2e" d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"/>
            </svg>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Chat Expired</h2>
          <p className="text-gray-600 mb-4">
            This chat has been inactive for too long and has expired for security reasons.
          </p>
          {isCleaningUp ? (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-4">  
                Cleaning up and preparing fresh encryption keys...
              </p>
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-6">
              Redirecting to chat list...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">Setting up secure connection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!sessionKey) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">Setting up secure connection...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-10">
      {messages.map((msg) => (
        <MessageComponent
          key={msg.id}
          messageText={msg.decryptedText || "[Encrypted]"}
          from={msg.senderId === uid ? "send" : "receive"}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageBox;