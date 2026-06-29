"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/db/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Eye, EyeOff, Check, X, Loader2, Trash2,
  Zap, ChevronDown,
} from "lucide-react";
import { AVAILABLE_MODELS, type AIProvider, type AIModel } from "@/types/project";
import { PROVIDER_INFO, MODEL_PRICING } from "@/types/ai";

interface KeyState {
  key: string;
  preview: string;
  isValid: boolean | null;
  latencyMs: number | null;
  loading: boolean;
  saving: boolean;
  showKey: boolean;
  error: string | null;
  selectedModel: AIModel;
  lastTested: string | null;
}

const defaultKeyState = (provider: AIProvider): KeyState => ({
  key: "",
  preview: "",
  isValid: null,
  latencyMs: null,
  loading: false,
  saving: false,
  showKey: false,
  error: null,
  selectedModel: provider === "openai" ? "gpt-4o" : provider === "anthropic" ? "claude-sonnet-4-6" : "gemini-2.5-flash",
  lastTested: null,
});

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Record<AIProvider, KeyState>>({
    openai: defaultKeyState("openai"),
    anthropic: defaultKeyState("anthropic"),
    google: defaultKeyState("google"),
  });
  const [pageLoading, setPageLoading] = useState(true);
  const [expandedModel, setExpandedModel] = useState<AIProvider | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      const newKeys = { ...keys };
      for (const row of data) {
        const provider = row.provider as AIProvider;
        if (newKeys[provider]) {
          newKeys[provider] = {
            ...newKeys[provider],
            preview: row.key_preview || "",
            isValid: row.is_valid,
            selectedModel: row.selected_model || newKeys[provider].selectedModel,
            lastTested: row.last_tested_at,
          };
        }
      }
      setKeys(newKeys);
    }
    setPageLoading(false);
  };

  const handleTestKey = async (provider: AIProvider) => {
    const state = keys[provider];
    if (!state.key && !state.preview) return;

    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], loading: true, error: null },
    }));

    try {
      const res = await fetch("/api/keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: state.key || undefined }),
      });

      const result = await res.json();

      setKeys((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          isValid: result.valid,
          latencyMs: result.latencyMs,
          loading: false,
          error: result.valid ? null : result.error || "Invalid key",
        },
      }));
    } catch {
      setKeys((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], loading: false, error: "Connection failed" },
      }));
    }
  };

  const handleSaveKey = async (provider: AIProvider) => {
    const state = keys[provider];
    if (!state.key) return;

    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], saving: true, error: null },
    }));

    try {
      const res = await fetch("/api/keys/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          key: state.key,
          selectedModel: state.selectedModel,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setKeys((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            key: "",
            preview: result.preview || prev[provider].preview,
            isValid: true,
            saving: false,
            lastTested: new Date().toISOString(),
          },
        }));
      } else {
        setKeys((prev) => ({
          ...prev,
          [provider]: { ...prev[provider], saving: false, error: result.error },
        }));
      }
    } catch {
      setKeys((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], saving: false, error: "Save failed" },
      }));
    }
  };

  const handleRemoveKey = async (provider: AIProvider) => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("api_keys")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      setKeys((prev) => ({
        ...prev,
        [provider]: defaultKeyState(provider),
      }));
    } catch {
      console.error("Failed to remove key");
    }
  };

  const handleModelSelect = async (provider: AIProvider, modelId: AIModel) => {
    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], selectedModel: modelId },
    }));
    setExpandedModel(null);

    // If key already saved, update the selected model in DB
    if (keys[provider].preview) {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from("api_keys")
          .update({ selected_model: modelId })
          .eq("user_id", user.id)
          .eq("provider", provider);
      } catch {
        console.error("Failed to update model preference");
      }
    }
  };

  const providers: AIProvider[] = ["openai", "anthropic", "google"];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Shield className="h-6 w-6 text-[#00B4D8]" />
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
      </div>
      <p className="text-sm text-[#8892A4] mb-8">
        Your keys are encrypted and never logged. Add keys for each AI provider and select which model to use.
      </p>

      {/* Loading */}
      {pageLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#0F1520] border border-[#1E2D40] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg bg-[#1E2D40]" />
                <div>
                  <Skeleton className="h-5 w-32 bg-[#1E2D40]" />
                  <Skeleton className="h-3 w-48 mt-1 bg-[#1E2D40]" />
                </div>
              </div>
              <Skeleton className="h-11 w-full bg-[#1E2D40]" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32 bg-[#1E2D40]" />
                <Skeleton className="h-9 w-24 bg-[#1E2D40]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provider cards */}
      {!pageLoading && (
        <div className="space-y-4">
          {providers.map((provider, index) => {
            const info = PROVIDER_INFO[provider];
            const state = keys[provider];
            const models = AVAILABLE_MODELS[provider];

            return (
              <motion.div
                key={provider}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="bg-[#0F1520] border border-[#1E2D40] rounded-xl p-6 hover:border-[#1E2D40]/80 transition-colors"
              >
                {/* Provider header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${info.color}15` }}
                    >
                      <Zap className="h-5 w-5" style={{ color: info.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{info.name}</h3>
                      <p className="text-xs text-[#8892A4]">Used for: {info.usedFor}</p>
                    </div>
                  </div>

                  {/* Status badge */}
                  {state.isValid === true && (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                      <Check className="h-3 w-3 mr-1" />
                      Valid {state.latencyMs ? `— ${state.latencyMs}ms` : ""}
                    </Badge>
                  )}
                  {state.isValid === false && (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/30">
                      <X className="h-3 w-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                  {state.isValid === null && !state.preview && (
                    <Badge variant="outline" className="border-[#1E2D40] text-[#8892A4]">
                      Not set
                    </Badge>
                  )}
                </div>

                {/* Model selector */}
                <div className="mb-4">
                  <label className="text-xs text-[#8892A4] mb-2 block font-medium uppercase tracking-wider">
                    Selected Model
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setExpandedModel(expandedModel === provider ? null : provider)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg 
                                 bg-[#0A0A0F] border border-[#1E2D40] hover:border-[#3949AB] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                        <div>
                          <span className="text-sm font-medium text-white">
                            {models.find((m) => m.id === state.selectedModel)?.name || state.selectedModel}
                          </span>
                          <span className="text-xs text-[#8892A4] ml-2">
                            {models.find((m) => m.id === state.selectedModel)?.description}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-[#8892A4] transition-transform ${
                          expandedModel === provider ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Model dropdown */}
                    <AnimatePresence>
                      {expandedModel === provider && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -4, height: 0 }}
                          className="absolute z-10 w-full mt-1 rounded-lg bg-[#0A0A0F] border border-[#1E2D40] overflow-hidden shadow-xl"
                        >
                          {models.map((model) => {
                            const pricing = MODEL_PRICING[model.id];
                            const isSelected = state.selectedModel === model.id;

                            return (
                              <button
                                key={model.id}
                                onClick={() => handleModelSelect(provider, model.id as AIModel)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#0F1520] transition-colors ${
                                  isSelected ? "bg-[#0F1520] border-l-2 border-l-[#00B4D8]" : ""
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {isSelected && <Check className="h-3.5 w-3.5 text-[#00B4D8]" />}
                                  <div className={isSelected ? "" : "ml-[22px]"}>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-medium ${isSelected ? "text-[#00B4D8]" : "text-white"}`}>
                                        {model.name}
                                      </span>
                                      {model.tier === "recommended" && (
                                        <Badge className="text-[9px] bg-[#00B4D8]/10 text-[#00B4D8] border-[#00B4D8]/30 px-1.5 py-0">
                                          RECOMMENDED
                                        </Badge>
                                      )}
                                      {model.tier === "premium" && (
                                        <Badge className="text-[9px] bg-violet-500/10 text-violet-400 border-violet-500/30 px-1.5 py-0">
                                          PREMIUM
                                        </Badge>
                                      )}
                                      {model.tier === "budget" && (
                                        <Badge className="text-[9px] bg-green-500/10 text-green-400 border-green-500/30 px-1.5 py-0">
                                          BUDGET
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#8892A4]">{model.description}</p>
                                  </div>
                                </div>
                                {pricing && (
                                  <div className="text-right">
                                    <p className="text-[10px] text-[#8892A4]">
                                      ${pricing.input}/M in · ${pricing.output}/M out
                                    </p>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* API Key input */}
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type={state.showKey ? "text" : "password"}
                      placeholder={state.preview || `Paste your ${info.name} API key (${info.keyPrefix}...)`}
                      value={state.key}
                      onChange={(e) =>
                        setKeys((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], key: e.target.value, error: null },
                        }))
                      }
                      className="bg-[#0A0A0F] border-[#1E2D40] text-white placeholder:text-[#8892A4] 
                                 focus:border-[#00B4D8] h-11 pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setKeys((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], showKey: !prev[provider].showKey },
                        }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892A4] hover:text-white transition-colors"
                    >
                      {state.showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Error */}
                  {state.error && (
                    <p className="text-xs text-red-400">{state.error}</p>
                  )}

                  {/* Help text */}
                  <p className="text-xs text-[#8892A4]">
                    Get key at{" "}
                    <span className="text-[#00B4D8]">{info.keyUrl}</span>
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestKey(provider)}
                      disabled={state.loading || (!state.key && !state.preview)}
                      className="bg-[#0A0A0F] border-[#1E2D40] text-[#8892A4] hover:text-white hover:border-[#00B4D8]"
                    >
                      {state.loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : null}
                      Test Connection
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleSaveKey(provider)}
                      disabled={state.saving || !state.key}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90"
                    >
                      {state.saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : null}
                      Save Key
                    </Button>

                    {state.preview && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveKey(provider)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/20 ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
