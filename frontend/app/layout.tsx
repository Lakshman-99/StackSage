import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/lib/query-provider";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "StackSage - Codebase Intelligence",
  description:
    "Understand any codebase in 30 minutes with AI-powered multi-agent analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <QueryProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "!bg-zinc-900 !text-zinc-200 !border !border-zinc-800/60 !rounded-xl !text-sm !shadow-2xl",
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}