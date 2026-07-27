"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useArchitecture, useRegenerateArchitecture } from "@/hooks/use-api";
import { Loader2, Network, ChevronDown, ChevronUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";
import { RegenerateButton, TabUnavailable } from "@/components/ui/regenerate-button";
import type { DependencyEdge } from "@/types";
import * as d3 from "d3";

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
      .attr("orient", "auto").append("path").attr("fill", "#C9C4B8").attr("d", "M0,-4L8,0L0,4");

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(70))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05));

    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", "#E2DFD7").attr("stroke-width", 1).attr("marker-end", "url(#arrow)");

    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .call(d3.drag<SVGGElement, any>()
        .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }) as any);

    node.append("circle").attr("r", 4)
      .attr("fill", (d: any) => colorScale(d.group))
      .attr("fill-opacity", 0.6)
      .attr("stroke", (d: any) => colorScale(d.group))
      .attr("stroke-width", 1.5);

    node.append("text").text((d: any) => d.label).attr("dx", 8).attr("dy", 3)
      .attr("font-size", "9px").attr("font-family", "JetBrains Mono").attr("fill", "#78725F");

    // Legend
    const legend = svg.append("g").attr("transform", `translate(12, 12)`);
    groups.slice(0, 8).forEach((group, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 16})`);
      row.append("circle").attr("r", 4).attr("fill", colorScale(group)).attr("fill-opacity", 0.8);
      row.append("text").text(group || "root").attr("x", 10).attr("y", 4)
        .attr("font-size", "9px").attr("font-family", "JetBrains Mono").attr("fill", "#57513F");
    });

    simulation.on("tick", () => {
      link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [edges]);

  return (
    <div ref={containerRef} className="panel">
      <svg ref={svgRef} className="w-full" style={{ minHeight: 480, background: "#FAF9F6" }} />
    </div>
  );
}

export function ArchitectureTab({ repoId }: { repoId: string }) {
  const { data, isLoading, error } = useArchitecture(repoId);
  const regenerate = useRegenerateArchitecture(repoId);
  const [showGraph, setShowGraph] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set([0]));

  const handleRegenerate = () => {
    regenerate.mutate(undefined, {
      onSuccess: () => toast.success("Architecture analysis regenerated"),
      onError: (e: any) => toast.error(e?.message || "Failed to regenerate architecture"),
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-ink-400" /></div>;
  if (error || !data) {
    return <TabUnavailable message="Architecture data not available." onRegenerate={handleRegenerate} isPending={regenerate.isPending} />;
  }

  const arch = data as any; // Extended architecture data
  const stackCat = arch.tech_stack_categorized || {};

  const stats = [
    { label: "Type", value: arch.repo_type || "Unknown" },
    { label: "Architecture", value: arch.architecture_style?.replace(/-/g, " ") || "Unknown" },
    { label: "Files", value: formatNumber(arch.file_count) },
    { label: "Lines", value: formatNumber(arch.total_lines) },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-end mb-3">
        <RegenerateButton onClick={handleRegenerate} isPending={regenerate.isPending} />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap divide-x divide-ink-200 border-y border-ink-200">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex-1 min-w-[7rem] px-5 py-3.5 first:pl-0">
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-400 mb-1">{label}</p>
            <p className="font-display text-xl text-ink-900 capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="section">
        <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-3">Architecture Overview</h3>
        <p className="text-[14px] text-ink-600 leading-relaxed whitespace-pre-wrap">{arch.summary}</p>
      </div>

      {/* Categorized Tech Stack */}
      {Object.keys(stackCat).length > 0 && (
        <div className="section">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-4">Tech Stack</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {Object.entries(stackCat).map(([category, tools]: [string, any]) => {
              if (!tools || tools.length === 0) return null;
              return (
                <div key={category}>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-ink-400 mb-1.5">
                    {STACK_LABELS[category] || category}
                  </p>
                  <p className="text-[13px] text-ink-700">{tools.join(" · ")}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Flow */}
      {arch.data_flow && (
        <div className="section">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-3">Data Flow</h3>
          <p className="text-[13px] text-ink-600 leading-relaxed whitespace-pre-wrap">{arch.data_flow}</p>
        </div>
      )}

      {/* Mermaid Diagram - rendered live */}
      {arch.mermaid_diagram && (
        <div className="section">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-3">System Diagram</h3>
          <div className="panel p-6">
            <MermaidDiagram code={arch.mermaid_diagram} />
          </div>
        </div>
      )}

      {/* Architecture Layers */}
      <div className="section">
        <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-2">Architecture Layers</h3>
        <div className="divide-y divide-ink-200">
          {(arch.layers || []).map((layer: any, i: number) => {
            const isExpanded = expandedLayers.has(i);
            return (
              <div key={i}>
                <button
                  onClick={() => {
                    const next = new Set(expandedLayers);
                    isExpanded ? next.delete(i) : next.add(i);
                    setExpandedLayers(next);
                  }}
                  className="w-full flex items-center justify-between py-4 text-left"
                >
                  <span className="text-sm font-medium text-ink-800">{layer.name}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-400" /> : <ChevronDown className="w-4 h-4 text-ink-400" />}
                </button>
                {isExpanded && (
                  <div className="pb-5">
                    <p className="text-[12px] text-ink-500 leading-relaxed mb-2">{layer.description}</p>
                    {layer.responsibilities?.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {layer.responsibilities.map((r: string, j: number) => (
                          <p key={j} className="text-[11px] text-ink-500 flex items-center gap-1.5">
                            <span className="text-ink-300">·</span> {r}
                          </p>
                        ))}
                      </div>
                    )}
                    {layer.files?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {layer.files.slice(0, 8).map((f: string) => <span key={f} className="mono-tag text-[10px]">{f.split("/").pop()}</span>)}
                        {layer.files.length > 8 && <span className="text-[10px] text-ink-400">+{layer.files.length - 8}</span>}
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
        <div className="section">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-2">Design Patterns</h3>
          <div className="divide-y divide-ink-200">
            {arch.design_patterns_detailed.map((p: any, i: number) => (
              <div key={i} className="py-4 first:pt-0">
                <p className="text-sm font-medium text-ink-800 mb-1">{p.name || p}</p>
                {p.where && <p className="text-[11px] text-ink-400">Where: {p.where}</p>}
                {p.why && <p className="text-[11px] text-ink-500 mt-1">Why: {p.why}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependency Graph */}
      {(arch.dependency_graph || []).length > 0 && (
        <div className="section">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 flex items-center gap-2">
              <Network className="w-3.5 h-3.5" /> Dependency Graph
              <span className="text-ink-300">({arch.dependency_graph.length} edges)</span>
            </h3>
            <button onClick={() => setShowGraph(!showGraph)} className="text-[11px] text-ink-500 hover:text-ink-900 font-mono underline-offset-4 hover:underline">
              {showGraph ? "Hide" : "Show"} (color-coded by directory)
            </button>
          </div>
          {showGraph && <DependencyGraph edges={arch.dependency_graph} />}
        </div>
      )}
    </div>
  );
}
