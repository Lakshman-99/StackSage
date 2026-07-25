"use client";

import { useEffect, useRef, useState } from "react";
import { useArchitecture } from "@/hooks/use-api";
import { Loader2, Network, Code2, Boxes, Sparkles, GitBranch, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { DependencyEdge } from "@/types";
import * as d3 from "d3";

const STACK_ICONS: Record<string, string> = {
  frontend: "🎨", backend: "⚙️", database: "🗄️", infrastructure: "☁️",
  ci_cd: "🔄", messaging: "📨", monitoring: "📊", other: "🔧",
};

const STACK_LABELS: Record<string, string> = {
  frontend: "Frontend", backend: "Backend", database: "Database & Storage",
  infrastructure: "Infrastructure", ci_cd: "CI/CD", messaging: "Messaging",
  monitoring: "Monitoring", other: "Other Tools",
};

function DependencyGraph({ edges }: { edges: DependencyEdge[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || edges.length === 0) return;
    const width = containerRef.current.clientWidth;
    const height = 480;

    // Group by directory for clustering
    const nodeSet = new Set<string>();
    edges.forEach((e) => { nodeSet.add(e.source); nodeSet.add(e.target); });
    const nodes = Array.from(nodeSet).map((id) => {
      const dir = id.split("/").slice(0, -1).join("/") || "root";
      return { id, label: id.split("/").pop() || id, group: dir };
    });
    const links = edges.map((e) => ({ source: e.source, target: e.target }));
    const groups = Array.from(new Set(nodes.map((n) => n.group)));
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(groups);

    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3.select(svgRef.current).attr("width", width).attr("height", height);
    const g = svg.append("g");
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 5]).on("zoom", (e) => g.attr("transform", e.transform)) as any);

    svg.append("defs").append("marker").attr("id", "arrow").attr("viewBox", "0 -5 10 10")
      .attr("refX", 18).attr("refY", 0).attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto").append("path").attr("fill", "#333").attr("d", "M0,-4L8,0L0,4");

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(70))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05));

    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", "#1a1a1e").attr("stroke-width", 0.8).attr("marker-end", "url(#arrow)");

    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .call(d3.drag<SVGGElement, any>()
        .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }) as any);

    node.append("circle").attr("r", 4)
      .attr("fill", (d: any) => colorScale(d.group))
      .attr("fill-opacity", 0.4)
      .attr("stroke", (d: any) => colorScale(d.group))
      .attr("stroke-width", 1.5);

    node.append("text").text((d: any) => d.label).attr("dx", 8).attr("dy", 3)
      .attr("font-size", "9px").attr("font-family", "JetBrains Mono").attr("fill", "#71717a");

    // Legend
    const legend = svg.append("g").attr("transform", `translate(12, 12)`);
    groups.slice(0, 8).forEach((group, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 16})`);
      row.append("circle").attr("r", 4).attr("fill", colorScale(group)).attr("fill-opacity", 0.6);
      row.append("text").text(group || "root").attr("x", 10).attr("y", 4)
        .attr("font-size", "9px").attr("font-family", "JetBrains Mono").attr("fill", "#52525b");
    });

    simulation.on("tick", () => {
      link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [edges]);

  return (
    <div ref={containerRef} className="card overflow-hidden">
      <svg ref={svgRef} className="w-full" style={{ minHeight: 480, background: "#0c0c0e" }} />
    </div>
  );
}

export function ArchitectureTab({ repoId }: { repoId: string }) {
  const { data, isLoading, error } = useArchitecture(repoId);
  const [showGraph, setShowGraph] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set([0]));

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-accent-400" /></div>;
  if (error || !data) return <div className="text-center py-20 text-zinc-600 text-sm">Architecture data not available.</div>;

  const arch = data as any; // Extended architecture data
  const stackCat = arch.tech_stack_categorized || {};

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Stats + Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="card px-4 py-2.5">
          <span className="text-xs text-zinc-600">Type</span>
          <p className="text-sm font-medium text-zinc-200 capitalize">{arch.repo_type || "—"}</p>
        </div>
        <div className="card px-4 py-2.5">
          <span className="text-xs text-zinc-600">Architecture</span>
          <p className="text-sm font-medium text-zinc-200 capitalize">{arch.architecture_style?.replace(/-/g, " ") || "—"}</p>
        </div>
        <div className="card px-4 py-2.5">
          <span className="text-xs text-zinc-600">Files</span>
          <p className="text-sm font-medium text-zinc-200">{formatNumber(arch.file_count)}</p>
        </div>
        <div className="card px-4 py-2.5">
          <span className="text-xs text-zinc-600">Lines</span>
          <p className="text-sm font-medium text-zinc-200">{formatNumber(arch.total_lines)}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="card p-6">
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 mb-3">Architecture Overview</h3>
        <p className="text-[14px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{arch.summary}</p>
      </div>

      {/* Categorized Tech Stack */}
      {Object.keys(stackCat).length > 0 && (
        <div className="card p-6">
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 mb-4">Tech Stack</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(stackCat).map(([category, tools]: [string, any]) => {
              if (!tools || tools.length === 0) return null;
              return (
                <div key={category} className="flex items-start gap-3">
                  <span className="text-lg">{STACK_ICONS[category] || "🔧"}</span>
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                      {STACK_LABELS[category] || category}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tools.map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded-md bg-accent-600/8 border border-accent-600/12 text-accent-400 text-[11px] font-mono">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Flow */}
      {arch.data_flow && (
        <div className="card p-6">
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 mb-3">Data Flow</h3>
          <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{arch.data_flow}</p>
        </div>
      )}

      {/* Mermaid Diagram (rendered as code block for now) */}
      {arch.mermaid_diagram && (
        <div className="card p-6">
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 mb-3">System Diagram</h3>
          <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/40 text-[12px] font-mono text-zinc-400 overflow-x-auto">
            {arch.mermaid_diagram}
          </pre>
          <p className="text-[10px] text-zinc-700 mt-2">Paste into mermaid.live to render this diagram</p>
        </div>
      )}

      {/* Architecture Layers */}
      <div className="card p-6">
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 mb-4">Architecture Layers</h3>
        <div className="space-y-3">
          {(arch.layers || []).map((layer: any, i: number) => {
            const isExpanded = expandedLayers.has(i);
            return (
              <div key={i} className="border border-zinc-800/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    const next = new Set(expandedLayers);
                    isExpanded ? next.delete(i) : next.add(i);
                    setExpandedLayers(next);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 rounded-full bg-accent-600/30" />
                    <span className="text-sm font-medium text-zinc-200">{layer.name}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pl-10">
                    <p className="text-[12px] text-zinc-500 leading-relaxed mb-2">{layer.description}</p>
                    {layer.responsibilities?.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {layer.responsibilities.map((r: string, j: number) => (
                          <p key={j} className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                            <ArrowRight className="w-3 h-3 text-accent-500/50" /> {r}
                          </p>
                        ))}
                      </div>
                    )}
                    {layer.files?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {layer.files.slice(0, 8).map((f: string) => <span key={f} className="mono-tag text-[10px]">{f.split("/").pop()}</span>)}
                        {layer.files.length > 8 && <span className="text-[10px] text-zinc-700">+{layer.files.length - 8}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Design Patterns (detailed) */}
      {(arch.design_patterns_detailed || []).length > 0 && (
        <div className="card p-6">
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 mb-4">Design Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {arch.design_patterns_detailed.map((p: any, i: number) => (
              <div key={i} className="border border-zinc-800/30 rounded-xl p-4">
                <p className="text-sm font-medium text-zinc-200 mb-1">{p.name || p}</p>
                {p.where && <p className="text-[11px] text-zinc-500">Where: {p.where}</p>}
                {p.why && <p className="text-[11px] text-accent-500/60 mt-1">Why: {p.why}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependency Graph */}
      {(arch.dependency_graph || []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-2">
              <Network className="w-3.5 h-3.5" /> Dependency Graph
              <span className="text-zinc-700">({arch.dependency_graph.length} edges)</span>
            </h3>
            <button onClick={() => setShowGraph(!showGraph)} className="text-[11px] text-accent-400 hover:text-accent-300 font-mono">
              {showGraph ? "Hide" : "Show"} — color-coded by directory
            </button>
          </div>
          {showGraph && <DependencyGraph edges={arch.dependency_graph} />}
        </div>
      )}
    </div>
  );
}