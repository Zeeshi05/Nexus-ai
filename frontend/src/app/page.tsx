"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Zap, ArrowRight, ChevronDown, Check, Star, X,
  Code2, Brain, Shield, Download, MessageSquare,
  FileCode, Layers, Cpu, Globe, Lock, Gauge,
  Sparkles, GitBranch, Terminal, Eye, Workflow,
  CircleDot, ArrowDown, ExternalLink
} from "lucide-react";

// ═══════════════════════════════════════════════
// NEXUS AI — Product Landing Page
// ═══════════════════════════════════════════════

function AnimatedText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.12, duration: 0.5 }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

function CountUp({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

function SectionHeading({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="text-center mb-16"
    >
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00B4D8]/10 border border-[#00B4D8]/20 text-[#00B4D8] text-xs font-medium mb-4">
        <Sparkles className="h-3 w-3" />
        {badge}
      </span>
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">{title}</h2>
      <p className="text-lg text-[#8892A4] max-w-2xl mx-auto">{subtitle}</p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[#0A0A0F]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(circle at 50% 30%, rgba(0,180,216,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(92,53,197,0.1) 0%, transparent 40%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,180,216,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.5) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Floating particles (deterministic positions to avoid SSR hydration mismatch) */}
      {[...Array(20)].map((_, i) => {
        const left = ((i * 7) % 10) * 10 + (i % 3) * 3;
        const top = ((i * 13) % 10) * 10 + (i % 2) * 4;
        const duration = 3 + (i % 4);
        const delay = (i % 3) * 0.5;

        return (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#00B4D8]/30"
            style={{ left: `${left}%`, top: `${top}%` }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration,
              repeat: Infinity,
              delay,
            }}
          />
        );
      })}

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0F1520] border border-[#1E2D40] text-sm text-[#8892A4]">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[#74AA9C] animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-[#D4723A] animate-pulse" style={{ animationDelay: "0.3s" }} />
              <span className="w-2 h-2 rounded-full bg-[#4285F4] animate-pulse" style={{ animationDelay: "0.6s" }} />
            </span>
            Powered by GPT-4o · Claude · Gemini
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1] tracking-tight">
          <AnimatedText text="Build any app." className="text-white block" delay={0.4} />
          <AnimatedText text="Just describe it." className="gradient-text block" delay={1.2} />
        </h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.6 }}
          className="text-lg md:text-xl text-[#8892A4] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          GPT-4o clarifies your idea. Claude architects the plan.
          <br className="hidden md:block" />
          Gemini writes the code. You get a{" "}
          <span className="text-[#00B4D8]">working project</span>.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <Link href="/signup">
            <button className="group px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-white font-semibold text-lg hover:shadow-xl hover:shadow-violet-500/25 transition-all duration-300 flex items-center gap-2">
              Start Building Free
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <a href="#how-it-works">
            <button className="px-8 py-4 bg-[#0F1520] border border-[#1E2D40] rounded-xl text-[#8892A4] font-semibold text-lg hover:border-[#00B4D8] hover:text-white transition-all duration-300 flex items-center gap-2">
              See how it works
              <ChevronDown className="h-5 w-5" />
            </button>
          </a>
        </motion.div>

        {/* Editor mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8 }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="rounded-2xl overflow-hidden border border-[#1E2D40] shadow-2xl shadow-[#00B4D8]/10">
            <Image
              src="/images/editor-mockup.png"
              alt="NEXUS AI Editor Interface"
              width={1200}
              height={750}
              className="w-full h-auto"
              priority
            />
          </div>
          {/* Glow effect behind image */}
          <div className="absolute -inset-4 bg-gradient-to-r from-[#00B4D8]/10 via-[#5C35C5]/10 to-[#3949AB]/10 rounded-3xl blur-3xl -z-10" />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4, duration: 0.5 }}
          className="mt-12"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ArrowDown className="h-5 w-5 text-[#8892A4] mx-auto" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// STATS BAR
// ═══════════════════════════════════════════════
function StatsBar() {
  const stats = [
    { value: 3, suffix: "", label: "AI Models Working Together" },
    { value: 67, suffix: "%", label: "Cheaper Than Alternatives" },
    { value: 40, suffix: "+", label: "Files Per Build" },
    { value: 3, suffix: "min", label: "Average Build Time" },
  ];

  return (
    <section className="py-12 border-y border-[#1E2D40] bg-[#0A0A0F]">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <p className="text-3xl md:text-4xl font-bold text-white">
              <CountUp target={stat.value} suffix={stat.suffix} />
            </p>
            <p className="text-sm text-[#8892A4] mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// HOW IT WORKS
// ═══════════════════════════════════════════════
function HowItWorks() {
  const steps = [
    {
      icon: MessageSquare,
      number: "01",
      title: "Describe Your Idea",
      description: "Type a natural-language description of the app you want to build. No technical jargon needed — just explain what you want.",
      color: "#74AA9C",
      model: "You",
      detail: "\"Build me a SaaS app where users can track their habits with charts and streaks...\""
    },
    {
      icon: Brain,
      number: "02",
      title: "AI Clarifies & Plans",
      description: "GPT-4o analyzes your prompt, asks 2–3 smart clarifying questions, then Claude creates a complete architecture plan with file-by-file tasks.",
      color: "#D4723A",
      model: "GPT-4o + Claude",
      detail: "Architecture plan: 14 files, React + Node.js + PostgreSQL, JWT auth..."
    },
    {
      icon: Code2,
      number: "03",
      title: "Watch It Build Live",
      description: "Gemini generates each file while Claude reviews every line in real time. Watch your project materialize file by file in a VS Code-like editor.",
      color: "#4285F4",
      model: "Gemini + Claude",
      detail: "✓ src/App.tsx — approved  ↻ src/api/auth.ts — reviewing..."
    },
    {
      icon: Download,
      number: "04",
      title: "Download & Run",
      description: "Get a production-ready project as a ZIP download. Extract, run npm install, and you're live. Every file has been AI-reviewed for quality.",
      color: "#00B4D8",
      model: "Complete",
      detail: "14 files · 12,431 tokens · $0.34 · 2 minutes 41 seconds"
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#0A0A0F]">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          badge="How It Works"
          title="Four steps. Three AIs. One result."
          subtitle="From idea to working code in under 5 minutes"
        />

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#74AA9C] via-[#D4723A] via-[#4285F4] to-[#00B4D8] opacity-20 hidden md:block" />

          <div className="space-y-12 md:space-y-24">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isEven = i % 2 === 0;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`relative flex flex-col md:flex-row items-center gap-8 ${
                    isEven ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${isEven ? "md:text-right" : "md:text-left"}`}>
                    <span className="text-xs font-mono text-[#8892A4] uppercase tracking-wider">{step.model}</span>
                    <h3 className="text-2xl font-bold text-white mt-1 mb-3">{step.title}</h3>
                    <p className="text-[#8892A4] leading-relaxed mb-4">{step.description}</p>
                    <div className="inline-block px-4 py-2 rounded-lg bg-[#0F1520] border border-[#1E2D40] text-sm text-[#8892A4] font-mono">
                      {step.detail}
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${step.color}15`, border: `2px solid ${step.color}30` }}
                    >
                      <Icon className="h-7 w-7" style={{ color: step.color }} />
                    </div>
                    <span
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: step.color }}
                    >
                      {step.number.replace("0", "")}
                    </span>
                  </div>

                  {/* Spacer for layout */}
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// ARCHITECTURE SECTION
// ═══════════════════════════════════════════════
function ArchitectureSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-[#0A0A0F] to-[#0D1117]">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          badge="Technical Architecture"
          title="Three AI models. One orchestrated pipeline."
          subtitle="Each model does what it's best at — clarification, planning, and code generation — working in a coordinated pipeline."
        />

        {/* Architecture diagram image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative max-w-4xl mx-auto mb-16"
        >
          <div className="rounded-2xl overflow-hidden border border-[#1E2D40] shadow-2xl">
            <Image
              src="/images/architecture-diagram.png"
              alt="NEXUS AI Architecture - Multi-AI Pipeline"
              width={1000}
              height={600}
              className="w-full h-auto"
            />
          </div>
          <div className="absolute -inset-4 bg-gradient-to-r from-[#74AA9C]/5 via-[#D4723A]/5 to-[#4285F4]/5 rounded-3xl blur-3xl -z-10" />
        </motion.div>

        {/* AI model cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: "GPT-4o",
              provider: "OpenAI",
              role: "Clarifier",
              color: "#74AA9C",
              icon: MessageSquare,
              tasks: ["Analyze user prompts", "Ask clarifying questions", "Define project scope", "Identify requirements"],
              tokens: "~1,200 tokens/build",
              cost: "$0.02/build",
            },
            {
              name: "Claude",
              provider: "Anthropic",
              role: "Architect & Reviewer",
              color: "#D4723A",
              icon: Brain,
              tasks: ["Design architecture", "Create task queue", "Review generated code", "Fix quality issues"],
              tokens: "~8,100 tokens/build",
              cost: "$0.28/build",
            },
            {
              name: "Gemini",
              provider: "Google",
              role: "Code Generator",
              color: "#4285F4",
              icon: Code2,
              tasks: ["Generate file content", "Write boilerplate", "Create components", "Build utilities"],
              tokens: "~3,000 tokens/build",
              cost: "$0.04/build",
            },
          ].map((model, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="bg-[#0F1520] border border-[#1E2D40] rounded-xl p-6 hover:border-opacity-60 transition-all group"
              style={{ borderColor: `${model.color}20` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${model.color}15` }}
                >
                  <model.icon className="h-5 w-5" style={{ color: model.color }} />
                </div>
                <div>
                  <h4 className="font-bold text-white">{model.name}</h4>
                  <p className="text-xs text-[#8892A4]">{model.provider} · {model.role}</p>
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {model.tasks.map((task, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-[#8892A4]">
                    <CircleDot className="h-3 w-3 flex-shrink-0" style={{ color: model.color }} />
                    {task}
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t border-[#1E2D40] flex justify-between text-xs text-[#8892A4]">
                <span>{model.tokens}</span>
                <span className="text-green-400">{model.cost}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Total cost callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-green-500/5 border border-green-500/20">
            <span className="text-green-400 font-bold text-lg">Total: ~$0.34 per build</span>
            <span className="text-[#8892A4] text-sm">· 12,400 tokens · ~3 minutes</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// FEATURES SECTION
// ═══════════════════════════════════════════════
function FeaturesSection() {
  const features = [
    {
      icon: Workflow,
      title: "Multi-AI Orchestration",
      description: "Three specialized AIs work together in a coordinated pipeline. Each model handles what it does best.",
    },
    {
      icon: Eye,
      title: "Real-Time Build View",
      description: "Watch your project come alive file by file in a VS Code-like editor. See exactly what each AI is doing.",
    },
    {
      icon: Shield,
      title: "Code Review Built-In",
      description: "Claude reviews every file for correctness, security (XSS/injection), best practices, and TypeScript types.",
    },
    {
      icon: Gauge,
      title: "Token Tracking Per Model",
      description: "See exactly how many tokens GPT-4o, Claude, and Gemini consumed per build — with per-model cost breakdown.",
    },
    {
      icon: Lock,
      title: "Your Keys, Your Control",
      description: "Bring your own API keys. Encrypted with Supabase Vault. We never store or log your keys.",
    },
    {
      icon: Terminal,
      title: "Choose Your Models",
      description: "Select which models to use — Claude Opus 4.6 vs Sonnet, Gemini 2.5 Pro vs Flash, GPT-4.1 vs 4o, and more.",
    },
    {
      icon: FileCode,
      title: "Production-Ready Output",
      description: "Get properly structured projects with TypeScript, proper imports, README, and package.json. Ready for npm install.",
    },
    {
      icon: GitBranch,
      title: "Smart Task Decomposition",
      description: "Claude breaks your project into ordered tasks with dependencies. Files are generated in the right order.",
    },
    {
      icon: Layers,
      title: "Self-Healing Builds",
      description: "If Gemini's output doesn't pass review, it auto-retries. After 2 fails, Claude writes the file directly.",
    },
  ];

  return (
    <section className="py-24 bg-[#0A0A0F]">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          badge="Features"
          title="Everything you need to ship faster"
          subtitle="A complete AI-powered development environment with enterprise-grade features"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="group bg-[#0F1520] border border-[#1E2D40] rounded-xl p-6 
                           hover:border-[#00B4D8]/30 hover:shadow-lg hover:shadow-[#00B4D8]/5 
                           transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-[#00B4D8]/10 flex items-center justify-center mb-4 group-hover:bg-[#00B4D8]/15 transition-colors">
                  <Icon className="h-5 w-5 text-[#00B4D8]" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-[#8892A4] leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// MODEL SELECTION SHOWCASE
// ═══════════════════════════════════════════════
function ModelShowcase() {
  const [selectedProvider, setSelectedProvider] = useState<"openai" | "anthropic" | "google">("anthropic");

  const models = {
    openai: [
      { name: "GPT-4o", desc: "Fast, intelligent, flexible", badge: "Recommended", pricing: "$2.50 / $10 per M" },
      { name: "GPT-4.1", desc: "Best coding model from OpenAI", badge: "Premium", pricing: "$2.00 / $8 per M" },
      { name: "o4 Mini", desc: "Latest reasoning model", badge: "New", pricing: "$1.10 / $4.40 per M" },
      { name: "GPT-4o Mini", desc: "Affordable small model", badge: "Budget", pricing: "$0.15 / $0.60 per M" },
    ],
    anthropic: [
      { name: "Claude Opus 4.6", desc: "Most powerful, highest quality", badge: "Premium", pricing: "$15 / $75 per M" },
      { name: "Claude Sonnet 4.6", desc: "Best speed & quality balance", badge: "Recommended", pricing: "$3 / $15 per M" },
      { name: "Claude Sonnet 4.5", desc: "Previous gen, still excellent", badge: "Standard", pricing: "$3 / $15 per M" },
      { name: "Claude Haiku 3.5", desc: "Fastest, most affordable", badge: "Budget", pricing: "$0.80 / $4 per M" },
    ],
    google: [
      { name: "Gemini 2.5 Pro", desc: "Most capable Gemini model", badge: "Premium", pricing: "$1.25 / $10 per M" },
      { name: "Gemini 2.5 Flash", desc: "Fast thinking, great for code", badge: "Recommended", pricing: "$0.15 / $0.60 per M" },
      { name: "Gemini 2.0 Flash", desc: "Previous gen, very fast", badge: "Budget", pricing: "$0.10 / $0.40 per M" },
    ],
  };

  return (
    <section className="py-24 bg-gradient-to-b from-[#0D1117] to-[#0A0A0F]">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading
          badge="Model Selection"
          title="Choose your AI models"
          subtitle="Pick the perfect combination of speed, quality, and cost for each stage of the build pipeline"
        />

        {/* Provider tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {([
            { key: "openai", label: "OpenAI", color: "#74AA9C" },
            { key: "anthropic", label: "Anthropic", color: "#D4723A" },
            { key: "google", label: "Google AI", color: "#4285F4" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedProvider(tab.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedProvider === tab.key
                  ? "text-white border-2"
                  : "bg-[#0F1520] text-[#8892A4] border-2 border-transparent hover:text-white"
              }`}
              style={
                selectedProvider === tab.key
                  ? { borderColor: tab.color, backgroundColor: `${tab.color}15` }
                  : {}
              }
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tab.color }} />
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Model cards */}
        <motion.div
          key={selectedProvider}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {models[selectedProvider].map((model, i) => (
            <div
              key={i}
              className="bg-[#0F1520] border border-[#1E2D40] rounded-xl p-5 flex items-center justify-between hover:border-[#1E2D40]/80 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white">{model.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                    model.badge === "Recommended" ? "bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/30" :
                    model.badge === "Premium" ? "bg-violet-500/10 text-violet-400 border border-violet-500/30" :
                    model.badge === "New" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" :
                    "bg-green-500/10 text-green-400 border border-green-500/30"
                  }`}>
                    {model.badge}
                  </span>
                </div>
                <p className="text-sm text-[#8892A4]">{model.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#8892A4] font-mono">{model.pricing}</p>
                <p className="text-[10px] text-[#8892A4]/60">input / output</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// COMPARISON / WHY NEXUS
// ═══════════════════════════════════════════════
function ComparisonSection() {
  const rows = [
    { feature: "Multi-AI Pipeline", nexus: true, bolt: false, v0: false, cursor: "partial" },
    { feature: "Choose Your Own Models", nexus: true, bolt: false, v0: false, cursor: false },
    { feature: "AI Code Review", nexus: true, bolt: false, v0: false, cursor: false },
    { feature: "Per-Model Token Tracking", nexus: true, bolt: false, v0: false, cursor: false },
    { feature: "Bring Your Own Keys", nexus: true, bolt: false, v0: false, cursor: true },
    { feature: "Real-Time Build View", nexus: true, bolt: true, v0: true, cursor: false },
    { feature: "Download Full Project", nexus: true, bolt: true, v0: true, cursor: true },
    { feature: "Average Cost Per Build", nexus: "$0.34", bolt: "$2–5", v0: "$1–3", cursor: "$0.50+" },
  ];

  return (
    <section className="py-24 bg-[#0A0A0F]">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading
          badge="Why NEXUS AI"
          title="67% cheaper than alternatives"
          subtitle="Three specialized AI models cost less than one overworked model doing everything"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[#0F1520] border border-[#1E2D40] rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E2D40]">
                  <th className="text-left p-4 text-[#8892A4] font-medium">Feature</th>
                  <th className="text-center p-4 text-[#00B4D8] font-bold">NEXUS AI</th>
                  <th className="text-center p-4 text-[#8892A4] font-medium">Bolt.new</th>
                  <th className="text-center p-4 text-[#8892A4] font-medium">v0</th>
                  <th className="text-center p-4 text-[#8892A4] font-medium">Cursor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-[#1E2D40]/50 hover:bg-[#141E2E] transition-colors">
                    <td className="p-4 text-white font-medium">{row.feature}</td>
                    {[row.nexus, row.bolt, row.v0, row.cursor].map((val, j) => (
                      <td key={j} className="text-center p-4">
                        {val === true ? (
                          <Check className="h-5 w-5 text-green-400 mx-auto" />
                        ) : val === false ? (
                          <X className="h-5 w-5 text-[#8892A4]/40 mx-auto" />
                        ) : val === "partial" ? (
                          <span className="text-amber-400">~</span>
                        ) : (
                          <span className={j === 0 ? "text-green-400 font-bold" : "text-[#8892A4]"}>{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// PRICING SECTION
// ═══════════════════════════════════════════════
function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying NEXUS",
      features: ["3 builds per month", "All 3 AI models", "Basic file export", "Community support"],
      cta: "Get Started Free",
      highlight: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "For individual builders",
      features: ["Unlimited builds", "All AI models + premium", "Priority build queue", "Ask Claude chat", "Email support", "Build history"],
      cta: "Start Pro Trial",
      highlight: true,
    },
    {
      name: "Team",
      price: "$99",
      period: "/month",
      description: "For teams & agencies",
      features: ["Everything in Pro", "5 team members", "Shared projects", "API access", "Priority support", "Custom model config"],
      cta: "Contact Sales",
      highlight: false,
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-[#0A0A0F] to-[#0D1117]">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeading
          badge="Pricing"
          title="Start building for free"
          subtitle="No credit card required. Upgrade when you're ready."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative rounded-2xl p-6 ${
                plan.highlight
                  ? "bg-gradient-to-b from-[#0F1520] to-[#0A0A0F] border-2 border-[#5C35C5] shadow-lg shadow-violet-500/10"
                  : "bg-[#0F1520] border border-[#1E2D40]"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-bold text-white">
                  MOST POPULAR
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-[#8892A4] mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-[#8892A4] text-sm ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-[#8892A4]">
                    <Check className="h-4 w-4 text-[#00B4D8] flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href="/signup">
                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-violet-500/25"
                      : "bg-[#1E2D40] text-white hover:bg-[#2A3F56]"
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// FINAL CTA
// ═══════════════════════════════════════════════
function FinalCTA() {
  return (
    <section className="py-24 bg-[#0A0A0F] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(92,53,197,0.2) 0%, transparent 60%)",
        }}
      />
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Ready to build with{" "}
            <span className="gradient-text">three AIs?</span>
          </h2>
          <p className="text-lg text-[#8892A4]">
            Join builders who ship faster with NEXUS AI. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <button className="group px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-white font-semibold text-lg hover:shadow-xl hover:shadow-violet-500/25 transition-all duration-300 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Try NEXUS AI Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════
function Footer() {
  return (
    <footer className="py-12 border-t border-[#1E2D40] bg-[#0A0A0F]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00B4D8] to-[#5C35C5] flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">NEXUS</span>{" "}
              <span className="font-bold text-[#00B4D8]">AI</span>
            </div>
            <p className="text-sm text-[#8892A4]">
              Multi-AI coding platform.
              <br />
              Build anything, just describe it.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-[#8892A4]">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-[#8892A4]">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-[#8892A4]">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1E2D40] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#8892A4]">
            © 2026 NEXUS AI. Built with ♥ and too many API calls.
          </p>
          <div className="flex items-center gap-4 text-[#8892A4]">
            <a href="#" className="hover:text-white transition-colors">
              <Globe className="h-4 w-4" />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════
// NAVIGATION BAR
// ═══════════════════════════════════════════════
function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-[#1E2D40]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00B4D8] to-[#5C35C5] flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-white">NEXUS</span>
          <span className="font-bold text-[#00B4D8]">AI</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-[#8892A4]">
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="text-sm text-[#8892A4] hover:text-white transition-colors px-4 py-2">
              Sign In
            </button>
          </Link>
          <Link href="/signup">
            <button className="text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2 rounded-lg hover:shadow-lg hover:shadow-violet-500/25 transition-all font-medium">
              Try Free →
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
export default function LandingPage() {
  return (
    <div className="bg-[#0A0A0F] min-h-screen">
      <NavBar />
      <HeroSection />
      <StatsBar />
      <HowItWorks />
      <ArchitectureSection />
      <FeaturesSection />
      <ModelShowcase />
      <ComparisonSection />
      <PricingSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
