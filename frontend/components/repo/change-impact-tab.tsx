"use client";

import { useState } from "react";
import { useChangeImpact } from "@/hooks/use-api";
import { Send, Loader2, AlertTriangle, FileCode2 } from "lucide-react";
import { cn, getRiskColor } from "@/lib/utils";
import type { ChangeImpactResponse } from "@/types";

function ImpactResults({ data }: { data: ChangeImpactResponse }) {
  const risk = getRiskColor(data.risk_level);

  return (
    <div className="animate-fade-in-up">
      {/* Risk Banner */}
      <div className={cn("border-l-2 pl-4 py-1 mb-8", risk.border)}>
        <p className={cn("text-sm font-medium capitalize", risk.text)}>{data.risk_level} Risk</p>
        <p className="text-[12px] text-ink-500 mt-0.5">{data.summary}</p>
      </div>

      {/* Impacted Files */}
      {data.impacted_files.length > 0 && (
        <div className="section !mt-0 !pt-0 !border-t-0">
          <h4 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-3">
            Impacted Files ({data.impacted_files.length})
          </h4>
          <div className="divide-y divide-ink-200">
            {data.impacted_files.map((file, i) => {
              const fileRisk = getRiskColor(file.impact_level);
              return (
                <div key={i} className="py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileCode2 className="w-3.5 h-3.5 text-ink-400" />
                    <span className="text-sm font-mono text-ink-800">{file.path}</span>
                    <span className={cn("text-[10px] font-mono capitalize", fileRisk.text)}>{file.impact_level}</span>
                  </div>
                  <p className="text-[12px] text-ink-500 ml-6 mt-1">{file.reason}</p>
                  {file.suggestion && (
                    <p className="text-[12px] text-ink-500 ml-6 mt-1">→ {file.suggestion}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tests */}
      {data.test_files_affected.length > 0 && (
        <div className="section">
          <h4 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-3">Tests to Update</h4>
          <div className="space-y-1">
            {data.test_files_affected.map((f) => <p key={f} className="text-[12px] font-mono text-amber-600">{f}</p>)}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="section">
          <h4 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-3">Recommendations</h4>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <p key={i} className="text-[12px] text-ink-500 leading-relaxed">→ {rec}</p>
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
    <div>
      <div className="max-w-xl space-y-5">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-ink-800">Change Impact Analysis</h3>
        </div>
        <p className="text-[12px] text-ink-400 leading-relaxed">
          Enter the file you plan to modify. The agent will trace every downstream dependency and test.
        </p>

        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-500 mb-1.5">File Path</label>
          <input type="text" value={filePath} onChange={(e) => setFilePath(e.target.value)}
            placeholder="src/auth/middleware.py" className="input-field font-mono" />
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-500 mb-1.5">
            Change Description <span className="text-ink-400">(optional)</span>
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the planned change..." rows={3}
            className="input-field resize-none" />
        </div>

        <button onClick={handleSubmit} disabled={mutation.isPending || !filePath.trim()}
          className="btn-primary">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Analyze Impact
        </button>
      </div>

      {mutation.data && <div className="section"><ImpactResults data={mutation.data} /></div>}

      {mutation.isError && (
        <div className="section">
          <p className="text-sm text-red-600 border-l-2 border-red-400 pl-4 py-1">Analysis failed. Verify the file path exists in the repository.</p>
        </div>
      )}
    </div>
  );
}
