"use client";

import { useState } from "react";
import { useChangeImpact } from "@/hooks/use-api";
import { Send, Loader2, AlertTriangle, FileCode2, Shield, ArrowRight } from "lucide-react";
import { cn, getRiskColor } from "@/lib/utils";
import type { ChangeImpactResponse } from "@/types";

function ImpactResults({ data }: { data: ChangeImpactResponse }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Risk Banner */}
      <div className={cn("flex items-center gap-3 p-4 rounded-2xl border", getRiskColor(data.risk_level))}>
        <Shield className="w-5 h-5 shrink-0" />
        <div>
          <p className="text-sm font-medium capitalize">{data.risk_level} Risk</p>
          <p className="text-[12px] opacity-80 mt-0.5">{data.summary}</p>
        </div>
      </div>

      {/* Impacted Files */}
      {data.impacted_files.length > 0 && (
        <div className="card divide-y divide-zinc-800/40">
          <div className="px-5 py-3.5">
            <h4 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500">
              Impacted Files ({data.impacted_files.length})
            </h4>
          </div>
          {data.impacted_files.map((file, i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <FileCode2 className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-sm font-mono text-zinc-200">{file.path}</span>
                <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded-md border capitalize", getRiskColor(file.impact_level))}>
                  {file.impact_level}
                </span>
              </div>
              <p className="text-[12px] text-zinc-500 ml-6 mt-1">{file.reason}</p>
              {file.suggestion && (
                <p className="text-[12px] text-accent-500/60 ml-6 mt-1 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />{file.suggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tests */}
      {data.test_files_affected.length > 0 && (
        <div className="card p-5">
          <h4 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 mb-3">Tests to Update</h4>
          <div className="space-y-1">
            {data.test_files_affected.map((f) => <p key={f} className="text-[12px] font-mono text-amber-400/70">{f}</p>)}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="card p-5">
          <h4 className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 mb-3">Recommendations</h4>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-accent-400 text-xs mt-0.5">→</span>
                <p className="text-[12px] text-zinc-400 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChangeImpactTab({ repoId }: { repoId: string }) {
  const [filePath, setFilePath] = useState("");
  const [description, setDescription] = useState("");
  const mutation = useChangeImpact(repoId);

  const handleSubmit = () => {
    if (!filePath.trim()) return;
    mutation.mutate({ repo_id: repoId, file_path: filePath.trim(), description: description.trim() });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Change Impact Analysis</h3>
        </div>
        <p className="text-[12px] text-zinc-600 leading-relaxed">
          Enter the file you plan to modify. The agent will trace every downstream dependency and test.
        </p>

        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">File Path</label>
          <input type="text" value={filePath} onChange={(e) => setFilePath(e.target.value)}
            placeholder="src/auth/middleware.py" className="input-field font-mono" />
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
            Change Description <span className="text-zinc-700">(optional)</span>
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the planned change..." rows={3}
            className="input-field resize-none" />
        </div>

        <button onClick={handleSubmit} disabled={mutation.isPending || !filePath.trim()}
          className="btn-primary !bg-amber-600 !shadow-amber-600/15 hover:!bg-amber-500">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Analyze Impact
        </button>
      </div>

      {mutation.data && <ImpactResults data={mutation.data} />}

      {mutation.isError && (
        <div className="card p-4 !border-red-500/20">
          <p className="text-sm text-red-400">Analysis failed. Verify the file path exists in the repository.</p>
        </div>
      )}
    </div>
  );
}