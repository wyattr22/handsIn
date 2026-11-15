'use client';
import type { Dispatch, SetStateAction } from 'react';
import type { CareWorkspace } from '../../contracts/care';
import { useCoverageWorkspace } from '../coverage/DemoWorkspace';
/** Compatibility adapter: care and calendar now use one application-owned workspace. */
export function useDemoWorkspace() {
  const {care,setCare,actor,setActor} = useCoverageWorkspace();
  const setWorkspace: Dispatch<SetStateAction<CareWorkspace | null>> = update => setCare(previous => (typeof update === 'function' ? update(previous) : update) || previous);
  return {workspace:care,setWorkspace,actor,setActor};
}
export function DemoWorkspaceProvider({children}:{children:React.ReactNode}){return children;}

