"use client";

import { useParams } from "next/navigation";
import {
  Rocket,
  Brain,
  Compass,
  MessageCircle,
  BookOpen,
  AlertTriangle,
  FolderTree,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useRepoStatus } from "@/hooks/use-api";
import { useAppStore, type RepoTab } from "@/stores/app-store";
import { ProgressBar } from "@/components/ui/progress-bar";
import { IngestModal } from "@/components/ui/ingest-modal";
import { OnboardingTab } from "@/components/repo/onboarding-tab";
import { ArchitectureTab } from "@/components/repo/architecture-tab";
import { EntryPointsTab } from "@/components/repo/entry-points-tab";
import { FileExplorerTab } from "@/components/repo/file-explorer-tab";
import { AskTab } from "@/components/repo/ask-tab";
import { GlossaryTab } from "@/components/repo/glossary-tab";
import { ChangeImpactTab } from "@/components/repo/change-impact-tab";
import { cn } from "@/lib/utils";

const TABS: { id: RepoTab; label: string; icon: typeof Brain }[] = [
  { id: "onboarding", label: "Get Started", icon: Rocket },
  { id: "architecture", label: "Architecture", icon: Brain },
  { id: "entry-points", label: "Entry Points", icon: Compass },
  { id: "files", label: "Files", icon: FolderTree },
  { id: "ask", label: "Ask", icon: MessageCircle },
  { id: "glossary", label: "Glossary", icon: BookOpen },
  { id: "change-impact", label: "Impact", icon: AlertTriangle },
];

function TabContent({ tab, repoId }: { tab: RepoTab; repoId: string }) {
  switch (tab) {
    case "onboarding": return <OnboardingTab repoId={repoId} />;
    case "architecture": return <ArchitectureTab repoId={repoId} />;
    case "entry-points": return <EntryPointsTab repoId={repoId} />;
    case "files": return <FileExplorerTab repoId={repoId} />;
    case "ask": return <AskTab repoId={repoId} />;
    case "glossary": return <GlossaryTab repoId={repoId} />;
    case "change-impact": return <ChangeImpactTab repoId={repoId} />;
  }
}

export default function RepoPage() {
  const params = useParams();
  const repoId = params.repoId as string;
  const { data: status, isLoading } = useRepoStatus(repoId);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-5 h-5 animate-spin text-accent-400" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <p className="text-sm text-zinc-500">Repository not found.</p>
        <p className="text-xs font-mono text-zinc-700">{repoId}</p>
      </div>
    );
  }

  const isComplete = status.status === "complete";
  const isFailed = status.status === "failed";
  const isProcessing = !isComplete && !isFailed;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-zinc-800/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 py-3 sm:py-4">
            {isComplete && <CheckCircle2 className="w-4 h-4 text-accent-400 shrink-0" />}
            {isFailed && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {isProcessing && <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />}
            <h1 className="text-sm font-mono font-medium text-zinc-200 truncate">{repoId}</h1>
          </div>

          {isProcessing && <div className="pb-3"><ProgressBar progress={status.progress} status={status.status} currentStep={status.current_step} /></div>}
          {isFailed && <div className="pb-3"><div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-400 font-mono">{status.error}</div></div>}

          {/* Tabs - scrollable on mobile */}
          {isComplete && (
            <div className="flex items-center gap-0.5 -mb-px overflow-x-auto scrollbar-hide">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-medium transition-all border-b-2 rounded-t-lg whitespace-nowrap shrink-0",
                    activeTab === id
                      ? "border-accent-500 text-accent-400"
                      : "border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/20"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {isComplete && <TabContent tab={activeTab} repoId={repoId} />}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent-600/10 border border-accent-600/15 flex items-center justify-center mb-6">
              <Loader2 className="w-6 h-6 animate-spin text-accent-400" />
            </div>
            <p className="text-sm text-zinc-300 mb-1">Agents are analyzing the repository</p>
            <p className="text-xs text-zinc-600 mb-8">This typically takes 2–5 minutes with Groq free tier</p>

            {status.steps_completed.length > 0 && (
              <div className="inline-flex flex-col items-start gap-2">
                {status.steps_completed.map((step, i) => (
                  <span key={i} className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                    <CheckCircle2 className="w-3 h-3 text-accent-500" />
                    {step}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <IngestModal />
    </div>
  );
}