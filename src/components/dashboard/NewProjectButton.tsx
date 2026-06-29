"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/db/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, ArrowRight } from "lucide-react";

export default function NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const projectName = name.trim() || `Untitled Project ${new Date().toLocaleDateString()}`;

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName,
          status: "idle",
        })
        .select()
        .single();

      if (error) throw error;

      setOpen(false);
      router.push(`/editor/${data.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 
                       hover:shadow-lg hover:shadow-violet-500/25 text-white font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        }
      />
      <DialogContent className="bg-[#0F1520] border-[#1E2D40] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Start a new project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm text-[#8892A4]">Project name</label>
            <Input
              placeholder="My awesome app..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="bg-[#0A0A0F] border-[#1E2D40] text-white placeholder:text-[#8892A4] 
                         focus:border-[#00B4D8] h-11"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 
                       hover:opacity-90 text-white font-medium"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create & Start Building
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
