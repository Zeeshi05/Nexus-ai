"use client";

import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/db/supabase";

export default function TopBar() {
  const pathname = usePathname();
  const [buildsUsed, setBuildsUsed] = useState(0);
  const [buildsLimit, setBuildsLimit] = useState(3);
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("builds_used, builds_limit, plan")
          .eq("id", user.id)
          .single();
        if (data) {
          setBuildsUsed(data.builds_used);
          setBuildsLimit(data.builds_limit);
          setPlan(data.plan);
        }
      }
    };
    load();
  }, []);

  // Derive breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    isLast: i === segments.length - 1,
  }));

  return (
    <div className="h-14 border-b border-[#1E2D40] bg-[#0A0A0F]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-[#1E2D40]">/</span>}
            <span className={crumb.isLast ? "text-white font-medium" : "text-[#8892A4]"}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Builds usage */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0F1520] border border-[#1E2D40]">
          <span className="text-xs text-[#8892A4]">
            {buildsUsed} / {buildsLimit} builds
          </span>
          <Progress
            value={(buildsUsed / buildsLimit) * 100}
            className="w-16 h-1.5 bg-[#1E2D40]"
          />
        </div>

        {/* Plan badge */}
        <Badge
          variant="outline"
          className={`text-[10px] uppercase tracking-wider ${
            plan === "pro"
              ? "border-[#5C35C5] text-[#5C35C5]"
              : plan === "team"
              ? "border-[#00B4D8] text-[#00B4D8]"
              : "border-[#1E2D40] text-[#8892A4]"
          }`}
        >
          {plan}
        </Badge>

        {/* Notification bell */}
        <button className="relative text-[#8892A4] hover:text-white transition-colors">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
