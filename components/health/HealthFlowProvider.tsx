"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { emptyHealthDraft, type HealthDraft } from "@/lib/health/types";

type HealthFlowValue = { draft: HealthDraft; updateDraft: (patch: Partial<HealthDraft>) => void; resetDraft: () => void; hydrated: boolean };
const HealthFlowContext = createContext<HealthFlowValue | null>(null);
const key = "handsin-health-draft-v1";

export function HealthFlowProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState(emptyHealthDraft);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { const saved = sessionStorage.getItem(key); if (saved) { try { setDraft({ ...emptyHealthDraft, ...JSON.parse(saved) }); } catch {} } setHydrated(true); }, []);
  useEffect(() => { if (hydrated) sessionStorage.setItem(key, JSON.stringify({ ...draft, sourceUrl: "" })); }, [draft, hydrated]);
  const updateDraft = useCallback((patch: Partial<HealthDraft>) => setDraft((value) => ({ ...value, ...patch })), []);
  const resetDraft = useCallback(() => setDraft(emptyHealthDraft), []);
  const value = useMemo(() => ({ draft, updateDraft, resetDraft, hydrated }), [draft, updateDraft, resetDraft, hydrated]);
  return <HealthFlowContext.Provider value={value}>{children}</HealthFlowContext.Provider>;
}

export function useHealthFlow() { const value = useContext(HealthFlowContext); if (!value) throw new Error("Health flow provider missing"); return value; }
