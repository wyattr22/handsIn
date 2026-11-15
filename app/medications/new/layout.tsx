import { FlowShell } from '@/components/medication-scanner/FlowShell';
import { MedicationFlowProvider } from '@/components/medication-scanner/MedicationFlowProvider';
import {redirect} from 'next/navigation';
import {peopleFoundationReady} from '@/src/lib/supabase/foundation';
export default function Layout({children}:{children:React.ReactNode}){if(peopleFoundationReady())redirect('/workspace?section=medications&capture=1');return <MedicationFlowProvider><FlowShell>{children}</FlowShell></MedicationFlowProvider>;}

