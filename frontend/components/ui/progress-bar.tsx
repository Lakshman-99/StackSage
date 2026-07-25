"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  status: string;
  currentStep: string;
}

export function ProgressBar({ progress, status, currentStep }: ProgressBarProps) {
  const isFailed = status === "failed";
  const isComplete = status === "complete";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-zinc-500">{currentStep || status}</span>
        <span className={cn(
          "text-[11px] font-mono font-medium",
          isFailed ? "text-red-400" : isComplete ? "text-accent-400" : "text-amber-400"
        )}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-1 bg-zinc-800/60 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            isFailed ? "bg-red-500" : isComplete ? "bg-accent-500" : "bg-amber-500 shimmer-bar"
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}