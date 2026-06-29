import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/db/supabase-server";

// ─────────────────────────────────────────────
// VALIDATE API KEY — Real API call & latency check
// ─────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, key } = await request.json();
    if (!provider || !key) {
      return NextResponse.json({ error: "Provider and key are required" }, { status: 400 });
    }

    const startTime = Date.now();
    let isValid = false;
    let errorDetail = "";

    if (provider === "openai") {
      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${key}`,
          },
        });
        isValid = response.status === 200;
        if (!isValid) errorDetail = `API returned status ${response.status}`;
      } catch (err) {
        errorDetail = err instanceof Error ? err.message : "Network error";
      }
    } else if (provider === "anthropic") {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "Ping" }],
          }),
        });
        isValid = response.status === 200 || response.status === 400; // 400 is fine (validation succeeded, payload issue)
        if (response.status === 401) {
          isValid = false;
          errorDetail = "Unauthorized key";
        }
      } catch (err) {
        errorDetail = err instanceof Error ? err.message : "Network error";
      }
    } else if (provider === "google") {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
          { method: "GET" }
        );
        isValid = response.status === 200;
        if (!isValid) errorDetail = `API returned status ${response.status}`;
      } catch (err) {
        errorDetail = err instanceof Error ? err.message : "Network error";
      }
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      valid: isValid,
      latencyMs,
      error: isValid ? null : errorDetail || "Authentication failed",
    });
  } catch (error) {
    console.error("Validation route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
