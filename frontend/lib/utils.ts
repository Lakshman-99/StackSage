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
    case "complete": return "text-sage-400";
    case "failed": return "text-red-400";
    case "pending": return "text-zinc-400";
    default: return "text-amber-400";
  }
}

export function getRiskColor(level: string): string {
  switch (level) {
    case "high": return "text-red-400 bg-red-400/10 border-red-400/20";
    case "medium": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "low": return "text-sage-400 bg-sage-400/10 border-sage-400/20";
    default: return "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
  }
}
