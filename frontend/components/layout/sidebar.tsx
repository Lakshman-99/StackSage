"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  GitBranch,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Layers,
} from "lucide-react";
import { cn, extractRepoName } from "@/lib/utils";
import { useRepos, useDeleteRepo } from "@/hooks/use-api";
import { useAppStore } from "@/stores/app-store";
import type { AnalysisStatus } from "@/types";

function StatusDot({ status }: { status: AnalysisStatus }) {
  if (status === "complete")
    return <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />;
  if (status === "failed")
    return <div className="w-1.5 h-1.5 rounded-full bg-red-500" />;
  return <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: repos } = useRepos();
  const deleteRepo = useDeleteRepo();
  const openIngest = useAppStore((s) => s.openIngest);

  return (
    <aside className="w-60 h-screen flex flex-col bg-[#0e0e10] border-r border-zinc-800/40 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-accent-600/15 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-accent-400" />
          </div>
          <span className="text-sm font-display font-bold text-zinc-100 tracking-tight">
            StackSage
          </span>
        </Link>
      </div>

      {/* New Repo */}
      <div className="px-3 mb-2">
        <button
          onClick={openIngest}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/30 border border-zinc-800/40 hover:border-zinc-700/50 hover:bg-zinc-800/50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Analyze Repo
        </button>
      </div>

      {/* Repos */}
      <div className="flex-1 overflow-y-auto px-2 pt-2">
        <p className="px-3 pt-2 pb-2 text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-700">
          Repositories
        </p>

        {!repos || repos.length === 0 ? (
          <p className="px-3 py-8 text-[11px] text-zinc-700 text-center leading-relaxed">
            No repositories analyzed yet.
          </p>
        ) : (
          <div className="space-y-0.5">
            {repos.map((repo) => {
              const isActive = pathname === `/repo/${repo.repo_id}`;
              return (
                <div key={repo.repo_id} className="group relative">
                  <Link
                    href={`/repo/${repo.repo_id}`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all",
                      isActive
                        ? "bg-zinc-800/50 text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-800/30 hover:text-zinc-300"
                    )}
                  >
                    <StatusDot status={repo.status} />
                    <span className="truncate flex-1 font-mono text-[11px]">
                      {extractRepoName(repo.repo_url)}
                    </span>
                  </Link>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm("Delete this repository?")) {
                        deleteRepo.mutate(repo.repo_id);
                      }
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-zinc-600 hover:text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-zinc-800/30">
        <p className="text-[10px] font-mono text-zinc-800">
          v1.0.0
        </p>
      </div>
    </aside>
  );
}