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

  // Render one stable header+content shell for every state (first load, processing,
  // complete, failed, not-found) instead of swapping between different top-level
  // layouts - that swap was the source of the jump/flicker right after clicking
  // "Analyze a Repository", since the very first frame (isLoading) used to render a
  // completely different full-screen layout than the one that replaced it a moment later.
  const notFound = !isLoading && !status;
  const isComplete = status?.status === "complete";
  const isFailed = status?.status === "failed";
  const isProcessing = !!status && !isComplete && !isFailed;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ink-50/90 backdrop-blur-xl border-b border-ink-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 py-3 sm:py-4">
            {isLoading && <Loader2 className="w-4 h-4 text-ink-400 animate-spin shrink-0" />}
            {isComplete && <CheckCircle2 className="w-4 h-4 text-accent-500 shrink-0" />}
            {isFailed && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
            {isProcessing && <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />}
            <h1 className="text-sm font-mono font-medium text-ink-800 truncate">{repoId}</h1>
          </div>

          {isProcessing && status && (
            <div className="pb-3"><ProgressBar progress={status.progress} status={status.status} currentStep={status.current_step} /></div>
          )}
          {isFailed && status && (
            <div className="pb-3">
              <div className="border-l-2 border-red-400 pl-4 py-1 text-xs text-red-600 font-mono">{status.error}</div>
            </div>
          )}

          {/* Tabs - scrollable on mobile */}
          {isComplete && (
            <div className="flex items-center gap-0.5 -mb-px overflow-x-auto scrollbar-hide">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-medium transition-colors border-b-2 whitespace-nowrap shrink-0",
                    activeTab === id
                      ? "border-ink-950 text-ink-950"
                      : "border-transparent text-ink-400 hover:text-ink-700"
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
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-5 h-5 animate-spin text-ink-400" />
          </div>
        )}

        {notFound && (
          <div className="flex flex-col items-center justify-center py-32 gap-2">
            <p className="text-sm text-ink-500">Repository not found.</p>
            <p className="text-xs font-mono text-ink-300">{repoId}</p>
          </div>
        )}

        {isComplete && <TabContent tab={activeTab} repoId={repoId} />}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-ink-400 mb-6" />
            <p className="text-sm text-ink-700 mb-1">Agents are analyzing the repository</p>
            <p className="text-xs text-ink-400 mb-8">This typically takes 2 to 5 minutes on the free tier</p>

            {status && status.steps_completed.length > 0 && (
              <div className="inline-flex flex-col items-start gap-2">
                {status.steps_completed.map((step, i) => (
                  <span key={i} className="flex items-center gap-2 text-[11px] font-mono text-ink-500">
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
