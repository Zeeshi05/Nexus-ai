"use client";

import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/db/supabase";
import {
  LayoutDashboard,
  Plus,
  Settings,
  Key,
  LogOut,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { UserProfile } from "@/types/project";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard?new=true", label: "New Project", icon: Plus, highlight: true },
  { href: "/settings/api-keys", label: "API Keys", icon: Key },
  { href: "/settings/api-keys", label: "Settings", icon: Settings },
];

function SidebarContent({ pathname, profile, onLogout }: {
  pathname: string;
  profile: UserProfile | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00B4D8] to-[#5C35C5] flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white">NEXUS</span>{" "}
            <span className="text-lg font-bold text-[#00B4D8]">AI</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/dashboard" && pathname.startsWith("/dashboard") && !pathname.includes("new"));
          const Icon = item.icon;

          return (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                item.highlight
                  ? "bg-gradient-to-r from-violet-600/20 to-indigo-600/20 text-violet-300 border border-violet-500/30 hover:from-violet-600/30 hover:to-indigo-600/30"
                  : isActive
                  ? "bg-[#1E2D40] text-white border-l-[3px] border-l-[#00B4D8]"
                  : "text-[#8892A4] hover:text-white hover:bg-[#0F1520]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-[#1E2D40]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3949AB] to-[#5C35C5] flex items-center justify-center text-xs font-bold text-white">
            {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-xs text-[#8892A4] truncate">{profile?.email}</p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-[#1E2D40] text-[#8892A4] uppercase tracking-wider"
          >
            {profile?.plan || "free"}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full justify-start text-[#8892A4] hover:text-red-400 hover:bg-red-950/20"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data as UserProfile);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[240px] h-screen bg-[#0A0A0F] border-r border-[#1E2D40] flex-col fixed left-0 top-0 z-30">
        <SidebarContent pathname={pathname} profile={profile} onLogout={handleLogout} />
      </aside>

      {/* Mobile hamburger + sheet */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="bg-[#0F1520] border border-[#1E2D40] text-white"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            }
          />
          <SheetContent side="left" className="w-[240px] bg-[#0A0A0F] border-r-[#1E2D40] p-0">
            <SidebarContent pathname={pathname} profile={profile} onLogout={handleLogout} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
