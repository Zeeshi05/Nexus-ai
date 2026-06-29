import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/db/supabase-server";
import { decrypt } from "@/lib/utils/encryption";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, projectId, stack } = await request.json();
    if (!prompt || !projectId) {
      return NextResponse.json({ error: "Prompt and projectId are required" }, { status: 400 });
    }

    // Load user's OpenAI API key from admin database (decrypt it)
    const supabaseAdmin = await createSupabaseAdmin();
    const { data: keyRow } = await supabaseAdmin
      .from("api_keys")
      .select("key_hash, selected_model")
      .eq("user_id", user.id)
      .eq("provider", "openai")
      .single();

    let decryptedKey = "";
    let selectedModel = "gpt-5.5";

    if (keyRow?.key_hash) {
      decryptedKey = decrypt(keyRow.key_hash);
      selectedModel = keyRow.selected_model || "gpt-5.5";
    } else if (process.env.ADMIN_GEMINI_KEY) {
      decryptedKey = process.env.ADMIN_GEMINI_KEY;
    }

    if (!decryptedKey) {
      return NextResponse.json({
        error: "Missing OpenAI API key. Please add it in settings.",
      }, { status: 400 });
    }

    const systemPrompt = `You are a senior technical product manager for a coding platform.
Analyze the user's project request. Respond ONLY with valid JSON, no other text.

If the request has enough information to build (has: main features, general app type, clarity on core flow):
{
  "status": "ready",
  "project_name": "descriptive project name (3-5 words)",
  "summary": "one sentence description",
  "tech_stack": { "frontend": "...", "backend": "...", "database": "..." },
  "features": ["feature1", "feature2", "feature3"],
  "complexity": "simple | medium | complex",
  "estimated_files": 8
}

If critical information is missing, ask 2-4 focused questions to clarify the app scope:
{
  "status": "needs_clarification",
  "questions": [
    {
      "id": "q1",
      "question": "Short, specific question text?",
      "required": true,
      "options": [
        { "value": "opt1", "label": "Option display text", "description": "1 line detail" },
        { "value": "opt2", "label": "Option display text", "description": "1 line detail" }
      ]
    }
  ]
}
Never ask more than 4 questions. Each question max 4 options. Options should be distinct design choices.`;

    let outputText = "{}";
    let inputTokens = 0;
    let outputTokens = 0;

    const isGemini = decryptedKey.startsWith("AQ.Ab") || decryptedKey.startsWith("AI");

    if (isGemini) {
      const ai = new GoogleGenAI({ apiKey: decryptedKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `User Prompt: ${prompt}\nPreferred Stack: ${JSON.stringify(stack)}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
      outputText = response.text || "{}";
      // Estimated tokens for logging
      inputTokens = 1000;
      outputTokens = 500;
    } else {
      const openai = new OpenAI({ apiKey: decryptedKey });

      const response = await openai.chat.completions.create({
        model: selectedModel,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `User Prompt: ${prompt}\nPreferred Stack: ${JSON.stringify(stack)}` },
        ],
      });
      outputText = response.choices[0].message.content || "{}";
      if (response.usage) {
        inputTokens = response.usage.prompt_tokens;
        outputTokens = response.usage.completion_tokens;
      }
    }
    const result = JSON.parse(outputText);

    // If project is ready, update name and tech stack in DB
    if (result.status === "ready") {
      await supabaseAdmin
        .from("projects")
        .update({
          name: result.project_name,
          tech_stack: result.tech_stack,
          status: "planning",
        })
        .eq("id", projectId);
    } else {
      await supabaseAdmin
        .from("projects")
        .update({
          status: "clarifying",
        })
        .eq("id", projectId);
    }

    // Log token usage to database
    if (inputTokens > 0) {
      const pricing = { input: 2.50, output: 10.00 }; // gpt-4o pricing defaults
      const cost = ((inputTokens / 1_000_000) * pricing.input) +
                   ((outputTokens / 1_000_000) * pricing.output);

      await supabaseAdmin.from("token_usage").insert({
        project_id: projectId,
        model: isGemini ? "gemini-3.1-flash-lite" : selectedModel,
        tokens_in: inputTokens,
        tokens_out: outputTokens,
        cost_usd: cost,
        stage: "clarification",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Clarify route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
