// ═══════════════════════════════════════════════════
// NEXUS AI — AI-specific Types & Utilities
// ═══════════════════════════════════════════════════

import type { AIModel } from "./project";

export interface TaskQueueItem {
  order: number;
  file_path: string;
  assigned_to: 'gemini' | 'claude';
  micro_prompt: string;
  depends_on: number[];
}

export interface PlanResult {
  architecture_summary: string;
  task_queue: TaskQueueItem[];
  claude_handles: string[];
}

export interface ReviewResult {
  approved: boolean;
  file_content: string;
  issues: string[];
  correction_prompt: string | null;
}

// AI Model pricing (cost per 1M tokens)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-5.5':         { input: 4.00,  output: 16.00 },
  'gpt-4o':          { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':     { input: 0.15,  output: 0.60 },
  'gpt-4.1':         { input: 2.00,  output: 8.00 },
  'gpt-4.1-mini':    { input: 0.40,  output: 1.60 },
  'gpt-4.1-nano':    { input: 0.10,  output: 0.40 },
  'o3':              { input: 10.00, output: 40.00 },
  'o3-mini':         { input: 1.10,  output: 4.40 },
  'o4-mini':         { input: 1.10,  output: 4.40 },
  // Anthropic
  'close-work-4-6':    { input: 15.00, output: 75.00 },
  'claude-opus-4-7':   { input: 15.00, output: 75.00 },
  'claude-opus-4-8':   { input: 15.00, output: 75.00 },
  'claude-opus-4-6':   { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6': { input: 3.00,  output: 15.00 },
  'claude-sonnet-4-5': { input: 3.00,  output: 15.00 },
  'claude-haiku-3-5':  { input: 0.80,  output: 4.00 },
  // Google
  'gemini-2.5-pro':   { input: 1.25,  output: 10.00 },
  'gemini-2.5-flash': { input: 0.15,  output: 0.60 },
  'gemini-2.0-flash': { input: 0.10,  output: 0.40 },
  'gemini-1.5-pro':   { input: 1.25,  output: 10.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-3.1-pro-preview': { input: 1.25, output: 10.00 },
  'gemini-3.1-flash-lite':  { input: 0.075, output: 0.30 },
  'gemini-3.5-flash':       { input: 0.15,  output: 0.60 },
  'gemini-3-pro-preview':   { input: 1.25,  output: 10.00 },
  'gemini-3-flash-preview': { input: 0.15,  output: 0.60 },
};

// Provider display info for the UI
export const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    color: '#74AA9C',
    usedFor: 'Prompt clarification & analysis',
    keyUrl: 'platform.openai.com → API Keys',
    keyPrefix: 'sk-',
  },
  anthropic: {
    name: 'Anthropic',
    color: '#D4723A',
    usedFor: 'Architecture planning & code review',
    keyUrl: 'console.anthropic.com → API Keys',
    keyPrefix: 'sk-ant-',
  },
  google: {
    name: 'Google AI',
    color: '#4285F4',
    usedFor: 'Code generation',
    keyUrl: 'aistudio.google.com → Get API key',
    keyPrefix: 'AI',
  },
} as const;

export function calculateCost(
  model: AIModel | string,
  tokensIn: number,
  tokensOut: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  const inputCost = (tokensIn / 1_000_000) * pricing.input;
  const outputCost = (tokensOut / 1_000_000) * pricing.output;
  return parseFloat((inputCost + outputCost).toFixed(6));
}

export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

// Get the provider for a given model ID
export function getProviderForModel(model: AIModel): 'openai' | 'anthropic' | 'google' {
  if (model.startsWith('gpt-') || model.startsWith('o3') || model.startsWith('o4')) return 'openai';
  if (model.startsWith('claude-') || model.startsWith('close-work-')) return 'anthropic';
  return 'google';
}

// Model display name lookup
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gpt-5.5': 'GPT-5.5',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4.1': 'GPT-4.1',
  'gpt-4.1-mini': 'GPT-4.1 Mini',
  'gpt-4.1-nano': 'GPT-4.1 Nano',
  'o3': 'o3',
  'o3-mini': 'o3 Mini',
  'o4-mini': 'o4 Mini',
  'close-work-4-6': 'Claude Opus 4.6 (close-work)',
  'claude-opus-4-7': 'Claude Opus 4.7',
  'claude-opus-4-8': 'Claude Opus 4.8',
  'claude-opus-4-6': 'Claude Opus 4.6',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-sonnet-4-5': 'Claude Sonnet 4.5',
  'claude-haiku-3-5': 'Claude Haiku 3.5',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro Preview',
  'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
  'gemini-3.5-flash': 'Gemini 3.5 Flash',
  'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
  'gemini-3-flash-preview': 'Gemini 3 Flash Preview',
};
