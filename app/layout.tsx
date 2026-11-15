import type { Metadata } from "next";
import "./globals.css";
import { DemoWorkspaceProvider } from '../src/features/care/DemoWorkspace';

export const metadata: Metadata = {
  title: "HandsIn — Care is a team effort",
  description: "One shared place for families to coordinate care, so nothing gets missed and no one carries it alone.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><DemoWorkspaceProvider>{children}</DemoWorkspaceProvider></body></html>;
}
