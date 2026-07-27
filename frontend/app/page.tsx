"use client";

import Link from "next/link";
import { GitBranch, ArrowRight } from "lucide-react";
import { useRepos } from "@/hooks/use-api";
import { useAppStore } from "@/stores/app-store";
import { IngestModal } from "@/components/ui/ingest-modal";
import { cn, extractRepoName, getStatusColor } from "@/lib/utils";

const FEATURES = [
  {
    title: "Repo Ingestion",
    desc: "Deep-clones and parses every source file. Builds vector embeddings for intelligent retrieval.",
  },
  {
    title: "Architecture Analysis",
    desc: "Reverse-engineers system structure, tech stack, design patterns, and architectural layers.",
  },
  {
    title: "Entry Point Detection",
    desc: "Runs PageRank on the dependency graph to surface the most critical files to read first.",
  },
  {
    title: "Codebase Q&A",
    desc: "Ask natural language questions. RAG-powered retrieval finds the exact code that answers you.",
  },
  {
    title: "Domain Glossary",
    desc: "Extracts project-specific terminology, abbreviations, and domain concepts automatically.",
  },
  {
    title: "Change Impact",
    desc: "Before you modify a file, see every downstream dependency and test that could break.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Paste a Git URL",
    desc: "Drop in any public repository URL. StackSage clones it and begins parsing every file.",
  },
  {
    step: "02",
    title: "Agents analyze in parallel",
    desc: "Six specialized agents run the pipeline: parsing, embedding, architecture mapping, PageRank, glossary extraction.",
  },
  {
    step: "03",
    title: "Explore and ask questions",
    desc: "Browse the architecture, read entry points, search the glossary, or just ask questions in plain English.",
  },
];

export default function HomePage() {
  const { data: repos } = useRepos();
  const openIngest = useAppStore((s) => s.openIngest);

  return (
    <div className="min-h-screen">
      {/* ===== HERO ===== */}
      <section className="px-8 pt-28 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="max-w-2xl">
            <p className="animate-fade-in-up text-[11px] font-mono uppercase tracking-[0.2em] text-ink-400 mb-6">
              StackSage · Codebase Intelligence
            </p>

            <h1
              className="animate-fade-in-up font-display text-[3.25rem] md:text-[4.5rem] leading-[0.98] tracking-[-0.02em] text-ink-950 mb-7"
              style={{ animationDelay: "80ms" }}
            >
              Stop reading code.
              <br />
              <em className="italic font-normal">Start understanding it.</em>
            </h1>

            <p
              className="animate-fade-in-up text-lg text-ink-500 leading-relaxed mb-10 max-w-xl"
              style={{ animationDelay: "160ms" }}
            >
              StackSage deploys six AI agents to analyze any repository:
              architecture, critical paths, terminology, and impact, so you
              onboard in minutes, not weeks.
            </p>

            <div
              className="animate-fade-in-up flex items-center gap-6"
              style={{ animationDelay: "240ms" }}
            >
              <button onClick={openIngest} className="btn-primary text-sm">
                Analyze a Repository
              </button>
              <a
                href="#features"
                className="btn-ghost underline-offset-4 hover:underline"
              >
                How it works
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="px-8">
        <div className="max-w-3xl mx-auto section">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-ink-400 mb-3">
            The Agent Pipeline
          </p>
          <h2 className="font-display text-[2rem] md:text-[2.5rem] leading-[1.05] text-ink-950 mb-10">
            Six agents. One deep understanding.
          </h2>

          <div className="divide-y divide-ink-200">
            {FEATURES.map(({ title, desc }, i) => (
              <div key={title} className="grid grid-cols-1 md:grid-cols-[3rem_14rem_1fr] gap-x-8 gap-y-2 py-7">
                <span className="font-mono text-[12px] text-ink-300">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-[1.0625rem] font-medium text-ink-900">{title}</h3>
                <p className="text-[13px] text-ink-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="px-8">
        <div className="max-w-3xl mx-auto section">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-ink-400 mb-3">
            How It Works
          </p>
          <h2 className="font-display text-[2rem] leading-[1.05] text-ink-950 mb-10">
            Three steps to total clarity
          </h2>

          <div className="divide-y divide-ink-200">
            {STEPS.map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-6 py-8">
                <span className="font-display italic text-[2.5rem] leading-none text-ink-200 w-16 shrink-0">
                  {step}
                </span>
                <div>
                  <h3 className="text-base font-medium text-ink-900 mb-1">{title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== RECENT REPOS ===== */}
      {repos && repos.length > 0 && (
        <section className="px-8">
          <div className="max-w-3xl mx-auto section">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-ink-400 mb-6">
              Your Repositories
            </p>
            <div className="divide-y divide-ink-200">
              {repos.map((repo) => (
                <Link
                  key={repo.repo_id}
                  href={`/repo/${repo.repo_id}`}
                  className="flex items-center gap-4 py-4 group"
                >
                  <GitBranch className="w-4 h-4 text-ink-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">
                      {extractRepoName(repo.repo_url)}
                    </p>
                    <p className="text-[11px] font-mono text-ink-400 mt-0.5">
                      {repo.repo_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {repo.status !== "complete" && repo.status !== "failed" && (
                      <div className="w-16 h-1 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-500 rounded-full shimmer-bar"
                          style={{ width: `${repo.progress}%` }}
                        />
                      </div>
                    )}
                    <span
                      className={cn(
                        "text-[11px] font-mono capitalize",
                        getStatusColor(repo.status)
                      )}
                    >
                      {repo.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="px-8 pb-12">
        <div className="max-w-3xl mx-auto section text-center">
          <p className="text-xs text-ink-400 font-mono">
            StackSage v1.0.0 · Built by Lakshman · Powered by Groq + ChromaDB + NetworkX
          </p>
        </div>
      </footer>

      <IngestModal />
    </div>
  );
}
