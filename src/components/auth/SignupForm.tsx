"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/db/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, AlertCircle, Mail, Check } from "lucide-react";

export default function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Password strength
  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    if (password.length >= 12) score++;

    if (score <= 1) return { level: 1, label: "Weak", color: "bg-red-500" };
    if (score === 2) return { level: 2, label: "Medium", color: "bg-amber-500" };
    if (score === 3) return { level: 3, label: "Strong", color: "bg-green-500" };
    return { level: 4, label: "Very Strong", color: "bg-emerald-400" };
  }, [password]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = useCallback(async () => {
    if (resendCountdown > 0) return;

    const supabase = createBrowserClient();
    await supabase.auth.resend({
      type: "signup",
      email,
    });

    setResendCountdown(60);
    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [email, resendCountdown]);

  // Success state: Check your email
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 py-4"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="mx-auto w-16 h-16 bg-[#00B4D8]/10 rounded-full flex items-center justify-center"
        >
          <Mail className="h-8 w-8 text-[#00B4D8]" />
        </motion.div>

        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Check your email!</h3>
          <p className="text-[#8892A4] text-sm">
            We sent a verification link to{" "}
            <span className="text-[#00B4D8]">{email}</span>
          </p>
        </div>

        <Button
          onClick={handleResendEmail}
          variant="outline"
          disabled={resendCountdown > 0}
          className="bg-[#0F1520] border-[#1E2D40] text-[#8892A4] hover:text-white hover:border-[#00B4D8]"
        >
          {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend verification email"}
        </Button>

        <p className="text-xs text-[#8892A4]">
          Already verified?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-[#00B4D8] hover:underline"
          >
            Sign in
          </button>
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <Alert variant="destructive" className="bg-red-950/50 border-red-800 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <label htmlFor="fullName" className="text-sm font-medium text-[#F8F9FF]">
          Full Name
        </label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          disabled={loading}
          className="bg-[#0F1520] border-[#1E2D40] text-white placeholder:text-[#8892A4] 
                     focus:border-[#00B4D8] focus:ring-[#00B4D8]/20 h-11"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-email" className="text-sm font-medium text-[#F8F9FF]">
          Email
        </label>
        <Input
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="bg-[#0F1520] border-[#1E2D40] text-white placeholder:text-[#8892A4] 
                     focus:border-[#00B4D8] focus:ring-[#00B4D8]/20 h-11"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="text-sm font-medium text-[#F8F9FF]">
          Password
        </label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="bg-[#0F1520] border-[#1E2D40] text-white placeholder:text-[#8892A4] 
                       focus:border-[#00B4D8] focus:ring-[#00B4D8]/20 h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892A4] hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    level <= passwordStrength.level ? passwordStrength.color : "bg-[#1E2D40]"
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs ${
              passwordStrength.level <= 1 ? "text-red-400" :
              passwordStrength.level === 2 ? "text-amber-400" : "text-green-400"
            }`}>
              {passwordStrength.label}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm-password" className="text-sm font-medium text-[#F8F9FF]">
          Confirm Password
        </label>
        <div className="relative">
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            className={`bg-[#0F1520] border-[#1E2D40] text-white placeholder:text-[#8892A4] 
                       focus:border-[#00B4D8] focus:ring-[#00B4D8]/20 h-11 pr-10
                       ${confirmPassword && confirmPassword !== password ? "border-red-500" : ""}
                       ${confirmPassword && confirmPassword === password ? "border-green-500" : ""}`}
          />
          {confirmPassword && confirmPassword === password && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="terms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-1 rounded border-[#1E2D40] bg-[#0F1520] text-[#5C35C5] focus:ring-[#5C35C5]"
        />
        <label htmlFor="terms" className="text-xs text-[#8892A4]">
          I agree to the{" "}
          <span className="text-[#00B4D8] cursor-pointer hover:underline">Terms of Service</span>
          {" "}and{" "}
          <span className="text-[#00B4D8] cursor-pointer hover:underline">Privacy Policy</span>
        </label>
      </div>

      <Button
        type="submit"
        disabled={loading || !email || !password || !confirmPassword || !agreeTerms || !fullName}
        className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 
                   hover:opacity-90 hover:shadow-lg hover:shadow-violet-500/25 
                   text-white font-medium transition-all duration-200"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}
