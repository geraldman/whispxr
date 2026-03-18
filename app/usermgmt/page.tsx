"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase/firebase";
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { handleForgotPassword } from "../actions/handleForgotPassword";
import { routes } from "@/app/routes";
import LoadingScreen from "../components/LoadingScreenFixed";
import { createAccountProcedure } from "@/lib/cryptoAdvanced";
import { createAccountProcedureSimplified } from "@/lib/crypto";

export default function UserManagementPage(){
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isEmailValidate, setEmailVal] = useState(false);
  const [password, setPassword] = useState("");
  const [secondPassword, setSecondPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const mode = searchParams.get("mode");
  const actionCode = searchParams.get("oobCode");
  const continueUrl = searchParams.get("continueUrl");
  const lang = searchParams.get("lang"); 

  function onFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    // fill the function here
  }

  useEffect(() => {
    if (!actionCode) {
      router.replace("/auth");
      return;
    }

    async function verifyCode() {
      try {
        await verifyPasswordResetCode(auth, actionCode!);
        setEmailVal(true);
      } catch (error) {
        // invalid or expired code

        router.replace("/auth");
      } finally {
        setLoading(false); // ← this triggers the loading screen to go away
      }
    }   

    verifyCode();
  }, [actionCode]);

  useEffect(() => {
    if(password !== "" && secondPassword !== "" && password !== secondPassword){
      setError("Password is not same");
    }
  }, [password, secondPassword]);

  async function handleChangePassword(){
    try{
      const success = await confirmPasswordReset(auth, actionCode!, password);
      
      // TODO: changing the key - WIP
      const newEncryptionKeys = await createAccountProcedureSimplified(password);


      setSuccess(true);
      router.replace('/auth');
    }
    catch(error){
      setError("An error occured");
    }
  }

  if(loading){
    return <LoadingScreen/>
  }

  return (
    <div className="w-full min-h-[100dvh] flex flex-col bg-[#F8F4E1] px-4 relative">

      {/* Logo */}
      <div className="flex-1 flex items-center justify-center py-10">
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg"
      >
        <form onSubmit={onFormSubmit}>
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-semibold text-[#5C3A21] mb-1 text-center mt-2"
        >
          Reset Your Password
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-[13px] text-black/70 text-center mb-6"
        >
          Create a new password for your account. 
        </motion.p>

        {/* Password */}
        <div className="mb-2">
            <label className="block text-sm text-[#5C3A21] mb-1">
                Password
            </label>
            <div className="relative">
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-white px-4 py-3 pr-12 text-sm
                                border border-[#74512D]/20
                                focus:ring-2 focus:ring-[#74512D]/40 outline-none"
                />
            </div>
        </div>
        <div className="mb-2">
            <label className="block text-sm text-[#5C3A21] mb-1">
                Re-enter your password
            </label>
            <div className="relative">
                <input
                    type="password"
                    value={secondPassword}
                    onChange={(e) => setSecondPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-white px-4 py-3 pr-12 text-sm
                                border border-[#74512D]/20
                                focus:ring-2 focus:ring-[#74512D]/40 outline-none"
                />
            </div>
        </div>


        {/* Error / Success */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-sm text-red-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || !isEmailValidate}
          className="cursor-pointer mt-6 w-full rounded-xl bg-[#74512D] py-3
                     text-white font-medium
                     shadow-md shadow-[#74512D]/30
                     transition-all duration-200 ease-out
                     hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#74512D]/40
                     hover:bg-[#6A4627]
                     active:translate-y-0 active:shadow-sm
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Processing…" : "Change Password"}
        </button>
        </form>
      </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full text-center pb-6"
      >
        <p className="text-xs text-black/40 hover:text-black/70 transition">
          © 2026 WHISPXR • All rights reserved.
        </p>
      </motion.footer>
    </div>
  );
}
