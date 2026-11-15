import { HealthFlowShell } from '@/components/health/HealthFlowShell';
import { HealthFlowProvider } from '@/components/health/HealthFlowProvider';
export default function Layout({children}:{children:React.ReactNode}){return <HealthFlowProvider><HealthFlowShell>{children}</HealthFlowShell></HealthFlowProvider>;}


