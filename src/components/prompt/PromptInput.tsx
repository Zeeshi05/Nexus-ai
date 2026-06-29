"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PromptInputProps {
  onSubmit: (prompt: string, stack: { frontend: string; backend: string; database: string }) => void;
  loading: boolean;
}

const rotatingPlaceholders = [
  "Build me a SaaS app where users can track their habits...",
  "Create an e-commerce store with Stripe payments and admin dashboard...",
  "Make a REST API with JWT auth, PostgreSQL, and full CRUD for a blog...",
  "Build a real-time chat app with rooms, typing indicators, and file sharing...",
];

const examplePrompts = [
  { text: "📝 Todo app with auth", prompt: "Build a todo application with user authentication, email login, and drag-and-drop task ordering." },
  { text: "🛒 E-commerce with Stripe", prompt: "Create a simple e-commerce store with a product catalog, Stripe checkout page, and admin list of orders." },
  { text: "💬 Real-time chat", prompt: "Build a real-time chat web app with multiple rooms, user avatars, typing indicators, and message history." },
  { text: "📊 Analytics dashboard", prompt: "Create a beautiful dashboard showing analytics widgets, responsive charts, and user activity logs." },
];

export default function PromptInput({ onSubmit, loading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  // Selected stack
  const [frontend, setFrontend] = useState("Next.js");
  const [backend, setBackend] = useState("Node.js");
  const [database, setDatabase] = useState("PostgreSQL");

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % rotatingPlaceholders.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    onSubmit(prompt.trim(), { frontend, backend, database });
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      {/* Title block */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight">What do you want to build?</h2>
        <p className="text-sm text-[#8892A4]">
          Describe your idea — NEXUS will clarify, plan, and build it automatically using three AIs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Textarea */}
        <div className="relative bg-[#0F1520] border border-[#1E2D40] rounded-2xl p-4 focus-within:border-[#00B4D8] transition-colors">
          <textarea
            className="w-full bg-transparent border-0 outline-none resize-none min-h-[160px] text-white placeholder:text-[#8892A4] text-base"
            placeholder={rotatingPlaceholders[placeholderIndex]}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
          <div className="flex justify-between items-center pt-2 border-t border-[#1E2D40]/50 text-xs text-[#8892A4]">
            <span>{prompt.length} / 2000 characters</span>
          </div>
        </div>

        {/* Tech Stack Selector */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[#8892A4] uppercase tracking-wider">Preferred Tech Stack</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Frontend */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#8892A4]">Frontend</label>
              <div className="flex flex-wrap gap-1.5">
                {["Next.js", "React", "Vanilla JS"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrontend(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      frontend === f
                        ? "bg-[#5C35C5]/20 border-[#5C35C5] text-white"
                        : "bg-[#0F1520] border-[#1E2D40] text-[#8892A4] hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Backend */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#8892A4]">Backend</label>
              <div className="flex flex-wrap gap-1.5">
                {["Node.js", "Python/FastAPI", "No backend"].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBackend(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      backend === b
                        ? "bg-[#5C35C5]/20 border-[#5C35C5] text-white"
                        : "bg-[#0F1520] border-[#1E2D40] text-[#8892A4] hover:text-white"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Database */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#8892A4]">Database</label>
              <div className="flex flex-wrap gap-1.5">
                {["PostgreSQL", "MongoDB", "No database"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDatabase(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      database === d
                        ? "bg-[#5C35C5]/20 border-[#5C35C5] text-white"
                        : "bg-[#0F1520] border-[#1E2D40] text-[#8892A4] hover:text-white"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="space-y-2">
          <span className="text-xs text-[#8892A4]">Need inspiration? Try:</span>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example) => (
              <button
                key={example.text}
                type="button"
                onClick={() => setPrompt(example.prompt)}
                className="px-3 py-1.5 rounded-full bg-[#0F1520] border border-[#1E2D40] text-xs text-[#8892A4] hover:text-white hover:border-[#00B4D8] transition-colors"
              >
                {example.text}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full h-14 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-medium text-base rounded-xl transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Analyzing your prompt...
            </>
          ) : (
            <>
              Build with NEXUS
              <Zap className="h-5 w-5 ml-2 fill-current" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
