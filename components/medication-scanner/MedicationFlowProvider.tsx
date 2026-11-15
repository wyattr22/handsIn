"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { emptyMedicationDraft, type MedicationDraft } from "@/lib/medications/types";

type FlowContextValue = {
  draft: MedicationDraft;
  updateDraft: (patch: Partial<MedicationDraft>) => void;
  resetDraft: () => void;
  hydrated: boolean;
};

const FlowContext = createContext<FlowContextValue | null>(null);
const storageKey = "handsin-medication-draft-v1";

export function MedicationFlowProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<MedicationDraft>(emptyMedicationDraft);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);
    if (saved) {
      try { setDraft({ ...emptyMedicationDraft, ...JSON.parse(saved) }); } catch { /* Ignore malformed demo data. */ }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, hydrated]);

  const updateDraft = useCallback((patch: Partial<MedicationDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);
  const resetDraft = useCallback(() => setDraft(emptyMedicationDraft), []);
  const value = useMemo(() => ({ draft, updateDraft, resetDraft, hydrated }), [draft, updateDraft, resetDraft, hydrated]);

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useMedicationFlow() {
  const value = useContext(FlowContext);
  if (!value) throw new Error("useMedicationFlow must be used inside MedicationFlowProvider");
  return value;
}
