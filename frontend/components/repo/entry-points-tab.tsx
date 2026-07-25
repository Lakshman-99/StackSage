"use client";

import { useEntryPoints } from "@/hooks/use-api";
import { Loader2, TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export function EntryPointsTab({ repoId }: { repoId: string }) {
  const { data, isLoading, error } = useEntryPoints(repoId);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-accent-400" /></div>;
  if (error || !data) return <div className="text-center py-20 text-zinc-600 text-sm">Entry point data not available.</div>;

  const maxScore = data.entry_points[0]?.score || 1;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Graph Stats */}
      {data.graph_stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Nodes", value: data.graph_stats.total_nodes },
            { label: "Edges", value: data.graph_stats.total_edges },
            { label: "Components", value: data.graph_stats.connected_components },
            { label: "Density", value: data.graph_stats.density?.toFixed(4) },
          ].map(({ label, value }) => (
            <div key={label} className="card p-4">
              <p className="text-2xl font-display font-bold text-zinc-100">{value ?? "—"}</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Entry Points */}
      <div className="card divide-y divide-zinc-800/40">
        <div className="px-6 py-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Critical Entry Points</h3>
          <span className="text-[11px] text-zinc-600 font-mono ml-1">PageRank</span>
        </div>

        {data.entry_points.map((ep, i) => (
          <div key={ep.path} className="px-6 py-4 hover:bg-zinc-800/20 transition-colors relative">
            <div className="absolute inset-y-0 left-0 bg-accent-600/[0.03]" style={{ width: `${(ep.score / maxScore) * 100}%` }} />
            <div className="relative flex items-start gap-4">
              <span className="text-[11px] font-mono text-zinc-700 w-6 text-right shrink-0 pt-0.5">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-zinc-200 truncate">{ep.path}</p>
                <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{ep.reason}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-600">
                    <ArrowDownLeft className="w-3 h-3" />{ep.in_degree} in
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-600">
                    <ArrowUpRight className="w-3 h-3" />{ep.out_degree} out
                  </span>
                  <span className="text-[10px] font-mono text-accent-500/70">{ep.score.toFixed(6)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}