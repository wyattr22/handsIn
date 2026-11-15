import type { Metadata } from "next";
import "./globals.css";
import "./health.css";

export const metadata: Metadata = {
  title: "HandsIn — Care is a team effort",
  description: "One shared place for families to coordinate care, so nothing gets missed and no one carries it alone.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
