"use client";

import { useState } from "react";
import { 
  ChevronRight, ChevronDown, File, 
  FileCode, FileJson, FileText, Play, AlertCircle 
} from "lucide-react";
import type { ProjectFile, FileStatus } from "@/types/project";

interface FileTreeProps {
  files: ProjectFile[];
  activeFilePath: string | null;
  onFileSelect: (path: string) => void;
  generatingFilePath?: string | null;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: Record<string, TreeNode>;
  status?: FileStatus;
}

// Helper to build nested tree structure from flat paths
function buildTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = { name: "root", path: "", isFolder: true, children: {} };

  for (const file of files) {
    const parts = file.file_path.split("/");
    let current = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          children: {},
          status: isLast ? file.status : undefined,
        };
      } else if (isLast) {
        current.children[part].status = file.status;
      }

      current = current.children[part];
    }
  }

  return root;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop();
  switch (ext) {
    case "tsx":
    case "jsx":
      return <FileCode className="h-4 w-4 text-[#00B4D8]" />;
    case "ts":
    case "js":
      return <FileCode className="h-4 w-4 text-yellow-500" />;
    case "css":
      return <FileText className="h-4 w-4 text-pink-500" />;
    case "json":
      return <FileJson className="h-4 w-4 text-orange-400" />;
    case "md":
      return <FileText className="h-4 w-4 text-white" />;
    default:
      return <File className="h-4 w-4 text-[#8892A4]" />;
  }
}

function RenderTreeNode({
  node,
  depth,
  activeFilePath,
  onFileSelect,
  generatingFilePath,
}: {
  node: TreeNode;
  depth: number;
  activeFilePath: string | null;
  onFileSelect: (path: string) => void;
  generatingFilePath?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleFolder = () => setIsOpen(!isOpen);

  if (node.isFolder) {
    // Sort folder children: folders first, then files
    const sortedChildren = Object.values(node.children).sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="space-y-0.5">
        <button
          onClick={toggleFolder}
          className="w-full flex items-center gap-1.5 py-1 px-2 hover:bg-[#141E2E]/60 text-sm font-medium text-[#8892A4] hover:text-white transition-colors text-left"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          <span>{node.name}</span>
        </button>
        {isOpen && (
          <div className="space-y-0.5">
            {sortedChildren.map((child) => (
              <RenderTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                onFileSelect={onFileSelect}
                generatingFilePath={generatingFilePath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activeFilePath === node.path;
  const isGenerating = generatingFilePath === node.path || node.status === "generating";
  const isApproved = node.status === "approved";
  const isFailed = node.status === "failed";

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={`w-full flex items-center justify-between py-1.5 px-2 rounded text-sm transition-colors text-left ${
        isActive
          ? "bg-[#1E2D40] text-white"
          : isGenerating
          ? "text-[#00B4D8]"
          : "text-[#8892A4] hover:text-white hover:bg-[#141E2E]/40"
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <div className="flex items-center gap-2 truncate">
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </div>

      <div className="flex items-center">
        {isGenerating && (
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B4D8] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00B4D8]"></span>
          </span>
        )}
        {isApproved && <CheckStatusIcon />}
        {isFailed && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
      </div>
    </button>
  );
}

function CheckStatusIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function FileTree({
  files,
  activeFilePath,
  onFileSelect,
  generatingFilePath,
}: FileTreeProps) {
  const tree = buildTree(files);

  const sortedRootChildren = Object.values(tree.children).sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="py-2 overflow-y-auto h-full">
      {files.length === 0 ? (
        <div className="p-4 text-xs text-[#8892A4] text-center">
          No files generated yet
        </div>
      ) : (
        <div className="space-y-0.5">
          {sortedRootChildren.map((child) => (
            <RenderTreeNode
              key={child.path}
              node={child}
              depth={0}
              activeFilePath={activeFilePath}
              onFileSelect={onFileSelect}
              generatingFilePath={generatingFilePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export type { TreeNode };
