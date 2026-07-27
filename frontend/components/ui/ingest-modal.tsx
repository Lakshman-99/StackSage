"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, GitBranch, Loader2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useIngestRepo } from "@/hooks/use-api";
import toast from "react-hot-toast";

export function IngestModal() {
  const router = useRouter();
  const isOpen = useAppStore((s) => s.isIngestOpen);
  const close = useAppStore((s) => s.closeIngest);
  const ingest = useIngestRepo();
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!url.trim()) return toast.error("Enter a repository URL");
    try {
      const result = await ingest.mutateAsync({
        repo_url: url.trim(),
        branch: branch.trim() || "main",
      });
      toast.success(`Analysis started`);
      close();
      setUrl("");
      setBranch("main");
      router.push(`/repo/${result.repo_id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start analysis");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={close} />

      <div className="relative w-full max-w-md mx-4 bg-white border border-ink-200 rounded-lg shadow-xl shadow-ink-900/10 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Analyze Repository</h2>
            <p className="text-[11px] text-ink-400">Paste a Git URL to begin</p>
          </div>
          <button onClick={close} className="p-1.5 rounded hover:bg-ink-100 transition-colors">
            <X className="w-4 h-4 text-ink-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-ink-500 mb-1.5 uppercase tracking-wider">
              Repository URL
            </label>
            <div className="flex items-center gap-2 bg-white border border-ink-200 rounded-md px-3 py-2.5 focus-within:border-ink-900 transition-colors">
              <GitBranch className="w-4 h-4 text-ink-400 shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="flex-1 bg-transparent text-sm text-ink-800 placeholder:text-ink-400 outline-none font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-500 mb-1.5 uppercase tracking-wider">
              Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="input-field font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-5 px-6 py-5">
          <button onClick={close} className="btn-ghost">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={ingest.isPending} className="btn-primary">
            {ingest.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Start Analysis
          </button>
        </div>
      </div>
    </div>
  );
}