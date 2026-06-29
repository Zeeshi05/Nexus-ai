"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/db/supabase";
import PromptInput from "@/components/prompt/PromptInput";
import ClarificationCard from "@/components/prompt/ClarificationCard";
import FileTree from "@/components/editor/FileTree";
import CodePanel from "@/components/editor/CodePanel";
import ChatPanel from "@/components/editor/ChatPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, Play, Check, ExternalLink, Zap } from "lucide-react";
import { formatTokenCount, formatCost } from "@/types/ai";
import type { 
  Project, ProjectFile, ClarificationQuestion, 
  ClarificationResponse, TokenBreakdown, SSEEvent 
} from "@/types/project";

interface LogMessage {
  type: string;
  filePath?: string;
  assignedTo?: string;
  order?: number;
  total?: number;
  totalFiles?: number;
  totalTokens?: number;
  totalCost?: number;
  tokenBreakdown?: TokenBreakdown;
  error?: string;
  timestamp: string;
}

export default function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const router = useRouter();
  const { projectId } = use(params);

  // States
  const [project, setProject] = useState<Project | null>(null);
  const [editorState, setEditorState] = useState<'prompt' | 'clarifying' | 'building' | 'loading'>('loading');
  const [prompt, setPrompt] = useState("");
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  // Workspace / Files
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [generatingFilePath, setGeneratingFilePath] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [downloading, setDownloading] = useState(false);

  // Token usages
  const [tokenBreakdown, setTokenBreakdown] = useState<TokenBreakdown | undefined>(undefined);

  // Load project status initially
  useEffect(() => {
    const loadProject = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: proj, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (error || !proj) {
        router.push("/dashboard");
        return;
      }

      setProject(proj as Project);

      // Determine state from project status
      if (proj.status === "complete" || proj.status === "building" || proj.status === "planning" || proj.status === "reviewing") {
        setEditorState("building");
        loadExistingFiles();
        if (proj.status === "building" || proj.status === "planning" || proj.status === "reviewing") {
          startProgressStream();
        }
      } else if (proj.status === "clarifying") {
        setEditorState("prompt"); // let user re-edit or input prompt
      } else {
        setEditorState("prompt");
      }
    };

    loadProject();
  }, [projectId]);

  const loadExistingFiles = async () => {
    const supabase = createBrowserClient();
    const { data: fileData } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId);

    if (fileData) {
      setFiles(fileData as ProjectFile[]);
      if (fileData.length > 0) {
        // Set first file as active by default
        setActiveFilePath(fileData[0].file_path);
      }
    }
  };

  // ─────────────────────────────────────────────
  // 1. PROMPT SUBMIT — GPT CLARIFY CALL
  // ─────────────────────────────────────────────
  const handlePromptSubmit = async (
    userPrompt: string,
    stack: { frontend: string; backend: string; database: string }
  ) => {
    setPrompt(userPrompt);
    setApiLoading(true);

    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, projectId, stack }),
      });

      const data: ClarificationResponse = await res.json();

      if (data.status === "needs_clarification" && data.questions) {
        setClarificationQuestions(data.questions);
        setEditorState("clarifying");
      } else if (data.status === "ready") {
        // Start build immediately
        startBuild({
          project_name: data.project_name || "Nexus App",
          summary: data.summary || "",
          tech_stack: data.tech_stack || stack,
          features: data.features || [],
          complexity: data.complexity || "medium",
          estimated_files: data.estimated_files || 8,
          user_prompt: userPrompt,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // 2. CONTINUE BUILDING — Trigger task orchestrator
  // ─────────────────────────────────────────────
  const handleClarificationContinue = async (answers: Record<string, string>) => {
    setApiLoading(true);

    try {
      // Find tech stack from answers or defaults
      const spec = {
        project_name: project?.name || "Nexus App",
        summary: prompt,
        tech_stack: project?.tech_stack || { frontend: "Next.js", backend: "Node.js", database: "PostgreSQL" },
        features: [],
        complexity: "medium" as const,
        estimated_files: 10,
        user_prompt: prompt,
        clarification_answers: answers,
      };

      await startBuild(spec);
    } catch (err) {
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };

  const startBuild = async (spec: any) => {
    setEditorState("building");
    setLogs([{ type: "planning_start", timestamp: new Date().toISOString() }]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, spec }),
      });

      const data = await res.json();
      if (data.success) {
        startProgressStream();
      } else {
        setLogs((prev) => [
          ...prev,
          { type: "build_error", error: data.error || "Failed to start build", timestamp: new Date().toISOString() },
        ]);
      }
    } catch {
      setLogs((prev) => [
        ...prev,
        { type: "build_error", error: "Connection error starting build", timestamp: new Date().toISOString() },
      ]);
    }
  };

  // ─────────────────────────────────────────────
  // 3. REAL-TIME STREAM — Subscribe to progress
  // ─────────────────────────────────────────────
  const startProgressStream = () => {
    const eventSource = new EventSource(`/api/progress/${projectId}`);

    eventSource.onmessage = (event) => {
      const data: SSEEvent = JSON.parse(event.data);

      if (data.type === "planning_start") {
        setLogs((prev) => [...prev, { type: "planning_start", timestamp: data.timestamp }]);
      }

      if (data.type === "planning_complete") {
        setLogs((prev) => [...prev, { type: "planning_complete", total: data.total, timestamp: data.timestamp }]);
        // Reload empty file placeholders
        loadExistingFiles();
      }

      if (data.type === "task_start" && data.filePath) {
        setGeneratingFilePath(data.filePath);
        setLogs((prev) => [
          ...prev,
          {
            type: "task_start",
            filePath: data.filePath,
            assignedTo: data.assignedTo,
            order: data.order,
            total: data.total,
            timestamp: data.timestamp,
          },
        ]);
        // Update local file tree status to generating
        setFiles((prev) =>
          prev.map((f) => (f.file_path === data.filePath ? { ...f, status: "generating" } : f))
        );
      }

      if (data.type === "file_complete" && data.filePath) {
        if (generatingFilePath === data.filePath) {
          setGeneratingFilePath(null);
        }
        setLogs((prev) => [
          ...prev,
          {
            type: "file_complete",
            filePath: data.filePath,
            assignedTo: data.assignedTo,
            order: data.order,
            total: data.total,
            timestamp: data.timestamp,
          },
        ]);
        // Update local files cache
        setFiles((prev) => {
          const exists = prev.some((f) => f.file_path === data.filePath);
          if (exists) {
            return prev.map((f) =>
              f.file_path === data.filePath
                ? { ...f, status: "approved", content: data.content || null }
                : f
            );
          } else {
            return [
              ...prev,
              {
                id: Math.random().toString(),
                project_id: projectId,
                file_path: data.filePath!,
                content: data.content || null,
                status: "approved",
                created_at: new Date().toISOString(),
              },
            ];
          }
        });

        // Set completed file as active if none is active or it's first
        setActiveFilePath((prev) => prev || data.filePath || null);
      }

      if (data.type === "build_complete") {
        setGeneratingFilePath(null);
        setLogs((prev) => [
          ...prev,
          {
            type: "build_complete",
            totalFiles: data.totalFiles,
            totalTokens: data.totalTokens,
            totalCost: data.totalCost,
            tokenBreakdown: data.tokenBreakdown,
            timestamp: data.timestamp,
          },
        ]);
        setTokenBreakdown(data.tokenBreakdown);
        setProject((prev) => (prev ? { ...prev, status: "complete" } : null));
        eventSource.close();
      }

      if (data.type === "build_error") {
        setGeneratingFilePath(null);
        setLogs((prev) => [
          ...prev,
          { type: "build_error", error: data.error, timestamp: data.timestamp },
        ]);
        setProject((prev) => (prev ? { ...prev, status: "error" } : null));
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  };

  // ─────────────────────────────────────────────
  // 4. DOWNLOAD PROJECT — Fetch ZIP
  // ─────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/download/${projectId}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.name.toLowerCase().replace(/\s+/g, "-") || "project"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const isComplete = project?.status === "complete" || logs.some((l) => l.type === "build_complete");
  const isBuilding = !isComplete && (project?.status === "building" || project?.status === "planning" || logs.length > 0);

  // Active file content lookup
  const activeFile = useMemo(() => {
    return files.find((f) => f.file_path === activeFilePath) || null;
  }, [files, activeFilePath]);

  return (
    <div className="h-full flex flex-col bg-[#0A0A0F]">
      <AnimatePresence mode="wait">
        {/* Loading initial project details */}
        {editorState === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-center items-center gap-3 h-[80vh]"
          >
            <Loader2 className="h-8 w-8 animate-spin text-[#00B4D8]" />
            <span className="text-sm text-[#8892A4]">Retrieving workspace project...</span>
          </motion.div>
        )}

        {/* Prompt Input State */}
        {editorState === "prompt" && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <PromptInput onSubmit={handlePromptSubmit} loading={apiLoading} />
          </motion.div>
        )}

        {/* Clarifying Questions State */}
        {editorState === "clarifying" && (
          <motion.div
            key="clarifying"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <ClarificationCard
              questions={clarificationQuestions}
              onBack={() => setEditorState("prompt")}
              onContinue={handleClarificationContinue}
              loading={apiLoading}
            />
          </motion.div>
        )}

        {/* VS Code Workspace Builder State */}
        {editorState === "building" && (
          <motion.div
            key="building"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden"
          >
            {/* Top status bar */}
            <div className="h-12 border-b border-[#1E2D40] bg-[#0F1520] flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white text-sm">{project?.name}</span>
                {isBuilding ? (
                  <Badge className="bg-[#00B4D8]/10 text-[#00B4D8] border-[#00B4D8]/20 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    Building Project
                  </Badge>
                ) : isComplete ? (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                    <Check className="h-3 w-3 mr-1.5" />
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-[#1E2D40] text-[#8892A4]">
                    Idle
                  </Badge>
                )}
              </div>

              {/* Total token count & download */}
              <div className="flex items-center gap-4">
                {tokenBreakdown && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#8892A4]">
                    <Zap className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                    <span>
                      {formatTokenCount(tokenBreakdown.total.tokensIn + tokenBreakdown.total.tokensOut)} tokens
                    </span>
                    <span className="text-[#1E2D40]">|</span>
                    <span className="text-green-400">{formatCost(tokenBreakdown.total.costUsd)}</span>
                  </div>
                )}

                <Button
                  onClick={handleDownload}
                  disabled={!isComplete || downloading}
                  size="sm"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white font-medium text-xs h-8"
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Download Project
                </Button>
              </div>
            </div>

            {/* Three-panel workspace */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: File Explorer */}
              <div className="w-[240px] border-r border-[#1E2D40] bg-[#0A0A0F] flex flex-col shrink-0">
                <div className="h-9 px-4 flex items-center border-b border-[#1E2D40]/50 bg-[#0F1520]/20 shrink-0">
                  <span className="text-[10px] font-bold text-[#8892A4] uppercase tracking-wider">
                    Workspace Explorer
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <FileTree
                    files={files}
                    activeFilePath={activeFilePath}
                    onFileSelect={setActiveFilePath}
                    generatingFilePath={generatingFilePath}
                  />
                </div>
              </div>

              {/* Center Panel: Monaco Editor */}
              <div className="flex-1 min-w-0 h-full flex flex-col">
                <CodePanel
                  filePath={activeFilePath}
                  content={activeFile?.content || null}
                  isGenerating={generatingFilePath === activeFilePath}
                />
              </div>

              {/* Right Panel: Logs and Q&A */}
              <div className="shrink-0 h-full">
                <ChatPanel
                  projectId={projectId}
                  logs={logs}
                  tokenBreakdown={tokenBreakdown}
                  buildComplete={isComplete}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
