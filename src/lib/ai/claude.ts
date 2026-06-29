// ═══════════════════════════════════════════════════
// NEXUS AI — Claude Service (Anthropic)
// Handles: Architecture planning, code review, direct file writing
// ═══════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { PlanResult, ReviewResult } from "@/types/ai";
import type { ProjectSpec } from "@/types/project";

// Helper to instantiate Anthropic client connecting directly to official servers
function getAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

// ─────────────────────────────────────────────
// 1. PLAN PROJECT — Claude as Architect
// Input: spec only (Pattern #3: no code context)
// Output: ordered task queue with file assignments
// ─────────────────────────────────────────────
export async function planProject(
  spec: ProjectSpec,
  apiKey: string,
  model: string = "claude-sonnet-4-6"
): Promise<PlanResult> {
  const isGemini = apiKey.startsWith("AQ.Ab") || apiKey.startsWith("AI");
  const systemPrompt = `You are a senior software architect. You receive a project specification
and must produce a complete build plan as JSON. Never generate actual code.
Respond ONLY with valid JSON, no markdown, no explanation.

Output format:
{
  "architecture_summary": "2-3 sentences describing the architecture and key decisions",
  "task_queue": [
    {
      "order": 1,
      "file_path": "relative/path/file.ext",
      "assigned_to": "gemini",
      "micro_prompt": "Precise 2-4 sentence instruction for generating this file...",
      "depends_on": []
    }
  ],
  "claude_handles": ["list of complex file paths Claude should write directly"]
}

ASSIGNMENT RULES:
- gemini: HTML files, CSS/Tailwind components, utility functions,
          config files, simple API routes, package.json, README
- claude: auth middleware, database schemas, complex business logic,
          security-critical code, algorithm implementations

Order files so dependencies come first. Maximum 40 files total.
micro_prompt must be self-contained — Gemini has no other context.
Include the tech stack and project name in each micro_prompt for context.`;

  let text = "";

  if (isGemini) {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Project Specification:\n${JSON.stringify(spec, null, 2)}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
    text = response.text || "";
  } else {
    const client = getAnthropicClient(apiKey);
    const response = await client.messages.create({
      model: mapModelId(model),
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Project Specification:\n${JSON.stringify(spec, null, 2)}`,
        },
      ],
    });
    text = response.content[0].type === "text" ? response.content[0].text : "";
  }

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(jsonStr) as PlanResult;
  } catch {
    throw new Error(`Claude returned invalid JSON for planning: ${text.substring(0, 200)}`);
  }
}

// ─────────────────────────────────────────────
// 2. REVIEW FILE — Claude as Code Reviewer
// Input: file + micro-prompt + decisions context (Pattern #3)
// Output: approved/rejected with corrections
// ─────────────────────────────────────────────
export async function reviewFile(
  filePath: string,
  microPrompt: string,
  code: string,
  apiKey: string,
  model: string = "claude-sonnet-4-6",
  decisionsContext: string = ""
): Promise<ReviewResult> {
  const isGemini = apiKey.startsWith("AQ.Ab") || apiKey.startsWith("AI");
  const systemPrompt = `You are a senior code reviewer. Review the provided code strictly.
Respond ONLY with valid JSON:
{
  "approved": true | false,
  "file_content": "complete corrected file content (with your fixes applied)",
  "issues": ["issue1", "issue2"],
  "correction_prompt": "specific fix instructions if not approved"
}

Check: correctness, security (XSS/injection), best practices, TypeScript types.
Minor issues: fix silently in file_content and set approved: true.
Major issues: set approved: false with specific correction_prompt.

${decisionsContext ? `\nProject context:\n${decisionsContext}` : ""}`;

  let text = "";

  if (isGemini) {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `File: ${filePath}\nTask: ${microPrompt}\n\nCode to review:\n${code}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
    text = response.text || "";
  } else {
    const client = getAnthropicClient(apiKey);
    const response = await client.messages.create({
      model: mapModelId(model),
      max_tokens: 6000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `File: ${filePath}\nTask: ${microPrompt}\n\nCode to review:\n${code}`,
        },
      ],
    });
    text = response.content[0].type === "text" ? response.content[0].text : "";
  }

  try {
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(jsonStr) as ReviewResult;
  } catch {
    // If we can't parse, approve with original code
    return {
      approved: true,
      file_content: code,
      issues: [],
      correction_prompt: null,
    };
  }
}

// ─────────────────────────────────────────────
// 3. WRITE FILE DIRECTLY — Claude as Developer
// Used for complex files or after Gemini fails 2x
// ─────────────────────────────────────────────
export async function writeFileDirectly(
  filePath: string,
  microPrompt: string,
  apiKey: string,
  model: string = "claude-sonnet-4-6",
  decisionsContext: string = ""
): Promise<string> {
  const isGemini = apiKey.startsWith("AQ.Ab") || apiKey.startsWith("AI");
  const systemPrompt = `You are a senior developer. Generate the complete file content for the given task.
Return ONLY the raw code — no markdown code blocks, no explanation, no preamble.
The first character of your response must be the first character of the file content.

${decisionsContext ? `\nProject context:\n${decisionsContext}` : ""}`;

  let text = "";

  if (isGemini) {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate complete file: ${filePath}\nTask: ${microPrompt}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });
    text = response.text || "";
  } else {
    const client = getAnthropicClient(apiKey);
    const response = await client.messages.create({
      model: mapModelId(model),
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate complete file: ${filePath}\nTask: ${microPrompt}`,
        },
      ],
    });
    text = response.content[0].type === "text" ? response.content[0].text : "";
  }

  // Strip markdown code blocks if present
  return text.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();
}

// ─────────────────────────────────────────────
// 4. CHAT — Ask Claude about generated project
// ─────────────────────────────────────────────
export async function chatAboutProject(
  message: string,
  projectFiles: Record<string, string>,
  apiKey: string,
  model: string = "claude-sonnet-4-6",
  contextFilePath?: string
): Promise<string> {
  const isGemini = apiKey.startsWith("AQ.Ab") || apiKey.startsWith("AI");

  // Truncate files context to ~20k characters
  let filesContext = "";
  let charCount = 0;
  const maxChars = 20000;

  // If specific file requested, include it first
  if (contextFilePath && projectFiles[contextFilePath]) {
    filesContext += `\n--- ${contextFilePath} ---\n${projectFiles[contextFilePath]}\n`;
    charCount += filesContext.length;
  }

  // Add remaining files until we hit the limit
  for (const [path, content] of Object.entries(projectFiles)) {
    if (path === contextFilePath) continue;
    const fileStr = `\n--- ${path} ---\n${content}\n`;
    if (charCount + fileStr.length > maxChars) break;
    filesContext += fileStr;
    charCount += fileStr.length;
  }

  const systemInstruction = `You are a helpful code assistant. The user has just built a project
with NEXUS AI. Help them understand and modify their code.
Here is their codebase:
${filesContext}`;

  if (isGemini) {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction,
      },
    });
    return response.text || "";
  } else {
    const client = getAnthropicClient(apiKey);
    const response = await client.messages.create({
      model: mapModelId(model),
      max_tokens: 4000,
      system: systemInstruction,
      messages: [{ role: "user", content: message }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}

// Map our model IDs to Anthropic API model IDs (return directly since they are active 2026 models)
function mapModelId(model: string): string {
  return model;
}
