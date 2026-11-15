'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { CareWorkspace } from '../../contracts/care';
import { makeCareFixtures } from './demo';

type Demo = { workspace: CareWorkspace | null; setWorkspace: React.Dispatch<React.SetStateAction<CareWorkspace | null>>; actor: string; setActor: (actor: string) => void };
const Context = createContext<Demo | null>(null);
/** Demo-only adapter: shared across client navigation, discarded on reload. Never stores real health data. */
export function DemoWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<CareWorkspace | null>(null), [actor, setActor] = useState('sarah');
  useEffect(() => { setWorkspace(makeCareFixtures(new Date().toISOString())); }, []);
  return <Context.Provider value={{ workspace, setWorkspace, actor, setActor }}>{children}</Context.Provider>;
}
export function useDemoWorkspace() {
  const demo = useContext(Context); if (!demo) throw new Error('Demo provider is missing.'); return demo;
}
