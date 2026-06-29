"use client";

import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";
import { motion } from "framer-motion";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex bg-[#0A0A0F]">
      {/* Left Panel — Animated tagline (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden items-center justify-center">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, #0D1B2A 0%, #0A0A0F 70%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(92,53,197,0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(92,53,197,0.3) 1px, transparent 1px)`,
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
              Three AIs.{" "}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="gradient-text"
              >
                One platform.
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="text-[#8892A4] text-lg leading-relaxed"
            >
              Watch your app idea transform into working code in real time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.6 }}
              className="space-y-3"
            >
              {[
                { step: "1", text: "Describe your idea", icon: "💡" },
                { step: "2", text: "Answer quick questions", icon: "🎯" },
                { step: "3", text: "Watch NEXUS build it", icon: "⚡" },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.8 + i * 0.2, duration: 0.4 }}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#0F1520]/60 border border-[#1E2D40]/50"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-[#8892A4]">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Signup Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#0F1520] rounded-2xl border border-[#1E2D40] p-8 shadow-xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">
                <span className="text-white">NEXUS</span>{" "}
                <span className="text-[#00B4D8]">AI</span>
              </h2>
              <p className="text-sm text-[#8892A4] mt-1">Multi-AI Coding Platform</p>
            </div>

            <h3 className="text-lg font-semibold text-white mb-6">
              Create your account
            </h3>

            <SignupForm />

            <p className="text-center text-sm text-[#8892A4] mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-[#00B4D8] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
