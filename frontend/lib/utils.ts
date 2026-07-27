import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function extractRepoName(url: string): string {
  return url.replace(/\.git$/, "").split("/").slice(-2).join("/");
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "complete": return "text-accent-600";
    case "failed": return "text-red-600";
    case "pending": return "text-ink-400";
    default: return "text-amber-600";
  }
}

/** Text + left-border colors for the flattened "notice" pattern (risk banners,
 * impact badges) - deliberately no filled background, just a hairline + text tint. */
export function getRiskColor(level: string): { text: string; border: string } {
  switch (level) {
    case "high": return { text: "text-red-600", border: "border-red-400" };
    case "medium": return { text: "text-amber-600", border: "border-amber-400" };
    case "low": return { text: "text-accent-700", border: "border-accent-400" };
    default: return { text: "text-ink-500", border: "border-ink-300" };
  }
}
