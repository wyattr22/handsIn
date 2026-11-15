import type { Metadata } from "next";
import "./globals.css";
import './app-shell.css';
import './medications.css';
import './health.css';
import { CoverageWorkspaceProvider } from '../src/features/coverage/DemoWorkspace';

export const metadata: Metadata = {
  title: "HandsIn — Care is a team effort",
  description: "One shared place for families to coordinate care, so nothing gets missed and no one carries it alone.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><CoverageWorkspaceProvider>{children}</CoverageWorkspaceProvider></body></html>;
}
