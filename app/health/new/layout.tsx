import { HealthFlowShell } from '@/components/health/HealthFlowShell';
import { HealthFlowProvider } from '@/components/health/HealthFlowProvider';
import {redirect} from 'next/navigation';
import {peopleFoundationReady} from '@/src/lib/supabase/foundation';
export default function Layout({children}:{children:React.ReactNode}){if(peopleFoundationReady())redirect('/workspace?section=health&capture=1');return <HealthFlowProvider><HealthFlowShell>{children}</HealthFlowShell></HealthFlowProvider>;}

