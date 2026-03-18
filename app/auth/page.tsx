"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

import { getUserKeys, storeUserKeys } from "@/app/actions/auth";
import { deleteUserAccount } from "@/app/actions/deleteUser";
import { routes } from "@/app/routes";
import { useAuth } from "@/lib/context/AuthContext";
import { getDB } from "@/lib/db/indexeddb";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/firebase";
import { deriveKeyFromPassword } from "@/lib/crypto/keyStore";
import { aesDecrypt } from "@/lib/crypto/aes";
import { createAccountProcedureSimplified } from "@/lib/crypto";
import LoadingScreen from "@/app/components/LoadingScreenFixed";

type AuthMode = "login" | "register";

function AuthPageContent() {
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Check for error query parameter
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "keys_missing") {
      setError("Your encryption keys are missing. Please log in again to restore them.");
    }
  }, [searchParams]);

  // Check for action query parameter to set mode
  useEffect(() => {
    const actionParam = searchParams.get("action");
    if (actionParam === "login") {
      setMode("login");
    } else if (actionParam === "register") {
      setMode("register");
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace(routes.chats);
    }
  }, [user, router]);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleLogin() {
    if (loading) return;

    setError("");
    setSuccessMessage("");
    setLoading(true);

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (!password) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      console.log("Authenticating with Firebase...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      console.log("Fetching encrypted keys...");
      const keysResult = await getUserKeys(uid);
      
      if (!keysResult.success) {
        setError(keysResult.error || "Failed to fetch keys");
        return;
      }
      
      console.log("Decrypting private key on client...");
      const kdfPassword = await deriveKeyFromPassword(password, keysResult.salt);
      
      const ivArray = Array.from(Uint8Array.from(atob(keysResult.iv), c => c.charCodeAt(0)));
      const dataArray = Array.from(Uint8Array.from(atob(keysResult.encryptedPrivateKey), c => c.charCodeAt(0)));
      
      const decryptedPrivateKeyBase64 = await aesDecrypt(kdfPassword, ivArray, dataArray);

      console.log("Storing keys in IndexedDB...");
      const db = await getDB();
      await db.put("keys", decryptedPrivateKeyBase64, "userPrivateKey");
      await db.put("keys", keysResult.publicKey, "userPublicKey");
      
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("Login successful!");
      router.replace(routes.chats);

    } catch (err: any) {
      console.error("Login exception:", err);
      setError(err.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    try {

      let userCredential = null;

      if (!username.trim()) {
        setError("Username is required");
        return;
      }

      if (username.trim().length < 3) {
        setError("Username must be at least 3 characters");
        return;
      }

      if (!email.trim()) {
        setError("Email is required");
        return;
      }

      if (!isValidEmail(email.trim())) {
        setError("Please enter a valid email address");
        return;
      }

      if (!password) {
        setError("Password is required");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      setError("");
      setSuccessMessage("");
      setLoading(true);

      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const encryptionResult = await createAccountProcedureSimplified(password);
        const result = await storeUserKeys(uid, email, username, 
          encryptionResult.publicKey,
          encryptionResult.encryptedPrivateKey,
          encryptionResult.iv,
          encryptionResult.salt
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to store encryption keys");
        }

      } catch (err: any) {
        // Cleanup Firebase user if it was created
        if (userCredential?.user) {
          await signOut(auth).catch(() => {});
          await deleteUserAccount(userCredential.user.uid).catch(e => 
            console.error("Failed to delete Firebase user:", e)
          );
        }
        setError(err.message || "An unexpected error occurred. Please try again.");

      } finally {
        setLoading(false);
      }
    } catch (unexpectedErr: any) {
      console.error("Unexpected error in handleRegister:", unexpectedErr);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  const handleSubmit = mode === "login" ? handleLogin : handleRegister;
  function onFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSubmit();
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {loading && <LoadingScreen />}

      {!loading && (
        <div className="w-full min-h-[100dvh] flex flex-col bg-[#F8F4E1] px-4 relative">

          <div className="flex-1 flex flex-col justify-start sm:justify-center items-center pt-16 pb-10 sm:py-10">
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg mt-6 sm:mt-4"
          >
            <form onSubmit={onFormSubmit}>
            {/* Back */}
            <button type="button"
              onClick={() => router.push(routes.home)}
              className="cursor-pointer mb-4 w-9 h-9 rounded-full flex items-center justify-center
                         bg-[#74512D]/10 text-[#74512D]
                         hover:bg-[#74512D]/20 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Title */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-semibold text-[#5C3A21] mb-1 text-center"
              >
                {mode === "login" ? "Login to Whispxr" : "Create your Whispxr account"}
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.p
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-[13px] text-black/70 text-center mb-8"
              >
                {mode === "login" 
                  ? "Enter your email and password to continue."
                  : "Sign up to start secure conversations."}
              </motion.p>
            </AnimatePresence>

            {/* Auth Mode Switch */}
            <div className="mb-6">
              <div className="relative flex bg-[#74512D]/10 rounded-full p-1">
                <motion.div 
                  className="absolute top-1 bottom-1 w-1/2 bg-white rounded-full shadow"
                  animate={{ 
                    x: mode === "login" ? 0 : "96%" 
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ left: "0.25rem" }}
                />
                <button type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="cursor-pointer relative z-10 w-1/2 py-2 text-sm font-medium transition-colors"
                  style={{ color: mode === "login" ? "#5C3A21" : "rgba(92, 58, 33, 0.6)" }}
                >
                  Login
                </button>
                <button type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="cursor-pointer relative z-10 w-1/2 py-2 text-sm font-medium transition-colors"
                  style={{ color: mode === "register" ? "#5C3A21" : "rgba(92, 58, 33, 0.6)" }}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Username - Only for Register */}
                {mode === "register" && (
                  <div className="mb-4">
                    <label className="block text-sm text-[#5C3A21] mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="whispxr_user"
                      className="w-full rounded-xl bg-white px-4 py-3 text-sm
                                 border border-[#74512D]/20
                                 focus:ring-2 focus:ring-[#74512D]/40 outline-none"
                    />
                  </div>
                )}

                {/* Email */}
                <div className="mb-4">
                  <label className="block text-sm text-[#5C3A21] mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="whispxr@example.com"
                    className="w-full rounded-xl bg-white px-4 py-3 text-sm
                               border border-[#74512D]/20
                               focus:ring-2 focus:ring-[#74512D]/40 outline-none"
                  />
                </div>

                {/* Password */}
                <div className="mb-2">
                  <label className="block text-sm text-[#5C3A21] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-white px-4 py-3 pr-12 text-sm
                                 border border-[#74512D]/20
                                 focus:ring-2 focus:ring-[#74512D]/40 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                                 text-[#74512D]/60 hover:text-[#74512D]"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" strokeWidth="2"
                           strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
                        <circle cx="12" cy="12" r="3" />
                        {!showPassword && (
                          <line x1="3" y1="3" x2="21" y2="21" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Forgot Password - Only for Login */}
                {mode === "login" && (
                  <div className="flex justify-end mt-2">
                    <button type="button"
                      onClick={() => router.push(routes.forgotPassword)}
                      className="cursor-pointer text-[13px] text-[#74512D]/80 hover:text-[#74512D] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Error & Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 flex items-start gap-2 rounded-xl
                            bg-red-50 border border-red-200
                            px-3 py-2 text-sm text-red-700"
                  >
                  {/* icon */}
                  <svg width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="mt-[2px] shrink-0"
                  >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="16" r="1" fill="currentColor" />
                  </svg>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 flex items-start gap-2 rounded-xl
                            bg-green-50 border border-green-200
                            px-3 py-2 text-sm text-green-700"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  </svg>
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button type="submit" disabled={loading}
              className="cursor-pointer mt-6 w-full rounded-xl bg-[#74512D] py-3
                         text-white font-medium
                         shadow-md shadow-[#74512D]/30
                         hover:-translate-y-0.5 hover:shadow-lg
                         transition-all"
            >
              {mode === "login" ? "Login" : "Register"}
            </button>
            </form>
          </motion.div>
          </div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="w-full text-center pb-6"
          >
            <p className="text-xs text-black/40 hover:text-black/70 transition">
              © 2026 WHISPXR • All rights reserved.
            </p>
          </motion.footer>
        </div>
      )}
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthPageContent />
    </Suspense>
  );
}
