// ═══════════════════════════════════════════════════
// NEXUS AI — AI Orchestrator
// ═══════════════════════════════════════════════════
// Implements all 6 multi-agent engineering patterns:
// 1. Shared State Object — single source of truth in DB
// 2. Hard-coded loop prevention — MAX_ATTEMPTS in code, not prompts
// 3. Context compression — selective context injection per model
// 4. Decisions log — consistency without full history
// 5. Progressive correction prompts on retry
// 6. Output fingerprinting to detect identical broken outputs
// ═══════════════════════════════════════════════════

import { planProject, reviewFile, writeFileDirectly } from "./claude";
import { generateFile } from "./gemini";
import { calculateCost } from "@/types/ai";
import type { ProjectSpec, TokenBreakdown } from "@/types/project";
import type { PlanResult, TaskQueueItem } from "@/types/ai";

const MAX_ATTEMPTS = 2;

// ─────────────────────────────────────────────
// SHARED STATE — Single source of truth
// Every AI reads/writes to this, not to memory
// ─────────────────────────────────────────────
export interface ProjectState {
  projectId: string;
  userId: string;
  spec: ProjectSpec;
  architecture: PlanResult | null;
  tasks: TaskState[];
  files: Record<string, string>;        // approved files: path → content
  decisions: string[];                   // architectural decisions log
  tokenUsage: {
    gpt4o:  { tokensIn: number; tokensOut: number; costUsd: number };
    claude: { tokensIn: number; tokensOut: number; costUsd: number };
    gemini: { tokensIn: number; tokensOut: number; costUsd: number };
  };
}

interface TaskState {
  order: number;
  filePath: string;
  assignedTo: 'gemini' | 'claude';
  microPrompt: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  attempts: number;
  fingerprints: Set<string>;  // Pattern #6: detect duplicate outputs
  result: string | null;
}

// Simple hash for fingerprinting
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// ─────────────────────────────────────────────
// EVENT EMITTER — Push SSE events to client
// ─────────────────────────────────────────────
export type OrchestratorEvent = {
  type: 'planning_start' | 'planning_complete' | 'task_start' | 'file_complete' | 'build_complete' | 'build_error';
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
};

type EventCallback = (event: OrchestratorEvent) => void;

// ─────────────────────────────────────────────
// MAIN ORCHESTRATOR CLASS
// ─────────────────────────────────────────────
export class AIOrchestrator {
  private state: ProjectState;
  private supabaseAdmin: any;
  private apiKeys: { openai: string; anthropic: string; google: string };
  private selectedModels: { openai: string; anthropic: string; google: string };
  private onEvent: EventCallback;
  private startTime: number;

  constructor(
    supabaseAdmin: any,
    apiKeys: { openai: string; anthropic: string; google: string },
    selectedModels: { openai: string; anthropic: string; google: string },
    onEvent: EventCallback
  ) {
    this.supabaseAdmin = supabaseAdmin;
    this.apiKeys = apiKeys;
    this.selectedModels = selectedModels;
    this.onEvent = onEvent;
    this.startTime = Date.now();
    this.state = {
      projectId: '',
      userId: '',
      spec: {} as ProjectSpec,
      architecture: null,
      tasks: [],
      files: {},
      decisions: [],
      tokenUsage: {
        gpt4o:  { tokensIn: 0, tokensOut: 0, costUsd: 0 },
        claude: { tokensIn: 0, tokensOut: 0, costUsd: 0 },
        gemini: { tokensIn: 0, tokensOut: 0, costUsd: 0 },
      },
    };
  }

  // ─────────────────────────────────────────────
  // PATTERN #3: Context Compression
  // Each model gets only what it needs
  // ─────────────────────────────────────────────
  private getGeminiContext(): string {
    // Gemini only gets: tech stack summary + decisions
    return [
      `Tech stack: ${JSON.stringify(this.state.spec.tech_stack)}`,
      `Project: ${this.state.spec.summary}`,
      `Decisions: ${this.state.decisions.join('; ')}`,
    ].join('\n');
  }

  private getClaudeReviewContext(): string {
    // Claude reviewing gets: decisions + summary, NOT all files
    return [
      `Architecture: ${this.state.architecture?.architecture_summary || ''}`,
      `Key decisions:\n${this.state.decisions.map(d => `- ${d}`).join('\n')}`,
    ].join('\n');
  }

  // ─────────────────────────────────────────────
  // TOKEN TRACKING — Per model accumulation
  // ─────────────────────────────────────────────
  private trackTokens(
    provider: 'gpt4o' | 'claude' | 'gemini',
    tokensIn: number,
    tokensOut: number,
    modelId: string,
    stage: string
  ) {
    const cost = calculateCost(modelId, tokensIn, tokensOut);
    this.state.tokenUsage[provider].tokensIn += tokensIn;
    this.state.tokenUsage[provider].tokensOut += tokensOut;
    this.state.tokenUsage[provider].costUsd += cost;

    // Log to database asynchronously
    this.supabaseAdmin.from('token_usage').insert({
      project_id: this.state.projectId,
      model: modelId,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: cost,
      stage,
    }).then(() => {});
  }

  private getTokenBreakdown(): TokenBreakdown {
    const u = this.state.tokenUsage;
    return {
      gpt4o: { ...u.gpt4o },
      claude: { ...u.claude },
      gemini: { ...u.gemini },
      total: {
        tokensIn: u.gpt4o.tokensIn + u.claude.tokensIn + u.gemini.tokensIn,
        tokensOut: u.gpt4o.tokensOut + u.claude.tokensOut + u.gemini.tokensOut,
        costUsd: u.gpt4o.costUsd + u.claude.costUsd + u.gemini.costUsd,
      },
    };
  }

  // ─────────────────────────────────────────────
  // EMIT EVENT — Push to client via SSE
  // ─────────────────────────────────────────────
  private emit(event: Omit<OrchestratorEvent, 'timestamp'>) {
    this.onEvent({ ...event, timestamp: new Date().toISOString() });
  }

  // ═══════════════════════════════════════════════
  // MAIN RUN METHOD
  // ═══════════════════════════════════════════════
  async run(projectId: string, spec: ProjectSpec, userId: string): Promise<void> {
    this.state.projectId = projectId;
    this.state.userId = userId;
    this.state.spec = spec;
    this.startTime = Date.now();

    try {
      // ── PHASE 1: PLANNING ──────────────────────
      await this.updateProjectStatus('planning');
      this.emit({ type: 'planning_start' });

      // Call Claude to plan the project
      // Pattern #3: Claude only gets the spec, no code
      const planResult = await planProject(
        spec,
        this.apiKeys.anthropic,
        this.selectedModels.anthropic
      );

      this.state.architecture = planResult;

      // Pattern #4: Extract decisions from architecture
      this.state.decisions = this.extractDecisions(planResult);

      // Track Claude planning tokens (estimated)
      this.trackTokens('claude', 2000, 3000, this.selectedModels.anthropic, 'planning');

      // Save tasks to DB
      const tasks = planResult.task_queue;
      for (const task of tasks) {
        await this.supabaseAdmin.from('tasks').insert({
          project_id: projectId,
          order_index: task.order,
          file_path: task.file_path,
          micro_prompt: task.micro_prompt,
          assigned_to: task.assigned_to,
          status: 'queued',
          attempts: 0,
        });

        // Also create empty file entries
        await this.supabaseAdmin.from('project_files').insert({
          project_id: projectId,
          file_path: task.file_path,
          content: null,
          status: 'pending',
        });
      }

      // Initialize task states
      this.state.tasks = tasks.map(t => ({
        order: t.order,
        filePath: t.file_path,
        assignedTo: t.assigned_to,
        microPrompt: t.micro_prompt,
        status: 'queued' as const,
        attempts: 0,
        fingerprints: new Set<string>(),
        result: null,
      }));

      this.emit({
        type: 'planning_complete',
        total: tasks.length,
      });

      // ── PHASE 2: BUILDING ──────────────────────
      await this.updateProjectStatus('building');

      for (let i = 0; i < this.state.tasks.length; i++) {
        const task = this.state.tasks[i];
        task.status = 'running';

        this.emit({
          type: 'task_start',
          filePath: task.filePath,
          assignedTo: task.assignedTo,
          order: i + 1,
          total: this.state.tasks.length,
        });

        // Update task status in DB
        await this.supabaseAdmin
          .from('tasks')
          .update({ status: 'running' })
          .eq('project_id', projectId)
          .eq('file_path', task.filePath);

        let fileContent: string | null = null;
        let approved = false;

        if (task.assignedTo === 'gemini') {
          // ── GEMINI GENERATE + CLAUDE REVIEW LOOP ──
          // Pattern #2: Hard-coded loop limit
          while (task.attempts < MAX_ATTEMPTS && !approved) {
            // Pattern #3: Gemini gets minimal context
            const generatedCode = await generateFile(
              {
                filePath: task.filePath,
                microPrompt: task.microPrompt,
                projectSummary: this.getGeminiContext(),
              },
              this.apiKeys.google,
              this.selectedModels.google
            );

            // Track Gemini tokens
            this.trackTokens('gemini', 500, 1500, this.selectedModels.google, `generate:${task.filePath}`);

            // Pattern #6: Fingerprint check
            const fingerprint = simpleHash(generatedCode.trim());
            if (task.fingerprints.has(fingerprint)) {
              // Gemini produced identical output — no point retrying
              break;
            }
            task.fingerprints.add(fingerprint);

            // Pattern #3: Claude review gets decisions + this file only
            const review = await reviewFile(
              task.filePath,
              task.microPrompt,
              generatedCode,
              this.apiKeys.anthropic,
              this.selectedModels.anthropic,
              this.getClaudeReviewContext()
            );

            // Track Claude review tokens
            this.trackTokens('claude', 1500, 800, this.selectedModels.anthropic, `review:${task.filePath}`);

            if (review.approved) {
              fileContent = review.file_content || generatedCode;
              approved = true;
            } else {
              // Pattern #5: Correction prompt gets more specific
              task.attempts++;
              if (review.correction_prompt) {
                task.microPrompt = `${task.microPrompt}\n\nCRITICAL FIXES REQUIRED:\n${review.correction_prompt}\n\nIssues found:\n${review.issues.join('\n')}`;
              }
            }
          }

          // Pattern #2: After MAX_ATTEMPTS, Claude writes directly
          if (!approved) {
            fileContent = await writeFileDirectly(
              task.filePath,
              task.microPrompt,
              this.apiKeys.anthropic,
              this.selectedModels.anthropic,
              this.getClaudeReviewContext()
            );
            this.trackTokens('claude', 1000, 2000, this.selectedModels.anthropic, `direct:${task.filePath}`);
            approved = true;
          }
        } else {
          // ── CLAUDE WRITES DIRECTLY ──
          // For complex files (auth, security, DB schemas)
          fileContent = await writeFileDirectly(
            task.filePath,
            task.microPrompt,
            this.apiKeys.anthropic,
            this.selectedModels.anthropic,
            this.getClaudeReviewContext()
          );
          this.trackTokens('claude', 1000, 2000, this.selectedModels.anthropic, `direct:${task.filePath}`);
          approved = true;
        }

        if (fileContent) {
          // Pattern #1: Update shared state
          this.state.files[task.filePath] = fileContent;
          task.result = fileContent;
          task.status = 'done';

          // Save to DB
          await this.supabaseAdmin
            .from('project_files')
            .update({ content: fileContent, status: 'approved' })
            .eq('project_id', projectId)
            .eq('file_path', task.filePath);

          await this.supabaseAdmin
            .from('tasks')
            .update({ status: 'done', attempts: task.attempts })
            .eq('project_id', projectId)
            .eq('file_path', task.filePath);

          this.emit({
            type: 'file_complete',
            filePath: task.filePath,
            content: fileContent,
            assignedTo: task.assignedTo,
            order: i + 1,
            total: this.state.tasks.length,
          });
        } else {
          task.status = 'failed';
          await this.supabaseAdmin
            .from('tasks')
            .update({ status: 'failed' })
            .eq('project_id', projectId)
            .eq('file_path', task.filePath);
        }

        // Update project file count
        const completedFiles = this.state.tasks.filter(t => t.status === 'done').length;
        await this.supabaseAdmin
          .from('projects')
          .update({ file_count: completedFiles })
          .eq('id', projectId);
      }

      // ── PHASE 3: COMPLETE ──────────────────────
      const breakdown = this.getTokenBreakdown();
      const buildDuration = Math.floor((Date.now() - this.startTime) / 1000);

      await this.supabaseAdmin
        .from('projects')
        .update({
          status: 'complete',
          file_count: Object.keys(this.state.files).length,
          tokens_used: breakdown.total.tokensIn + breakdown.total.tokensOut,
          cost_usd: breakdown.total.costUsd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      this.emit({
        type: 'build_complete',
        totalFiles: Object.keys(this.state.files).length,
        totalTokens: breakdown.total.tokensIn + breakdown.total.tokensOut,
        totalCost: breakdown.total.costUsd,
        tokenBreakdown: breakdown,
      });

    } catch (error) {
      console.error('Orchestrator error:', error);
      await this.updateProjectStatus('error');
      this.emit({
        type: 'build_error',
        error: error instanceof Error ? error.message : 'Build failed unexpectedly',
      });
    }
  }

  // ─────────────────────────────────────────────
  // PATTERN #4: Extract architectural decisions
  // ─────────────────────────────────────────────
  private extractDecisions(plan: PlanResult): string[] {
    const decisions: string[] = [];

    // Parse from architecture summary
    const summary = plan.architecture_summary;
    if (summary) {
      // Extract key technical decisions
      const patterns = [
        /using\s+(\w+)\s+(?:for|as|with)/gi,
        /(?:with|using)\s+(JWT|sessions?|cookies?|localStorage)/gi,
        /(?:database|db|orm):\s*(\w+)/gi,
      ];

      for (const pattern of patterns) {
        const matches = summary.matchAll(pattern);
        for (const match of matches) {
          decisions.push(match[0]);
        }
      }
    }

    // Add stack decisions
    const spec = this.state.spec;
    if (spec.tech_stack.frontend) decisions.push(`Frontend: ${spec.tech_stack.frontend}`);
    if (spec.tech_stack.backend) decisions.push(`Backend: ${spec.tech_stack.backend}`);
    if (spec.tech_stack.database) decisions.push(`Database: ${spec.tech_stack.database}`);

    // Add file extension decisions based on task queue
    const hasTs = plan.task_queue.some(t => t.file_path.endsWith('.ts') || t.file_path.endsWith('.tsx'));
    if (hasTs) decisions.push('Using TypeScript (.ts/.tsx files)');

    return decisions;
  }

  private async updateProjectStatus(status: string) {
    await this.supabaseAdmin
      .from('projects')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', this.state.projectId);
  }
}
