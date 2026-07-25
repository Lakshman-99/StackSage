"use client";

import { useOnboarding } from "@/hooks/use-api";
import { Loader2, Rocket, BookOpen, Terminal, Lightbulb, Calendar, Wrench, AlertTriangle, Users } from "lucide-react";

export function OnboardingTab({ repoId }: { repoId: string }) {
  const { data, isLoading, error } = useOnboarding(repoId);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-accent-400" /></div>;
  if (error || !data) return <div className="text-center py-20 text-zinc-600 text-sm">Onboarding guide not available.</div>;

  return (
    <div className="space-y-6 animate-fade-in-up max-w-3xl">
      {/* Welcome */}
      <div className="card p-6 card-glow">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-accent-600/10 border border-accent-600/15 flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-zinc-100 mb-2">Welcome to this codebase</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{data.welcome_message}</p>
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      {data.prerequisites?.length > 0 && (
        <Section icon={BookOpen} title="Prerequisites">
          <div className="space-y-3">
            {data.prerequisites.map((p: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">{p.skill}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.why}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Setup Steps */}
      {data.setup_steps?.length > 0 && (
        <Section icon={Terminal} title="Setup & Installation">
          <div className="space-y-4">
            {data.setup_steps.map((s: any, i: number) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-mono font-medium text-zinc-400">{s.step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{s.title}</p>
                  {s.command && (
                    <pre className="mt-2 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800/40 text-[12px] font-mono text-accent-400 overflow-x-auto">
                      {s.command}
                    </pre>
                  )}
                  <p className="text-xs text-zinc-500 mt-1.5">{s.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Architecture Overview */}
      {data.architecture_overview && (
        <Section icon={Lightbulb} title="Architecture Overview">
          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{data.architecture_overview}</p>
        </Section>
      )}

      {/* Key Concepts */}
      {data.key_concepts?.length > 0 && (
        <Section icon={BookOpen} title="Key Concepts to Learn">
          <div className="space-y-4">
            {data.key_concepts.map((c: any, i: number) => (
              <div key={i} className="border-l-2 border-accent-600/20 pl-4">
                <p className="text-sm font-medium text-zinc-200">{c.concept}</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{c.explanation}</p>
                {c.where_to_look && <p className="text-[11px] font-mono text-zinc-600 mt-1">→ {c.where_to_look}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* First Week Plan */}
      {data.first_week_plan?.length > 0 && (
        <Section icon={Calendar} title="Your First Week">
          <div className="space-y-5">
            {data.first_week_plan.map((d: any, i: number) => (
              <div key={i} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono font-medium text-accent-400 bg-accent-600/10 px-2 py-0.5 rounded">{d.day}</span>
                  <span className="text-sm font-medium text-zinc-200">{d.goal}</span>
                </div>
                <div className="space-y-1 ml-1">
                  {d.tasks?.map((t: string, j: number) => (
                    <p key={j} className="text-xs text-zinc-500 flex items-center gap-2">
                      <span className="text-zinc-700">□</span> {t}
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
        <Section icon={Wrench} title="Common Development Tasks">
          <div className="space-y-4">
            {data.common_tasks.map((t: any, i: number) => (
              <div key={i} className="card p-4">
                <p className="text-sm font-medium text-zinc-200 mb-2">{t.task}</p>
                <ol className="space-y-1">
                  {t.steps?.map((s: string, j: number) => (
                    <li key={j} className="text-xs text-zinc-500">{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Gotchas */}
      {data.gotchas?.length > 0 && (
        <Section icon={AlertTriangle} title="Watch Out For">
          <div className="space-y-3">
            {data.gotchas.map((g: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">{g.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{g.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Who to Ask */}
      {data.who_to_ask && (
        <Section icon={Users} title="Where to Get Help">
          <p className="text-sm text-zinc-400 leading-relaxed">{data.who_to_ask}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-zinc-500 mb-4">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h3>
      {children}
    </div>
  );
}