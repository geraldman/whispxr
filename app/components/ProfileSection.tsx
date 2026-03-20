"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/context/AuthContext";
import SettingsMenu from "./SettingsMenu";
import NotificationBadge from "./NotificationBadge";
import type { SettingsView } from "@/app/chat/layout";

export default function ProfileSection() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [settingsView, setSettingsView] = useState<SettingsView>("profile");

  useEffect(() => {
    if (!user?.uid) return;

    async function fetchProfile() {
      if (!user?.uid) return; // TypeScript safety check
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setProfile(snap.data());
      }
    }

    fetchProfile();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setRequestCount(0);
      return;
    }

    let mounted = true;

    // Real-time listener for friend requests
    const requestsQuery = query(
      collection(db, "friend_requests"),
      where("to", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        if (!mounted) return;
        setRequestCount(snapshot.docs.length);
      },
      (error) => {
        if (!mounted) return;
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.uid]);

  return (
    <div
      style={{
        padding: 16,
        borderBottom: "1px solid #eee",
      }}
    >
      {/* EMAIL + SETTINGS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>{user?.email}</strong>
        <div
          style={{
            position: "relative",
            cursor: "pointer",
            display: "inline-block",
          }}
          onClick={() => setOpenSettings((v) => !v)}
        >
          <span>⚙️</span>
          <NotificationBadge count={requestCount} />
        </div>
      </div>

      {/* USER INFO */}
      <div style={{ marginTop: 8, fontSize: 14, color: "#555" }}>
        <div>Username: {profile?.username || (user as any)?.username || "-"}</div>
        <div>User ID: {profile?.numericId || (user as any)?.numericId || "00000000"}</div>
      </div>

      {/* SETTINGS MENU */}
      {openSettings && (
        <SettingsMenu
          active={settingsView}
          onChange={setSettingsView}
        />
      )}
    </div>
  );
}
