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
    <html lang="en">
      <body className="min-h-screen">
        <QueryProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "!bg-white !text-ink-900 !border !border-ink-200 !rounded-md !text-sm !shadow-xl !shadow-ink-900/10",
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}