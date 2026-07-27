"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RegenerateButton({
  onClick,
  isPending,
  label = "Regenerate",
  className,
}: {
  onClick: () => void;
  isPending: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-mono text-ink-500 hover:text-ink-900 transition-colors disabled:opacity-50 disabled:cursor-wait",
        className
      )}
    >
      <RefreshCw className={cn("w-3 h-3", isPending && "animate-spin")} />
      {isPending ? "Regenerating..." : label}
    </button>
  );
}

export function TabUnavailable({
  message,
  onRegenerate,
  isPending,
}: {
  message: string;
  onRegenerate: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-ink-400 text-sm">{message}</p>
      <RegenerateButton
        onClick={onRegenerate}
        isPending={isPending}
        label="Generate now"
        className="border border-ink-200 rounded-md px-3 py-1.5 hover:border-ink-300 hover:bg-ink-50"
      />
    </div>
  );
}
