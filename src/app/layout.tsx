import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InnovationFlow AI",
  description:
    "Plan innovation challenges, evaluate submissions, and track winning ideas through to execution.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
