"use client";

import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-[#0A0A0F]">
      {/* Left Panel — Animated tagline (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden items-center justify-center">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, #0D1B2A 0%, #0A0A0F 70%)",
          }}
        />

        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,180,216,0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0,180,216,0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-md px-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl font-bold text-white leading-tight"
            >
              Build anything.{" "}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="gradient-text"
              >
                Just describe it.
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="text-[#8892A4] text-lg leading-relaxed"
            >
              ChatGPT clarifies. Claude architects. Gemini builds.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.6 }}
              className="flex gap-3"
            >
              {[
                { name: "GPT-4o", color: "#74AA9C" },
                { name: "Claude", color: "#D4723A" },
                { name: "Gemini", color: "#4285F4" },
              ].map((model) => (
                <div
                  key={model.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F1520]/80 border border-[#1E2D40]"
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: model.color }}
                  />
                  <span className="text-xs text-[#8892A4] font-medium">{model.name}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#0F1520] rounded-2xl border border-[#1E2D40] p-8 shadow-xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">
                <span className="text-white">NEXUS</span>{" "}
                <span className="text-[#00B4D8]">AI</span>
              </h2>
              <p className="text-sm text-[#8892A4] mt-1">Multi-AI Coding Platform</p>
            </div>

            <h3 className="text-lg font-semibold text-white mb-6">
              Sign in to your account
            </h3>

            <LoginForm />

            <p className="text-center text-sm text-[#8892A4] mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[#00B4D8] hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
