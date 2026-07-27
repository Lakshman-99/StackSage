"use client";

import { useEffect, useState, useId } from "react";
import { Code2, ImageIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const renderId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"diagram" | "source">("diagram");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!code?.trim()) {
        setError("No diagram was generated for this repository.");
        return;
      }
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "13px",
            primaryColor: "#ecfdf5",
            primaryTextColor: "#18181b",
            primaryBorderColor: "#10b981",
            lineColor: "#a1a1aa",
            secondaryColor: "#f4f4f5",
            tertiaryColor: "#ffffff",
            background: "#ffffff",
            mainBkg: "#ecfdf5",
            nodeBorder: "#10b981",
            clusterBkg: "#fafafa",
            clusterBorder: "#e4e4e7",
            edgeLabelBackground: "#ffffff",
          },
          securityLevel: "strict",
        });
        const { svg } = await mermaid.render(`mermaid-${renderId}`, code.trim());
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Could not render this diagram.");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [code, renderId]);

  return (
    <div>
      <div className="flex items-center justify-end gap-1 mb-3">
        <button
          onClick={() => setView("diagram")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors",
            view === "diagram" ? "bg-accent-50 text-accent-700" : "text-zinc-400 hover:text-zinc-600"
          )}
        >
          <ImageIcon className="w-3 h-3" /> Diagram
        </button>
        <button
          onClick={() => setView("source")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors",
            view === "source" ? "bg-accent-50 text-accent-700" : "text-zinc-400 hover:text-zinc-600"
          )}
        >
          <Code2 className="w-3 h-3" /> Source
        </button>
      </div>

      {view === "source" || error ? (
        <pre className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-[12px] font-mono text-zinc-300 overflow-x-auto">
          {code || "// No diagram source available"}
        </pre>
      ) : svg ? (
        <div
          className="rounded-xl border border-zinc-200 bg-white p-4 overflow-auto [&_svg]:mx-auto [&_svg]:max-w-none"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex items-center justify-center py-10 rounded-xl border border-zinc-200 bg-white text-[12px] text-zinc-400 font-mono">
          Rendering diagram...
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600">
          <AlertTriangle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
