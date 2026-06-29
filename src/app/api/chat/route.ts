import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/db/supabase-server";
import { decrypt } from "@/lib/utils/encryption";
import { chatAboutProject } from "@/lib/ai/claude";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, message, context } = await request.json();
    if (!projectId || !message) {
      return NextResponse.json({ error: "projectId and message are required" }, { status: 400 });
    }

    // Retrieve user's API key
    const supabaseAdmin = await createSupabaseAdmin();
    const { data: keyRow } = await supabaseAdmin
      .from("api_keys")
      .select("key_hash, selected_model")
      .eq("user_id", user.id)
      .eq("provider", "anthropic")
      .single();

    let decryptedKey = "";
    let selectedModel = "close-work-4-6";

    if (keyRow?.key_hash) {
      decryptedKey = decrypt(keyRow.key_hash);
      selectedModel = keyRow.selected_model || "close-work-4-6";
    } else if (process.env.ADMIN_AGENT_ROUTER_KEY) {
      decryptedKey = process.env.ADMIN_AGENT_ROUTER_KEY;
    }

    if (!decryptedKey) {
      return NextResponse.json({
        error: "Missing Anthropic key. Please add it in settings.",
      }, { status: 400 });
    }

    // Load all files for this project for context
    const { data: fileRows } = await supabaseAdmin
      .from("project_files")
      .select("file_path, content")
      .eq("project_id", projectId)
      .eq("status", "approved");

    const projectFiles: Record<string, string> = {};
    if (fileRows) {
      for (const row of fileRows) {
        if (row.content) {
          projectFiles[row.file_path] = row.content;
        }
      }
    }

    const reply = await chatAboutProject(
      message,
      projectFiles,
      decryptedKey,
      selectedModel,
      context
    );

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
