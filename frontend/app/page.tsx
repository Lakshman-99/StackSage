"use client";

import Link from "next/link";
import {
  GitBranch,
  Brain,
  Compass,
  MessageCircle,
  BookOpen,
  Gauge,
  ArrowRight,
  Zap,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useRepos } from "@/hooks/use-api";
import { useAppStore } from "@/stores/app-store";
import { IngestModal } from "@/components/ui/ingest-modal";
import { cn, extractRepoName, getStatusColor } from "@/lib/utils";

const FEATURES = [
  {
    icon: GitBranch,
    title: "Repo Ingestion",
    desc: "Deep-clones and parses every source file. Builds vector embeddings for intelligent retrieval.",
    accent: "from-emerald-500/20 to-transparent",
  },
  {
    icon: Brain,
    title: "Architecture Analysis",
    desc: "Reverse-engineers system structure, tech stack, design patterns, and architectural layers.",
    accent: "from-cyan-500/20 to-transparent",
  },
  {
    icon: Compass,
    title: "Entry Point Detection",
    desc: "Runs PageRank on the dependency graph to surface the most critical files to read first.",
    accent: "from-violet-500/20 to-transparent",
  },
  {
    icon: MessageCircle,
    title: "Codebase Q&A",
    desc: "Ask natural language questions. RAG-powered retrieval finds the exact code that answers you.",
    accent: "from-amber-500/20 to-transparent",
  },
  {
    icon: BookOpen,
    title: "Domain Glossary",
    desc: "Extracts project-specific terminology, abbreviations, and domain concepts automatically.",
    accent: "from-rose-500/20 to-transparent",
  },
  {
    icon: Gauge,
    title: "Change Impact",
    desc: "Before you modify a file, see every downstream dependency and test that could break.",
    accent: "from-blue-500/20 to-transparent",
  },
];

const TERMINAL_LINES = [
  { type: "input", text: "$ stacksage analyze github.com/vercel/next.js" },
  { type: "info", text: "✓ Cloned repository (14,382 files)" },
  { type: "info", text: "✓ Parsed 8,291 source files across 4 languages" },
  { type: "info", text: "✓ Created 12,847 vector embeddings" },
  { type: "info", text: "✓ Identified 6 architectural layers" },
  { type: "info", text: "✓ Ranked 15 critical entry points via PageRank" },
  { type: "info", text: "✓ Extracted 47 domain-specific terms" },
  { type: "success", text: "→ Ready. Ask me anything about this codebase." },
];

export default function HomePage() {
  const { data: repos } = useRepos();
  const openIngest = useAppStore((s) => s.openIngest);

  return (
    <div className="min-h-screen">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="hero-mesh absolute inset-0" />
        <div className="grid-pattern absolute inset-0" />

        <div className="relative max-w-5xl mx-auto px-8 pt-24 pb-20">
          {/* Badge */}
          <div className="animate-fade-in-up flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-500/8 border border-accent-500/15 text-accent-400 text-xs font-medium tracking-wide">
              <Zap className="w-3 h-3" />
              6-Agent Codebase Intelligence Platform
            </div>
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-in-up text-center text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tight leading-[1.05] mb-6"
            style={{ animationDelay: "100ms" }}
          >
            <span className="text-zinc-100">Stop reading code.</span>
            <br />
            <span className="text-shine">Start understanding it.</span>
          </h1>

          {/* Subheading */}
          <p
            className="animate-fade-in-up text-center text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ animationDelay: "200ms" }}
          >
            StackSage deploys six AI agents to analyze any repository —
            architecture, critical paths, terminology, and impact — so you
            onboard in minutes, not weeks.
          </p>

          {/* CTA */}
          <div
            className="animate-fade-in-up flex items-center justify-center gap-4"
            style={{ animationDelay: "300ms" }}
          >
            <button onClick={openIngest} className="btn-primary !px-8 !py-3 text-base">
              <Zap className="w-4 h-4" />
              Analyze a Repository
            </button>
            <a
              href="#features"
              className="btn-ghost !text-zinc-500 hover:!text-zinc-300"
            >
              How it works
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Terminal mockup */}
          <div
            className="animate-fade-in-up mt-16 max-w-2xl mx-auto"
            style={{ animationDelay: "500ms" }}
          >
            <div className="card !rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/80 border-b border-zinc-800/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-[10px] font-mono text-zinc-600 ml-2">
                  stacksage — analysis
                </span>
              </div>

              {/* Terminal body */}
              <div className="p-5 bg-[#0c0c0e] space-y-1.5">
                {TERMINAL_LINES.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "font-mono text-[13px] leading-relaxed",
                      line.type === "input" && "text-zinc-300",
                      line.type === "info" && "text-zinc-500",
                      line.type === "success" && "text-accent-400 font-medium"
                    )}
                  >
                    {line.text}
                  </div>
                ))}
                <div className="pt-1 text-zinc-600 font-mono text-[13px]">
                  <span className="inline-block w-2 h-4 bg-accent-500/70 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="relative py-24 border-t border-zinc-800/30">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-16">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-accent-500 mb-3">
              The Agent Pipeline
            </p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-zinc-100 tracking-tight">
              Six agents. One deep understanding.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, accent }, i) => (
              <div key={title} className="card card-glow p-6 group">
                <div
                  className={cn(
                    "absolute top-0 left-0 w-full h-24 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    accent
                  )}
                />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center mb-4 group-hover:border-accent-600/20 transition-colors">
                    <Icon className="w-5 h-5 text-zinc-500 group-hover:text-accent-400 transition-colors" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-zinc-100 mb-2">
                    {title}
                  </h3>
                  <p className="text-[13px] text-zinc-500 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 border-t border-zinc-800/30">
        <div className="max-w-3xl mx-auto px-8">
          <div className="text-center mb-16">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-accent-500 mb-3">
              How It Works
            </p>
            <h2 className="text-3xl font-display font-bold text-zinc-100 tracking-tight">
              Three steps to total clarity
            </h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Paste a Git URL",
                desc: "Drop in any public repository URL. StackSage clones it and begins parsing every file.",
              },
              {
                step: "02",
                title: "Agents analyze in parallel",
                desc: "Six specialized agents run the pipeline — parsing, embedding, architecture mapping, PageRank, glossary extraction.",
              },
              {
                step: "03",
                title: "Explore and ask questions",
                desc: "Browse the architecture, read entry points, search the glossary, or just ask questions in plain English.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="flex items-start gap-6 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800/60 flex items-center justify-center shrink-0 group-hover:border-accent-600/30 transition-colors">
                  <span className="text-sm font-mono font-medium text-zinc-500 group-hover:text-accent-400 transition-colors">
                    {step}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100 mb-1">
                    {title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== RECENT REPOS ===== */}
      {repos && repos.length > 0 && (
        <section className="py-16 border-t border-zinc-800/30">
          <div className="max-w-4xl mx-auto px-8">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-6">
              Your Repositories
            </p>
            <div className="space-y-2">
              {repos.map((repo) => (
                <Link
                  key={repo.repo_id}
                  href={`/repo/${repo.repo_id}`}
                  className="card flex items-center gap-4 p-4 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-zinc-800/50 border border-zinc-800/30 flex items-center justify-center shrink-0">
                    <GitBranch className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {extractRepoName(repo.repo_url)}
                    </p>
                    <p className="text-[11px] font-mono text-zinc-600 mt-0.5">
                      {repo.repo_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {repo.status !== "complete" && repo.status !== "failed" && (
                      <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
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
                    <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="py-12 border-t border-zinc-800/30">
        <div className="max-w-5xl mx-auto px-8 text-center">
          <p className="text-xs text-zinc-700 font-mono">
            StackSage v1.0.0 · Built by Lakshman · Powered by Groq + ChromaDB + NetworkX
          </p>
        </div>
      </footer>

      <IngestModal />
    </div>
  );
}