import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/db/supabase-server";
import { encrypt } from "@/lib/utils/encryption";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, key, selectedModel } = await request.json();
    if (!provider || !key || !selectedModel) {
      return NextResponse.json({ error: "Provider, key, and selectedModel are required" }, { status: 400 });
    }

    // Encrypt key
    const encryptedKey = encrypt(key);

    // Get key preview
    const prefix = key.substring(0, 4);
    const suffix = key.substring(key.length - 4);
    const preview = `${prefix}...${suffix}`;

    // Store in DB using admin client (bypass RLS / write securely)
    const supabaseAdmin = await createSupabaseAdmin();

    // Check if key already exists
    const { data: existing } = await supabaseAdmin
      .from("api_keys")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    let result;
    if (existing) {
      result = await supabaseAdmin
        .from("api_keys")
        .update({
          key_hash: encryptedKey,
          key_preview: preview,
          is_valid: true,
          selected_model: selectedModel,
          last_tested_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      result = await supabaseAdmin
        .from("api_keys")
        .insert({
          user_id: user.id,
          provider,
          key_hash: encryptedKey,
          key_preview: preview,
          is_valid: true,
          selected_model: selectedModel,
          last_tested_at: new Date().toISOString(),
        });
    }

    if (result.error) {
      console.error("Supabase error saving key:", result.error);
      return NextResponse.json({ error: "Failed to save key to database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, preview });
  } catch (error) {
    console.error("Save key route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
