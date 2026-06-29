"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/db/supabase";
import ProjectCard from "@/components/dashboard/ProjectCard";
import NewProjectButton from "@/components/dashboard/NewProjectButton";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Boxes, ArrowRight, AlertTriangle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Project } from "@/types/project";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAllKeys, setHasAllKeys] = useState(true);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load projects
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (projectData) setProjects(projectData as Project[]);

      // Check API keys
      const { data: keys } = await supabase
        .from("api_keys")
        .select("provider, is_valid")
        .eq("user_id", user.id);

      const providers = ["openai", "anthropic", "google"];
      const keyProviders = (keys || []).filter(k => k.is_valid).map(k => k.provider);
      const missing = providers.filter(p => !keyProviders.includes(p));
      setMissingKeys(missing);
      setHasAllKeys(missing.length === 0);

      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Onboarding banner for missing keys */}
      {!loading && !hasAllKeys && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-[#0F1520] to-[#141E2E] border border-amber-500/30 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-2">
                ⚡ Complete setup — Add your API keys to start building
              </p>
              <div className="flex gap-2 mt-1">
                {missingKeys.map((key) => (
                  <span key={key} className="flex items-center gap-1 text-xs text-[#8892A4]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Link href="/settings/api-keys">
            <Button size="sm" className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30">
              <Key className="h-3.5 w-3.5 mr-1.5" />
              Go to API Keys
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Projects</h1>
          <p className="text-sm text-[#8892A4] mt-1">
            {projects.length > 0
              ? `${projects.length} project${projects.length !== 1 ? "s" : ""}`
              : "Get started by creating your first project"}
          </p>
        </div>
        <NewProjectButton />
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#0F1520] border border-[#1E2D40] rounded-xl p-5 space-y-4">
              <Skeleton className="h-4 w-20 bg-[#1E2D40]" />
              <Skeleton className="h-5 w-40 bg-[#1E2D40]" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 bg-[#1E2D40]" />
                <Skeleton className="h-5 w-16 bg-[#1E2D40]" />
              </div>
              <Skeleton className="h-4 w-full bg-[#1E2D40]" />
              <Skeleton className="h-8 w-28 bg-[#1E2D40]" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <div className="mx-auto w-20 h-20 bg-[#0F1520] border border-[#1E2D40] rounded-2xl flex items-center justify-center mb-6">
            <Boxes className="h-10 w-10 text-[#8892A4]" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-[#8892A4] mb-8 max-w-sm mx-auto">
            Describe what you want to build and NEXUS will build it for you using three AI models working together.
          </p>
          <NewProjectButton />
        </motion.div>
      )}

      {/* Project grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
