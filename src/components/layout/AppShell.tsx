import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0A0A0F]">
      <Sidebar />
      <main className="flex-1 md:ml-[240px] flex flex-col h-screen overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
