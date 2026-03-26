"use client";

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

interface ChatMetadata {
  username: string;
  userInitial: string;
  userId: string;
}

interface ChatContextType {
  chatMetadata: Record<string, ChatMetadata>;
  setChatMetadata: (chatId: string, metadata: ChatMetadata) => void;
  getChatMetadata: (chatId: string) => ChatMetadata | null;
}

const ChatContext = createContext<ChatContextType>({
  chatMetadata: {},
  setChatMetadata: () => {},
  getChatMetadata: () => null,
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatMetadata, setChatMetadataState] = useState<Record<string, ChatMetadata>>({});

  // Lightweight client cache: prevents repeated user lookups when rendering chat header/list.
  const setChatMetadata = useCallback((chatId: string, metadata: ChatMetadata) => {
    setChatMetadataState((prev) => {
      const existing = prev[chatId];
      if (
        existing?.username === metadata.username &&
        existing?.userInitial === metadata.userInitial &&
        existing?.userId === metadata.userId
      ) {
        return prev;
      }

      return {
        ...prev,
        [chatId]: metadata,
      };
    });
  }, []);

  // Returns null until metadata is discovered and injected by ChatList.
  const getChatMetadata = useCallback((chatId: string): ChatMetadata | null => {
    return chatMetadata[chatId] || null;
  }, [chatMetadata]);

  const contextValue = useMemo(
    () => ({ chatMetadata, setChatMetadata, getChatMetadata }),
    [chatMetadata, setChatMetadata, getChatMetadata]
  );

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}
