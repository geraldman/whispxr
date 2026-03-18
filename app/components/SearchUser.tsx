'use client';

import { useState } from 'react';
import { searchUserByNumericId } from "@/app/actions/searchUser";

export type SearchedUser = {
  id: string;
  name: string;
  isFriend: boolean;
};

export default function SearchUser({
  onSearchResult,
}: {
  onSearchResult: (user: SearchedUser | null) => void;
}) {
  const [numericId, setNumericId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setError('');
    onSearchResult(null);

    if (!/^\d{8}$/.test(numericId)) {
      setError('ID needs to be 8 digits');
      return;
    }

    setLoading(true);
    
    // BACKEND: Real search using server action
    const res = await searchUserByNumericId(numericId);
    
    setLoading(false);

    if (!res.found) {
      setError('User tidak ditemukan');
    } else if (res.user) {
      // Map the response to match SearchedUser type
      onSearchResult({
        id: res.user.uid,
        name: res.user.username,
        isFriend: false // Will be determined by parent
      });
    }
  }

  return (
    <div className={`px-4 ${error ? "" : "mb-4"}`}>
      <div className="flex items-center gap-2 bg-white rounded-full px-3 sm:px-4 py-2 border border-[#74512D]/15 shadow-sm">
        <input
          value={numericId}
          onChange={(e) => setNumericId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by User ID"
          className="flex-1 min-w-0 bg-transparent text-sm outline-none
                     placeholder:text-[#8A7F73] text-[#543310]"
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          className="disabled:opacity-50 flex-shrink-0"
        >
          <svg
            className="w-5 h-5 text-[#8A7F73]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>

      {error ? (
        <p className="my-2 text-xs text-red-600 px-2">
          {error}
        </p>
      ) : ""}
    </div>
  );
}
