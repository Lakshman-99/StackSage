"use client";

import toast from "react-hot-toast";
import { useOnboarding, useRegenerateOnboarding } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";
import { RegenerateButton, TabUnavailable } from "@/components/ui/regenerate-button";

export function OnboardingTab({ repoId }: { repoId: string }) {
  const { data, isLoading, error } = useOnboarding(repoId);
  const regenerate = useRegenerateOnboarding(repoId);

  const handleRegenerate = () => {
    regenerate.mutate(undefined, {
      onSuccess: () => toast.success("Onboarding guide regenerated"),
      onError: (e: any) => toast.error(e?.message || "Failed to regenerate onboarding guide"),
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-ink-400" /></div>;
  if (error || !data) {
    return <TabUnavailable message="Onboarding guide not available." onRegenerate={handleRegenerate} isPending={regenerate.isPending} />;
  }

  return (
    <div className="max-w-3xl animate-fade-in-up">
      <div className="flex items-center justify-end mb-3">
        <RegenerateButton onClick={handleRegenerate} isPending={regenerate.isPending} />
      </div>

      {/* Welcome */}
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-3">Get Started</p>
        <h2 className="font-display text-[1.75rem] text-ink-950 mb-3">Welcome to this codebase</h2>
        <p className="text-sm text-ink-500 leading-relaxed max-w-2xl">{data.welcome_message}</p>
      </div>

      {/* Prerequisites */}
      {data.prerequisites?.length > 0 && (
        <Section title="Prerequisites">
          <div className="space-y-3">
            {data.prerequisites.map((p: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-ink-800">{p.skill}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{p.why}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Setup Steps */}
      {data.setup_steps?.length > 0 && (
        <Section title="Setup & Installation">
          <div className="space-y-5">
            {data.setup_steps.map((s: any, i: number) => (
              <div key={i} className="flex items-start gap-4">
                <span className="font-display italic text-2xl leading-none text-ink-200 w-8 shrink-0 pt-0.5">{s.step}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800">{s.title}</p>
                  {s.command && (
                    <pre className="mt-2 px-3 py-2 rounded-md bg-ink-900 border border-ink-800 text-[12px] font-mono text-accent-400 overflow-x-auto">
                      {s.command}
                    </pre>
                  )}
                  <p className="text-xs text-ink-400 mt-1.5">{s.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Architecture Overview */}
      {data.architecture_overview && (
        <Section title="Architecture Overview">
          <p className="text-sm text-ink-500 leading-relaxed whitespace-pre-wrap">{data.architecture_overview}</p>
        </Section>
      )}

      {/* Key Concepts */}
      {data.key_concepts?.length > 0 && (
        <Section title="Key Concepts to Learn">
          <div className="space-y-4">
            {data.key_concepts.map((c: any, i: number) => (
              <div key={i} className="border-l-2 border-ink-200 pl-4">
                <p className="text-sm font-medium text-ink-800">{c.concept}</p>
                <p className="text-xs text-ink-400 mt-1 leading-relaxed">{c.explanation}</p>
                {c.where_to_look && <p className="text-[11px] font-mono text-ink-400 mt-1">{c.where_to_look}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* First Week Plan */}
      {data.first_week_plan?.length > 0 && (
        <Section title="Your First Week">
          <div className="divide-y divide-ink-200">
            {data.first_week_plan.map((d: any, i: number) => (
              <div key={i} className="py-5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono font-medium text-ink-500">{d.day}</span>
                  <span className="text-sm font-medium text-ink-800">{d.goal}</span>
                </div>
                <div className="space-y-1 ml-1">
                  {d.tasks?.map((t: string, j: number) => (
                    <p key={j} className="text-xs text-ink-500 flex items-center gap-2">
                      <span className="text-ink-300">·</span> {t}
                    </p>
                  ))}
                </div>
                {d.files_to_read?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {d.files_to_read.map((f: string) => (
                      <span key={f} className="mono-tag text-[10px]">{f.split("/").pop()}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Common Tasks */}
      {data.common_tasks?.length > 0 && (
        <Section title="Common Development Tasks">
          <div className="divide-y divide-ink-200">
            {data.common_tasks.map((t: any, i: number) => (
              <div key={i} className="py-5 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-ink-800 mb-2">{t.task}</p>
                <ol className="space-y-1">
                  {t.steps?.map((s: string, j: number) => (
                    <li key={j} className="text-xs text-ink-500">{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Gotchas */}
      {data.gotchas?.length > 0 && (
        <Section title="Watch Out For">
          <div className="space-y-3">
            {data.gotchas.map((g: any, i: number) => (
              <div key={i} className="border-l-2 border-amber-400 pl-4 py-1">
                <p className="text-sm font-medium text-ink-800">{g.title}</p>
                <p className="text-xs text-ink-500 mt-0.5">{g.description}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Who to Ask */}
      {data.who_to_ask && (
        <Section title="Where to Get Help">
          <p className="text-sm text-ink-500 leading-relaxed">{data.who_to_ask}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-4">{title}</h3>
      {children}
    </div>
  );
}
