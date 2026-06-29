"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatTokenCount, formatCost } from "@/types/ai";
import type { Project } from "@/types/project";
import { FileCode2, Coins, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; color: string; pulse: boolean }> = {
  idle: { label: "Idle", color: "bg-gray-500", pulse: false },
  clarifying: { label: "Clarifying...", color: "bg-amber-500", pulse: true },
  planning: { label: "Planning...", color: "bg-blue-500", pulse: true },
  building: { label: "Building...", color: "bg-[#00B4D8]", pulse: true },
  reviewing: { label: "Reviewing...", color: "bg-purple-500", pulse: true },
  complete: { label: "Complete", color: "bg-green-500", pulse: false },
  error: { label: "Error", color: "bg-red-500", pulse: false },
};

export default function ProjectCard({ project, index }: { project: Project; index: number }) {
  const status = statusConfig[project.status] || statusConfig.idle;

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link href={`/editor/${project.id}`}>
        <div className="group bg-[#0F1520] border border-[#1E2D40] rounded-xl p-5 
                        hover:border-[#3949AB] hover:shadow-lg hover:shadow-[#00B4D8]/5 
                        transition-all duration-300 cursor-pointer">
          {/* Status */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${status.color} ${status.pulse ? "animate-pulse" : ""}`} />
            <span className="text-xs text-[#8892A4] font-medium">{status.label}</span>
          </div>

          {/* Title */}
          <h3 className="text-white font-semibold text-base mb-1 group-hover:text-[#00B4D8] transition-colors">
            {project.name}
          </h3>

          {/* Tech stack */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {project.tech_stack?.frontend && (
              <Badge variant="outline" className="text-[10px] border-[#1E2D40] text-[#8892A4] bg-[#0A0A0F]">
                {project.tech_stack.frontend}
              </Badge>
            )}
            {project.tech_stack?.backend && (
              <Badge variant="outline" className="text-[10px] border-[#1E2D40] text-[#8892A4] bg-[#0A0A0F]">
                {project.tech_stack.backend}
              </Badge>
            )}
            {project.tech_stack?.database && (
              <Badge variant="outline" className="text-[10px] border-[#1E2D40] text-[#8892A4] bg-[#0A0A0F]">
                {project.tech_stack.database}
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-[#8892A4] mb-4">
            <span className="flex items-center gap-1">
              <FileCode2 className="h-3 w-3" />
              {project.file_count} files
            </span>
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {formatTokenCount(project.tokens_used)} tokens
            </span>
            <span className="flex items-center gap-1">
              <span className="text-green-400">{formatCost(project.cost_usd)}</span>
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8892A4] flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(project.updated_at)}
            </span>
            <span className="flex items-center gap-1 text-xs text-[#00B4D8] opacity-0 group-hover:opacity-100 transition-opacity">
              Open Editor <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
