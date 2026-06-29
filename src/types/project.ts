// ═══════════════════════════════════════════════════
// NEXUS AI — Project Types
// ═══════════════════════════════════════════════════

export type ProjectStatus = 'idle' | 'clarifying' | 'planning' | 'building' | 'reviewing' | 'complete' | 'error';
export type FileStatus = 'pending' | 'generating' | 'reviewing' | 'approved' | 'failed';

// All supported AI models — users can select which to use per provider
export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4.1-nano' | 'o3' | 'o3-mini' | 'o4-mini' | 'gpt-5.5';
export type AnthropicModel = 'claude-opus-4-6' | 'claude-sonnet-4-6' | 'claude-sonnet-4-5' | 'claude-haiku-3-5' | 'close-work-4-6' | 'claude-opus-4-7' | 'claude-opus-4-8';
export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite' | 'gemini-3.5-flash' | 'gemini-3-pro-preview' | 'gemini-3-flash-preview';
export type AIModel = OpenAIModel | AnthropicModel | GeminiModel;

// Available models per provider for the settings UI
export const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-5.5' as const, name: 'GPT-5.5', description: 'Next-gen reasoning & quality', tier: 'premium' },
    { id: 'gpt-4o' as const, name: 'GPT-4o', description: 'Fast, intelligent, flexible', tier: 'recommended' },
    { id: 'gpt-4o-mini' as const, name: 'GPT-4o Mini', description: 'Affordable small model', tier: 'budget' },
    { id: 'gpt-4.1' as const, name: 'GPT-4.1', description: 'Best coding model from OpenAI', tier: 'premium' },
    { id: 'gpt-4.1-mini' as const, name: 'GPT-4.1 Mini', description: 'Fast & affordable coding', tier: 'budget' },
    { id: 'gpt-4.1-nano' as const, name: 'GPT-4.1 Nano', description: 'Fastest, cheapest option', tier: 'budget' },
    { id: 'o3' as const, name: 'o3', description: 'Advanced reasoning model', tier: 'premium' },
    { id: 'o3-mini' as const, name: 'o3 Mini', description: 'Fast reasoning model', tier: 'standard' },
    { id: 'o4-mini' as const, name: 'o4 Mini', description: 'Latest reasoning model', tier: 'premium' },
  ],
  anthropic: [
    { id: 'close-work-4-6' as const, name: 'Claude Opus 4.6 (close-work)', description: 'Absolute best coding model', tier: 'premium' },
    { id: 'claude-opus-4-7' as const, name: 'Claude Opus 4.7', description: 'Next-gen coding excellence', tier: 'premium' },
    { id: 'claude-opus-4-8' as const, name: 'Claude Opus 4.8', description: 'Ultimate developer brain', tier: 'premium' },
    { id: 'claude-sonnet-4-6' as const, name: 'Claude Sonnet 4.6', description: 'Best balance of speed & quality', tier: 'recommended' },
    { id: 'claude-opus-4-6' as const, name: 'Claude Opus 4.6', description: 'Most powerful, highest quality', tier: 'premium' },
    { id: 'claude-sonnet-4-5' as const, name: 'Claude Sonnet 4.5', description: 'Previous gen, still excellent', tier: 'standard' },
    { id: 'claude-haiku-3-5' as const, name: 'Claude Haiku 3.5', description: 'Fastest, most affordable', tier: 'budget' },
  ],
  google: [
    { id: 'gemini-3.1-pro-preview' as const, name: 'Gemini 3.1 Pro Preview', description: 'Next-gen reasoning model with high quotas', tier: 'recommended' },
    { id: 'gemini-3.1-flash-lite' as const, name: 'Gemini 3.1 Flash Lite', description: 'Ultra-fast next-gen lightweight model', tier: 'budget' },
    { id: 'gemini-3.5-flash' as const, name: 'Gemini 3.5 Flash', description: 'Advanced flash model', tier: 'premium' },
    { id: 'gemini-3-pro-preview' as const, name: 'Gemini 3 Pro Preview', description: 'Powerful reasoning preview model', tier: 'premium' },
    { id: 'gemini-3-flash-preview' as const, name: 'Gemini 3 Flash Preview', description: 'Fast thinking preview model', tier: 'standard' },
    { id: 'gemini-2.5-flash' as const, name: 'Gemini 2.5 Flash', description: 'Fast thinking model, great for code', tier: 'recommended' },
    { id: 'gemini-2.5-pro' as const, name: 'Gemini 2.5 Pro', description: 'Most capable Gemini model', tier: 'premium' },
    { id: 'gemini-2.0-flash' as const, name: 'Gemini 2.0 Flash', description: 'Previous gen, very fast', tier: 'budget' },
  ],
} as const;

export type AIProvider = keyof typeof AVAILABLE_MODELS;

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  tech_stack: TechStack;
  file_count: number;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
  updated_at: string;
}

export interface TechStack {
  frontend?: string;
  backend?: string;
  database?: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_path: string;
  content: string | null;
  status: FileStatus;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  order_index: number;
  file_path: string;
  micro_prompt: string;
  assigned_to: 'gemini' | 'claude';
  status: 'queued' | 'running' | 'done' | 'failed';
  attempts: number;
  created_at: string;
}

export interface TokenUsage {
  id: string;
  project_id: string;
  model: AIModel;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  stage: string;
  created_at: string;
}

// Token usage breakdown per model for display
export interface TokenBreakdown {
  gpt4o: { tokensIn: number; tokensOut: number; costUsd: number };
  claude: { tokensIn: number; tokensOut: number; costUsd: number };
  gemini: { tokensIn: number; tokensOut: number; costUsd: number };
  total: { tokensIn: number; tokensOut: number; costUsd: number };
}

export interface ProjectSpec {
  project_name: string;
  summary: string;
  tech_stack: TechStack;
  features: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimated_files: number;
  user_prompt: string;
  clarification_answers?: Record<string, string>;
}

// SSE Event types for real-time progress
export type SSEEventType = 
  | 'task_start'
  | 'file_complete'
  | 'build_complete'
  | 'build_error'
  | 'planning_start'
  | 'planning_complete';

export interface SSEEvent {
  type: SSEEventType;
  filePath?: string;
  content?: string;
  assignedTo?: 'gemini' | 'claude';
  order?: number;
  total?: number;
  totalFiles?: number;
  totalTokens?: number;
  totalCost?: number;
  tokenBreakdown?: TokenBreakdown;
  error?: string;
  timestamp: string;
}

// Clarification types from GPT-4o
export interface ClarificationOption {
  value: string;
  label: string;
  description: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  required: boolean;
  options: ClarificationOption[];
}

export interface ClarificationResponse {
  status: 'ready' | 'needs_clarification';
  project_name?: string;
  summary?: string;
  tech_stack?: TechStack;
  features?: string[];
  complexity?: 'simple' | 'medium' | 'complex';
  estimated_files?: number;
  questions?: ClarificationQuestion[];
}

// User profile
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'team';
  builds_used: number;
  builds_limit: number;
  created_at: string;
}

// API Key with selected model
export interface ApiKey {
  id: string;
  user_id: string;
  provider: AIProvider;
  selected_model: AIModel;
  key_preview: string;
  is_valid: boolean;
  last_tested_at: string | null;
  created_at: string;
}

// User's model preferences
export interface UserModelPreferences {
  openai_model: OpenAIModel;
  anthropic_model: AnthropicModel;
  gemini_model: GeminiModel;
}

export const DEFAULT_MODEL_PREFERENCES: UserModelPreferences = {
  openai_model: 'gpt-5.5',
  anthropic_model: 'close-work-4-6',
  gemini_model: 'gemini-2.5-pro',
};
