'use client';
import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createDemoStore } from './domain';
import type { DemoStore } from './domain';
import type { CoordinationState } from '../../contracts/coordination';
import type { CareWorkspace } from '../../contracts/care';
import { makeCareFixtures } from '../care/demo';
import type { MedicationDraft } from '../../../lib/medications/types';
import type { HealthDraft } from '../../../lib/health/types';

export const DEMO_NOW = '2026-11-15T18:00:00Z';
export type SavedMedication = { id: string; draft: MedicationDraft; savedAt: string };
export type SavedReport = { id: string; draft: HealthDraft; savedAt: string };
type Workspace = {
  store: DemoStore; setStore: Dispatch<SetStateAction<DemoStore>>;
  care: CareWorkspace; setCare: Dispatch<SetStateAction<CareWorkspace>>;
  calendar: CoordinationState; setCalendar: Dispatch<SetStateAction<CoordinationState>>;
  medications: SavedMedication[]; setMedications: Dispatch<SetStateAction<SavedMedication[]>>;
  reports: SavedReport[]; setReports: Dispatch<SetStateAction<SavedReport[]>>;
  medicationDrafts: Record<string, MedicationDraft>; setMedicationDrafts: Dispatch<SetStateAction<Record<string, MedicationDraft>>>;
  healthDrafts: Record<string, HealthDraft>; setHealthDrafts: Dispatch<SetStateAction<Record<string, HealthDraft>>>;
  actor: string; setActor: Dispatch<SetStateAction<string>>;
  now: string; setNow: Dispatch<SetStateAction<string>>;
  selected: string; setSelected: Dispatch<SetStateAction<string>>;
};
const Context = createContext<Workspace | null>(null);
export function CoverageWorkspaceProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState(createDemoStore);
  const [care, setCare] = useState(() => makeCareFixtures(DEMO_NOW));
  const [medications, setMedications] = useState<SavedMedication[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [medicationDrafts,setMedicationDrafts] = useState<Record<string,MedicationDraft>>({});
  const [healthDrafts,setHealthDrafts] = useState<Record<string,HealthDraft>>({});
  const [actor, setActor] = useState('sarah');
  const [now, setNow] = useState(DEMO_NOW);
  const [selected, setSelected] = useState('alex');
  const calendar = care.coordination;
  const setCalendar: Dispatch<SetStateAction<CoordinationState>> = update => setCare(previous => ({...previous, coordination: typeof update === 'function' ? update(previous.coordination) : update}));
  return <Context.Provider value={{ store, setStore, care, setCare, calendar, setCalendar, medications,setMedications,reports,setReports,medicationDrafts,setMedicationDrafts,healthDrafts,setHealthDrafts,actor, setActor, now, setNow, selected, setSelected }}>{children}</Context.Provider>;
}
export function useCoverageWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error('The shared application workspace is missing.');
  return context;
}

