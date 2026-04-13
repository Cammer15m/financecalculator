import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Calculator",
  description: "Free mortgage, HELOC, and Smith Maneuver calculators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
