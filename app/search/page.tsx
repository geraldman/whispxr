"use client";

import { useState } from "react";
import { searchUserByNumericId } from "@/app/actions/searchUser";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import LoadingScreen from "@/app/components/LoadingScreenFixed"

export default function SearchUserPage() {
  const { user, loading: authLoading } = useRequireAuth();
  
  // All hooks MUST be called before any conditional returns
  const [numericId, setNumericId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | {
    uid: string;
    username: string;
    numericId: string;
  }>(null);

  // Now we can do conditional returns
  if (authLoading || !user) {
    return <LoadingScreen />;
  }

  async function handleSearch() {
    setError("");
    setResult(null);

    if (!/^\d{8}$/.test(numericId)) {
      setError("Numeric ID harus 8 digit");
      return;
    }

    setLoading(true);
    try {
      const res = await searchUserByNumericId(numericId);

      if (!res.found || !res.user) {
        setError("User tidak ditemukan");
      } else {
        setResult(res.user);
      }
    } catch (err: any) {
      setError("Terjadi kesalahan server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Search User</h2>

      <input
        placeholder="Masukkan Numeric ID (8 digit)"
        value={numericId}
        onChange={(e) => setNumericId(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <button
        onClick={handleSearch}
        disabled={loading}
        style={{ marginTop: 12, width: "100%" }}
      >
        {loading ? "Searching..." : "Search"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 12 }}>{error}</p>
      )}

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            border: "1px solid #ccc",
          }}
        >
          <p><strong>Username:</strong> {result.username}</p>
          <p><strong>Numeric ID:</strong> {result.numericId}</p>

          {/* future action */}
          <button style={{ marginTop: 8 }}>
            Add Friend / Start Chat
          </button>
        </div>
      )}
    </div>
  );
}
