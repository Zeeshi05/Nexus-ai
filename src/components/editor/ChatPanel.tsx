"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, Loader2, Send, Zap, 
  Check, AlertTriangle, Play, Coins 
} from "lucide-react";
import { formatTokenCount, formatCost } from "@/types/ai";
import type { TokenBreakdown } from "@/types/project";

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

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ChatPanelProps {
  projectId: string;
  logs: LogMessage[];
  tokenBreakdown?: TokenBreakdown;
  buildComplete: boolean;
}

const chatSuggestions = [
  "Explain the folder structure",
  "How do I run this project?",
  "What dependencies were added?",
];

export default function ChatPanel({
  projectId,
  logs,
  tokenBreakdown,
  buildComplete,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("logs");

  const logEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault();
    const textToSend = (customText || input).trim();
    if (!textToSend || chatLoading) return;

    if (!customText) setInput("");

    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, message: textToSend }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.error || "Failed to get response." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Network error. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="w-[320px] border-l border-[#1E2D40] bg-[#0A0A0F] flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-[#0F1520] border-b border-[#1E2D40] rounded-none grid grid-cols-2 p-0 h-11 shrink-0">
          <TabsTrigger
            value="logs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00B4D8] data-[state=active]:bg-transparent text-xs text-[#8892A4] data-[state=active]:text-white font-medium"
          >
            Build Log
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00B4D8] data-[state=active]:bg-transparent text-xs text-[#8892A4] data-[state=active]:text-white font-medium"
          >
            Ask Claude
          </TabsTrigger>
        </TabsList>

        {/* BUILD LOGS */}
        <TabsContent value="logs" className="flex-1 min-h-0 p-0 m-0 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3 pr-2">
              {logs.map((log, i) => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                
                return (
                  <div key={i} className="text-xs space-y-1 bg-[#0F1520]/50 border border-[#1E2D40]/30 rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-[#8892A4] mb-1">
                      <span className="font-mono text-[10px]">{time}</span>
                      {log.assignedTo && (
                        <Badge variant="outline" className="text-[9px] border-[#1E2D40] text-[#8892A4] uppercase px-1 py-0 scale-90">
                          {log.assignedTo}
                        </Badge>
                      )}
                    </div>

                    {log.type === "planning_start" && (
                      <p className="text-white font-medium flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00B4D8]" />
                        Architecting project plan...
                      </p>
                    )}

                    {log.type === "planning_complete" && (
                      <p className="text-green-400 font-medium flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        Plan created: {log.total} files scheduled
                      </p>
                    )}

                    {log.type === "task_start" && (
                      <p className="text-white flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                        Building: <span className="font-mono text-[#8892A4] text-[11px] truncate">{log.filePath}</span>
                      </p>
                    )}

                    {log.type === "file_complete" && (
                      <p className="text-green-400 flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        Complete: <span className="font-mono text-[#8892A4] text-[11px] truncate">{log.filePath}</span>
                      </p>
                    )}

                    {log.type === "build_error" && (
                      <div className="space-y-1">
                        <p className="text-red-400 font-medium flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Build failed
                        </p>
                        <p className="text-[#8892A4] text-[10px]">{log.error}</p>
                      </div>
                    )}

                    {log.type === "build_complete" && (
                      <div className="space-y-2 pt-1 border-t border-[#1E2D40]/30 mt-2">
                        <p className="text-green-400 font-semibold flex items-center gap-1.5">
                          🎉 Project generated successfully!
                        </p>
                        <div className="space-y-1 font-mono text-[10px] text-[#8892A4] bg-[#0A0A0F] p-2 rounded">
                          {log.tokenBreakdown && (
                            <>
                              <div className="flex justify-between">
                                <span>GPT-4o:</span>
                                <span>{formatTokenCount(log.tokenBreakdown.gpt4o.tokensIn + log.tokenBreakdown.gpt4o.tokensOut)} tokens · {formatCost(log.tokenBreakdown.gpt4o.costUsd)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Claude:</span>
                                <span>{formatTokenCount(log.tokenBreakdown.claude.tokensIn + log.tokenBreakdown.claude.tokensOut)} tokens · {formatCost(log.tokenBreakdown.claude.costUsd)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gemini:</span>
                                <span>{formatTokenCount(log.tokenBreakdown.gemini.tokensIn + log.tokenBreakdown.gemini.tokensOut)} tokens · {formatCost(log.tokenBreakdown.gemini.costUsd)}</span>
                              </div>
                              <div className="border-t border-[#1E2D40]/50 my-1 pt-1 flex justify-between font-bold text-white">
                                <span>Total:</span>
                                <span>{formatTokenCount(log.totalTokens || 0)} tokens · {formatCost(log.totalCost || 0)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ASK CLAUDE CHAT */}
        <TabsContent value="chat" className="flex-1 min-h-0 p-0 m-0 flex flex-col bg-[#0A0A0F]">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-600/10 flex items-center justify-center border border-violet-500/20">
                <MessageSquare className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Ask Claude</h4>
                <p className="text-xs text-[#8892A4] mt-1 max-w-[200px]">
                  Ask questions about code, ask to explain logic, or ask how to run the project.
                </p>
              </div>

              <div className="w-full space-y-2 pt-4">
                {chatSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSendMessage(undefined, s)}
                    className="w-full text-left p-2.5 rounded-lg bg-[#0F1520] border border-[#1E2D40] text-xs text-[#8892A4] hover:text-white hover:border-[#00B4D8] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 pr-2">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-violet-600 text-white"
                          : "bg-[#0F1520] border border-[#1E2D40] text-[#F8F9FF]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#0F1520] border border-[#1E2D40] rounded-xl p-3 text-xs text-[#8892A4] flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00B4D8]" />
                      Claude is thinking...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
          )}

          {/* Chat input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-[#1E2D40] bg-[#0F1520] flex gap-2"
          >
            <Input
              placeholder="Ask Claude..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={chatLoading}
              className="bg-[#0A0A0F] border-[#1E2D40] text-white placeholder:text-[#8892A4] focus:border-[#00B4D8] text-xs h-9"
            />
            <Button
              type="submit"
              disabled={chatLoading || !input.trim()}
              size="icon"
              className="bg-[#5C35C5] hover:bg-[#5C35C5]/90 text-white shrink-0 h-9 w-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
