"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
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
  const router = useRouter();
  const { data: repos } = useRepos();
  const deleteRepo = useDeleteRepo();
  const openIngest = useAppStore((s) => s.openIngest);

  return (
    <aside className="w-60 h-screen flex flex-col bg-white border-r border-ink-200/70 shrink-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <Link href="/" className="group">
          <span className="text-lg font-display tracking-tight">
            <span className="text-ink-900">Stack</span>
            <span className="italic text-accent-600">Sage</span>
          </span>
        </Link>
      </div>

      {/* New Repo */}
      <div className="px-3 mb-2">
        <button
          onClick={openIngest}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-ink-500 hover:text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-ink-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Analyze Repo
        </button>
      </div>

      {/* Repos */}
      <div className="flex-1 overflow-y-auto px-2 pt-2">
        <p className="px-3 pt-2 pb-2 text-[10px] font-mono uppercase tracking-[0.15em] text-ink-400">
          Repositories
        </p>

        {!repos || repos.length === 0 ? (
          <p className="px-3 py-8 text-[11px] text-ink-400 text-center leading-relaxed">
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
                      "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors",
                      isActive
                        ? "bg-ink-100 text-ink-900"
                        : "text-ink-500 hover:bg-ink-50 hover:text-ink-700"
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
                      if (!confirm("Delete this repository?")) return;
                      deleteRepo.mutate(repo.repo_id, {
                        onSuccess: () => {
                          toast.success("Repository deleted");
                          router.push("/");
                        },
                        onError: () => toast.error("Failed to delete repository"),
                      });
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-ink-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-ink-200/70">
        <p className="text-[10px] font-mono text-ink-400">
          v1.0.0
        </p>
      </div>
    </aside>
  );
}
