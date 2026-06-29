import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/db/supabase-server";
import { decrypt } from "@/lib/utils/encryption";
import { AIOrchestrator } from "@/lib/ai/orchestrator";
import type { ProjectSpec } from "@/types/project";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, spec } = await request.json();
    if (!projectId || !spec) {
      return NextResponse.json({ error: "projectId and spec are required" }, { status: 400 });
    }

    // Retrieve user's API keys and selected models from DB
    const supabaseAdmin = await createSupabaseAdmin();
    const { data: keyRows } = await supabaseAdmin
      .from("api_keys")
      .select("provider, key_hash, selected_model")
      .eq("user_id", user.id);

    const apiKeys = { openai: "", anthropic: "", google: "" };
    const selectedModels = { openai: "gpt-4o", anthropic: "claude-sonnet-4-6", google: "gemini-2.5-flash" };

    if (keyRows && keyRows.length > 0) {
      for (const row of keyRows) {
        const provider = row.provider as keyof typeof apiKeys;
        if (apiKeys[provider] !== undefined) {
          apiKeys[provider] = decrypt(row.key_hash);
          selectedModels[provider] = row.selected_model;
        }
      }
    }

    // Fallback to admin testing keys if not set in database
    if (!apiKeys.openai && process.env.ADMIN_AGENT_ROUTER_KEY) {
      apiKeys.openai = process.env.ADMIN_AGENT_ROUTER_KEY;
    }
    if (!apiKeys.anthropic && process.env.ADMIN_AGENT_ROUTER_KEY) {
      apiKeys.anthropic = process.env.ADMIN_AGENT_ROUTER_KEY;
    }
    if (!apiKeys.google && process.env.ADMIN_GEMINI_KEY) {
      apiKeys.google = process.env.ADMIN_GEMINI_KEY;
    }

    // Check if critical keys (Anthropic, Google) are missing
    if (!apiKeys.anthropic || !apiKeys.google) {
      return NextResponse.json({ error: "One or more API keys (Anthropic/Google) are missing or invalid." }, { status: 400 });
    }

    // Clean existing tasks and files for this project to start fresh
    await supabaseAdmin.from("tasks").delete().eq("project_id", projectId);
    await supabaseAdmin.from("project_files").delete().eq("project_id", projectId);
    await supabaseAdmin.from("build_logs").delete().eq("project_id", projectId);

    // Initialize the orchestrator
    const orchestrator = new AIOrchestrator(
      supabaseAdmin,
      apiKeys,
      selectedModels,
      async (event) => {
        // Callback: Save every event to build_logs table for real-time SSE retrieval
        await supabaseAdmin.from("build_logs").insert({
          project_id: projectId,
          event_type: event.type,
          file_path: event.filePath || null,
          content: event.content || null,
          payload: {
            assignedTo: event.assignedTo,
            order: event.order,
            total: event.total,
            totalFiles: event.totalFiles,
            totalTokens: event.totalTokens,
            totalCost: event.totalCost,
            tokenBreakdown: event.tokenBreakdown,
            error: event.error,
          },
        });
      }
    );

    // Start execution asynchronously (fire-and-forget)
    // Run in background so request returns immediately
    orchestrator.run(projectId, spec as ProjectSpec, user.id)
      .catch((err) => {
        console.error("Orchestrator background execution error:", err);
      });

    return NextResponse.json({ success: true, message: "Build started successfully in background" });
  } catch (error) {
    console.error("Generate route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
