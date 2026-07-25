"use client";

import { useState } from "react";
import { useGlossary } from "@/hooks/use-api";
import { Loader2, Search, BookOpen, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlossaryTab({ repoId }: { repoId: string }) {
  const { data, isLoading, error } = useGlossary(repoId);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-accent-400" /></div>;
  if (error || !data) return <div className="text-center py-20 text-zinc-600 text-sm">Glossary not available.</div>;

  const categories = Array.from(new Set(data.terms.map((t) => t.category).filter(Boolean)));
  const filtered = data.terms.filter((t) => {
    const matchSearch = !search || t.term.toLowerCase().includes(search.toLowerCase()) || t.definition.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || t.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-accent-400" />
        <span className="text-sm font-medium text-zinc-200">{data.total_terms} terms</span>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 card !rounded-xl flex items-center gap-2 px-3 py-2.5">
          <Search className="w-4 h-4 text-zinc-700 shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms..." className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-700 outline-none" />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setSelectedCategory(null)}
              className={cn("px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all border",
                !selectedCategory ? "bg-accent-600/10 text-accent-400 border-accent-600/20" : "bg-zinc-900/50 text-zinc-500 border-zinc-800/40 hover:text-zinc-300")}>
              All
            </button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={cn("px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all border",
                  cat === selectedCategory ? "bg-accent-600/10 text-accent-400 border-accent-600/20" : "bg-zinc-900/50 text-zinc-500 border-zinc-800/40 hover:text-zinc-300")}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((term) => (
          <div key={term.term} className="card card-glow p-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="text-sm font-mono font-medium text-accent-400">{term.term}</h4>
              {term.category && <span className="mono-tag text-[10px] shrink-0"><Tag className="w-2.5 h-2.5 mr-1 inline" />{term.category}</span>}
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed">{term.definition}</p>
            {term.source_files.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {term.source_files.slice(0, 3).map((f) => <span key={f} className="text-[10px] font-mono text-zinc-700 bg-zinc-900 px-1.5 py-0.5 rounded">{f.split("/").pop()}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-center py-10 text-sm text-zinc-700">No terms match your search.</p>}
    </div>
  );
}