'use client';

import { useEffect, useState } from 'react';
import { ChatProvider } from '@/lib/context/ChatContext';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import ChatSidebar from '@/app/components/ChatSidebar';
import SettingsContent from '@/app/components/SettingsContent';
import UserProfilePanel from '@/app/components/AddUser';
import LoadingScreen from '@/app/components/LoadingScreenFixed';
import type { SearchedUser } from '@/app/components/SearchUser';
import MobileBottomNav from '@/app/components/MobileBottomNav';
import SearchUser from "@/app/components/SearchUser";
import LogoutModal from '@/app/components/modals/LogoutModal';
import SettingsMenu from '@/app/components/SettingsMenu';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { usePathname } from "next/navigation";
import { useRouter } from 'next/navigation';
import { performLogout } from '@/lib/utils/logout';

export type SidebarMode = 'chat' | 'settings';
export type SettingsView = 'profile' | 'requests' | 'about';

function ChatLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth();
  const [mode, setMode] = useState<SidebarMode>('chat');
  const [settingsView, setSettingsView] =
    useState<SettingsView>('profile');
  const [searchedUser, setSearchedUser] =
    useState<SearchedUser | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const pathname = usePathname();
  const isChatRoom =
    pathname?.startsWith("/chat/") && pathname !== "/chat";
  const [mobileSettingsView, setMobileSettingsView] =
    useState<SettingsView | null>(null);
  const router = useRouter();
  
    useEffect(() => {
      if (!user?.uid) return;

      const q = query(
        collection(db, "friend_requests"),
        where("to", "==", user.uid),
        where("status", "==", "pending")
      );

      const unsub = onSnapshot(q, (snap) => {
        setRequestCount(snap.size);
      });

      return () => unsub();
    }, [user?.uid]);
    
    if (loading || !user) {
    return <LoadingScreen />;
  }

  return (
  <div className="min-h-[100dvh] bg-[#F6F1E3] relative">

    {/* ================= DESKTOP LAYOUT ================= */}
    <div className="hidden md:flex h-screen min-w-max">

      <ChatSidebar
        mode={mode}
        settingsView={settingsView}
        onOpenSettings={() => setMode('settings')}
        onBackToChat={() => setMode('chat')}
        onChangeSettingsView={setSettingsView}
        onSearchUser={setSearchedUser}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-hidden w-full md:w-auto">
        {mode === 'settings' ? (
          <SettingsContent 
            view={settingsView} 
            onBack={() => setSidebarOpen(true)} 
          />
        ) : searchedUser ? (
          <div className="h-full w-full">
            <UserProfilePanel 
              user={searchedUser} 
              onBack={() => setSearchedUser(null)}
            />
          </div>
        ) : (
          <div className="h-full w-full">
            {children}
          </div>
        )}
      </main>
    </div>

    {/* ================= MOBILE LAYOUT ================= */}
    <div className="md:hidden h-full flex flex-col">

    {/* MOBILE STICKY HEADER */}
    {!isChatRoom && (
    <div className="md:hidden sticky top-0 z-40 bg-[#F8F4E1] border-b border-[#74512D]/15">
    <div className="px-4 pt-3 pb-3 flex flex-col gap-3">

      {/* Top row */}
      <div className="flex items-center justify-between">

      {/* Logo */}
      <img src="/logo.png" className="w-20 h-10 object-cover" />

      {/* Logout button */}
      <TooltipIconButton
        label="Logout"
        onClick={() => setShowLogout(true)}
      >
        <LogoutIcon />
      </TooltipIconButton>
      </div>

      {/* Search only in chat mode */}
      {mode === 'chat' && !isChatRoom && (
        <SearchUser onSearchResult={setSearchedUser} />
      )}

    </div>
    </div>
    )}

      {/* MOBILE BODY */}
      <div className="flex-1 overflow-hidden">
        {mode === 'settings' ? (
        mobileSettingsView ? (
          <SettingsContent
            view={mobileSettingsView}
            onBack={() => setMobileSettingsView(null)}
          />
        ) : (
          <SettingsMenu
            active={mobileSettingsView}
            onChange={(v) => setMobileSettingsView(v)}
            requestCount={requestCount}
          />
          )
        ) : searchedUser ? (
        <UserProfilePanel
          user={searchedUser}
          onBack={() => setSearchedUser(null)}
        />
        ) : (
        children
        )}
      </div>

      {/* MOBILE NAV */}
      {!isChatRoom && (
      <MobileBottomNav
        mode={mode}
        onMessages={() => setMode('chat')}
        onSettings={() => setMode('settings')}
        requestCount={requestCount}
      />
      )}
    </div>
    
    <LogoutModal
      open={showLogout}
      onCancel={() => setShowLogout(false)}
      onConfirm={() => performLogout(router)}
    />
    
  </div>
);
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatProvider>
      <SidebarProvider>
        <ChatLayoutInner>{children}</ChatLayoutInner>
      </SidebarProvider>
    </ChatProvider>
  );
}

function LogoutIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M10 17l5-5-5-5" />
    </svg>
  );
}

function TooltipIconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        aria-label={label}
        className="
          cursor-pointer w-9 h-9 flex items-center justify-center rounded-lg
          bg-[#6B4A2E] text-white
          hover:bg-[#5A3F27]
          active:scale-95
          transition shadow-sm hover:shadow
        "
      >
        {children}
      </button>

      {/* Tooltip */}
      <span
        className="
          pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2
          rounded-md bg-[#543310] px-2 py-0.5 text-[10px] text-white
          opacity-0 group-hover:opacity-100 transition whitespace-nowrap
        "
      >
        {label}
      </span>
    </div>
  );
}