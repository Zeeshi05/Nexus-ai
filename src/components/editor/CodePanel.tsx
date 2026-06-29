"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Terminal, Copy, Check } from "lucide-react";
import { useState } from "react";

// Dynamic import with SSR disabled to prevent Monaco loading crashes during server builds
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <MonacoLoader />,
});

interface CodePanelProps {
  filePath: string | null;
  content: string | null;
  isGenerating?: boolean;
}

function MonacoLoader() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center h-[500px] gap-3">
      <Skeleton className="h-6 w-11/12 bg-[#1E2D40]" />
      <Skeleton className="h-6 w-10/12 bg-[#1E2D40]" />
      <Skeleton className="h-6 w-9/12 bg-[#1E2D40]" />
      <Skeleton className="h-6 w-11/12 bg-[#1E2D40]" />
      <span className="text-xs text-[#8892A4] mt-2 animate-pulse">Loading code editor...</span>
    </div>
  );
}

function getLanguageFromExtension(fileName: string | null): string {
  if (!fileName) return "plaintext";
  const ext = fileName.split(".").pop();
  switch (ext) {
    case "tsx":
    case "jsx":
      return "typescript";
    case "ts":
      return "typescript";
    case "js":
      return "javascript";
    case "css":
      return "css";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "html":
      return "html";
    default:
      return "plaintext";
  }
}

export default function CodePanel({ filePath, content, isGenerating }: CodePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!filePath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0F]/50 h-full p-8 text-center">
        <Terminal className="h-12 w-12 text-[#1E2D40] mb-3" />
        <h3 className="font-semibold text-white mb-1">No file selected</h3>
        <p className="text-xs text-[#8892A4] max-w-xs">
          Select a file from the tree view to inspect its contents.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0F]">
      {/* File Header */}
      <div className="h-10 border-b border-[#1E2D40] flex items-center justify-between px-4 bg-[#0F1520]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#8892A4]">{filePath}</span>
          {isGenerating && (
            <span className="text-[10px] bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/20 px-1.5 py-0.5 rounded animate-pulse">
              Generating...
            </span>
          )}
        </div>
        {content && (
          <button
            onClick={handleCopy}
            className="text-xs text-[#8892A4] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy code
              </>
            )}
          </button>
        )}
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-hidden relative">
        {content ? (
          <Editor
            height="100%"
            theme="vs-dark"
            language={getLanguageFromExtension(filePath)}
            value={content}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "var(--font-mono), Consolas, monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12 },
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col justify-center items-center gap-3">
            <Skeleton className="h-4 w-11/12 bg-[#1E2D40]/50" />
            <Skeleton className="h-4 w-10/12 bg-[#1E2D40]/50" />
            <Skeleton className="h-4 w-9/12 bg-[#1E2D40]/50" />
            <span className="text-xs text-[#8892A4] animate-pulse">Waiting for content...</span>
          </div>
        )}
      </div>
    </div>
  );
}
