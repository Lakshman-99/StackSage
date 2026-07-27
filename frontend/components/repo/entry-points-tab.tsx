"use client";

import toast from "react-hot-toast";
import { useEntryPoints, useRegenerateEntryPoints } from "@/hooks/use-api";
import { Loader2, TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { RegenerateButton, TabUnavailable } from "@/components/ui/regenerate-button";

export function EntryPointsTab({ repoId }: { repoId: string }) {
  const { data, isLoading, error } = useEntryPoints(repoId);
  const regenerate = useRegenerateEntryPoints(repoId);

  const handleRegenerate = () => {
    regenerate.mutate(undefined, {
      onSuccess: () => toast.success("Entry points regenerated"),
      onError: (e: any) => toast.error(e?.message || "Failed to regenerate entry points"),
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-ink-400" /></div>;
  if (error || !data) {
    return <TabUnavailable message="Entry point data not available." onRegenerate={handleRegenerate} isPending={regenerate.isPending} />;
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-end mb-3">
        <RegenerateButton onClick={handleRegenerate} isPending={regenerate.isPending} />
      </div>

      {/* Graph Stats */}
      {data.graph_stats && (
        <div className="flex flex-wrap divide-x divide-ink-200 border-y border-ink-200 mb-2">
          {[
            { label: "Nodes", value: data.graph_stats.total_nodes },
            { label: "Edges", value: data.graph_stats.total_edges },
            { label: "Components", value: data.graph_stats.connected_components },
            { label: "Density", value: data.graph_stats.density?.toFixed(4) },
          ].map(({ label, value }) => (
            <div key={label} className="flex-1 min-w-[7rem] px-5 py-3.5 first:pl-0">
              <p className="font-display text-xl text-ink-900">{value ?? "N/A"}</p>
              <p className="text-[11px] text-ink-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Entry Points */}
      <div className="section">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-ink-400" />
          <h3 className="text-sm font-semibold text-ink-800">Critical Entry Points</h3>
          <span className="text-[11px] text-ink-400 font-mono ml-1">PageRank</span>
        </div>

        <div className="divide-y divide-ink-200">
          {data.entry_points.map((ep, i) => (
            <div key={ep.path} className="py-4">
              <div className="flex items-start gap-4">
                <span className="text-[11px] font-mono text-ink-300 w-6 text-right shrink-0 pt-0.5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-ink-800 truncate">{ep.path}</p>
                  <p className="text-[12px] text-ink-500 mt-1 leading-relaxed">{ep.reason}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-[10px] font-mono text-ink-400">
                      <ArrowDownLeft className="w-3 h-3" />{ep.in_degree} in
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-ink-400">
                      <ArrowUpRight className="w-3 h-3" />{ep.out_degree} out
                    </span>
                    <span className="text-[10px] font-mono text-ink-500">{ep.score.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
