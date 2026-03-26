"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { routes } from "./routes";
import LiquidEtherBG from "./components/background";
import AvatarGroup from "./components/avatarGroup";
import { useAuth } from "@/lib/context/AuthContext";
import LoadingScreen from "@/app/components/LoadingScreenFixed";

export default function Home() {

  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (process.env.NODE_ENV === "development") {
  }

  return (
    <main className="w-full min-h-[100dvh] overflow-x-hidden bg-[#F8F4E1]">
      <section className="relative min-h-[100dvh] px-4 sm:px-6 lg:px-8">
        {/* Background */}
        <div className="absolute inset-0 bg-[#F8F4E1] z-10 pointer-events-none">
          <LiquidEtherBG
            colors={["#5C3A21", "#AF8F6F", "#F8F4E1"]}
            mouseForce={20}
            cursorSize={100}
          />
        </div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute top-0 left-4 sm:left-6 lg:left-20 z-30 flex items-center gap-2"
        >
          <Image
            src="/logo.png"
            alt="WHISPXR Logo"
            width={100}
            height={100}
            className="w-17 h-12 object-cover md:w-22 mt-4"
          />
        </motion.div>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="absolute top-4 right-4 sm:top-6 sm:right-8 lg:right-20 z-30 flex items-center gap-2"
        >
          <AvatarGroup />
        </motion.div>

        {/* Content */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 sm:gap-4 px-6">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#5C3A21] -mt-4 sm:-mt-6 lg:-mt-8 max-w-xl text-center leading-tight"
          >
            Secure Messaging for Everyday Conversations
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
            className="text-sm sm:text-base text-black mt-2 sm:mt-4 text-center max-w-xl leading-relaxed px-4 sm:px-0"
          >
            Privacy-first messaging app powered by end-to-end encryption,
            so only you and your recipient can read what&apos;s shared.
          </motion.p>

          {user ? (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
              className="mt-2 sm:mt-4 lg:mt-6"
            >
              <Link href={routes.chats}>
                <button
                  className="
                    cursor-pointer
                    w-32 sm:w-40 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl
                    bg-[#74512D]
                    text-sm sm:text-base text-white font-medium
                    shadow-md shadow-black/20
                    transition-all duration-300 ease-out
                    hover:-translate-y-1
                    hover:shadow-lg
                    hover:shadow-[#74512D]/40
                    active:scale-95
                  "
                >
                  Open Chat
                </button>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: {
                  transition: {
                    staggerChildren: 0.15,
                  },
                },
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 mt-4 sm:mt-6 w-full sm:w-auto"
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <Link href="/auth">
                  <button
                    className="
                      cursor-pointer
                      w-full sm:w-44 lg:w-48
                      min-h-[52px] px-6 rounded-xl
                      bg-[#74512D]
                      text-base sm:text-sm text-white font-medium
                      shadow-md shadow-black/20
                      transition-all duration-300 ease-out
                      hover:-translate-y-1
                      hover:shadow-lg
                      hover:shadow-[#74512D]/40
                      active:scale-95
                    "
                  >
                    Login
                  </button>
                </Link>
              </motion.div>

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <Link href="/auth">
                  <button
                    className="
                      cursor-pointer
                      w-full sm:w-44 lg:w-48
                      min-h-[52px] px-6 rounded-xl
                      text-[#74512D] font-medium
                      text-base sm:text-sm
                      bg-white/70
                      shadow-sm
                      transition-all duration-300 ease-out
                      hover:-translate-y-1
                      hover:bg-[#74512D]
                      hover:text-white
                      hover:shadow-lg
                      hover:shadow-[#74512D]/40
                      active:scale-95
                    "
                  >
                    Register
                  </button>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Hero -> section fade bridge */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 sm:h-44 lg:h-56 z-[15]"
          style={{
            background:
              "linear-gradient(180deg, rgba(248,244,225,0) 0%, rgba(248,244,225,0.5) 42%, rgba(246,239,220,0.88) 78%, #f6efdc 100%)",
          }}
        />
      </section>
      
      {/* Easy to Use Section */}

      {/* <section className="relative z-40 bg-gradient-to-b from-[#f6efdc] via-[#f2e6c7] to-[#e9d8b2] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#5C3A21] -mt-4 sm:-mt-6 lg:-mt-8 max-w-xl mx-auto text-center leading-tight"
              >
                Secure Messaging for Everyday Conversations
              </motion.h1>
          </motion.div>
        </div>
      </section>

      <section className="relative z-40 bg-gradient-to-b from-[#f6efdc] via-[#f2e6c7] to-[#e9d8b2] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#5C3A21] -mt-4 sm:-mt-6 lg:-mt-8 max-w-xl mx-auto text-center leading-tight"
              >
                Secure Messaging for Everyday Conversations
              </motion.h1>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Hybrid RSA-AES Encryption",
                detail:
                  "Messages are encrypted with AES session keys for speed, while RSA secures key exchange so only intended recipients can decrypt content.",
              },
              {
                title: "Forward Session Isolation",
                detail:
                  "Each chat session can rotate keys and isolate compromise impact, reducing exposure if a device or session token is leaked.",
              },
              {
                title: "Optimized Infrastructure",
                detail:
                  "Realtime delivery and server-side actions keep latency low while minimizing redundant fetches, helping control compute and bandwidth cost.",
              },
              {
                title: "Secure Authentication Layer",
                detail:
                  "Authenticated routes, session checks, and protected server actions help ensure only verified users can access and mutate chat data.",
              },
              {
                title: "Privacy-Aware Data Flow",
                detail:
                  "Sensitive payloads stay encrypted in transit and in storage paths designed for least exposure, with only metadata used for coordination.",
              },
              {
                title: "Defensive Architecture",
                detail:
                  "Rule-based data access, modular crypto services, and explicit cleanup actions provide layered defenses against misuse and stale state.",
              },
            ].map((feature, idx) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: idx * 0.06, ease: "easeOut" }}
                className="group rounded-2xl border border-[#74512D]/20 bg-white/65 backdrop-blur-sm p-5 sm:p-6 shadow-sm shadow-[#74512D]/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#74512D]/20"
              >
                <h3 className="text-lg font-semibold text-[#5C3A21]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#2e1d11]/80">
                  {feature.detail}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section> */}
    </main>
  );
}