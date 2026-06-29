// ═══════════════════════════════════════════════════
// NEXUS AI — Gemini Service (Google Generative AI)
// Handles: High-speed, bulk code generation from micro-prompts
// ═══════════════════════════════════════════════════

import { GoogleGenAI } from "@google/genai";

interface GenerateParams {
  filePath: string;
  microPrompt: string;
  projectSummary: string;
}

export async function generateFile(
  params: GenerateParams,
  apiKey: string,
  model: string = "gemini-2.5-flash"
): Promise<string> {
  // Use @google/genai package structure
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are a senior software developer. Generate the complete file content for the given task.
Return ONLY the raw code — no markdown code blocks, no explanation, no preamble.
The first character of your response must be the first character of the file content.
Do NOT wrap your code in triple backticks.

Tech stack & project context:
${params.projectSummary}`;

  const mappedModel = mapModelId(model);

  try {
    const response = await ai.models.generateContent({
      model: mappedModel,
      contents: `Generate complete file: ${params.filePath}\nTask: ${params.microPrompt}`,
      config: {
        systemInstruction,
        temperature: 0.2, // low temperature for consistent code structure
        maxOutputTokens: 8192,
      },
    });

    const text = response.text || "";

    // Post-generation cleanup: strip markdown code blocks if the model ignored instructions
    return text.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw new Error(`Gemini generation failed for ${params.filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Map our model IDs to Gemini API model IDs
function mapModelId(model: string): string {
  const map: Record<string, string> = {
    "gemini-1.5-pro": "gemini-1.5-pro",
    "gemini-1.5-flash": "gemini-1.5-flash",
    "gemini-2.5-flash": "gemini-2.5-flash",
    "gemini-2.5-pro": "gemini-2.5-pro",
    "gemini-2.0-flash": "gemini-2.0-flash",
    "gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite": "gemini-3.1-flash-lite",
    "gemini-3.5-flash": "gemini-3.5-flash",
    "gemini-3-pro-preview": "gemini-3-pro-preview",
    "gemini-3-flash-preview": "gemini-3-flash-preview",
  };
  return map[model] || model;
}
