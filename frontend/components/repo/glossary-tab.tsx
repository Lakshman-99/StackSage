"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useGlossary, useRegenerateGlossary } from "@/hooks/use-api";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { RegenerateButton, TabUnavailable } from "@/components/ui/regenerate-button";

export function GlossaryTab({ repoId }: { repoId: string }) {
  const { data, isLoading, error } = useGlossary(repoId);
  const regenerate = useRegenerateGlossary(repoId);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleRegenerate = () => {
    regenerate.mutate(undefined, {
      onSuccess: () => toast.success("Glossary regenerated"),
      onError: (e: any) => toast.error(e?.message || "Failed to regenerate glossary"),
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-ink-400" /></div>;
  if (error || !data) {
    return <TabUnavailable message="Glossary not available." onRegenerate={handleRegenerate} isPending={regenerate.isPending} />;
  }

  const categories = Array.from(new Set(data.terms.map((t) => t.category).filter(Boolean)));
  const filtered = data.terms.filter((t) => {
    const matchSearch = !search || t.term.toLowerCase().includes(search.toLowerCase()) || t.definition.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || t.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-end mb-3">
        <RegenerateButton onClick={handleRegenerate} isPending={regenerate.isPending} />
      </div>

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <span className="text-sm font-medium text-ink-800">{data.total_terms} terms</span>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-mono">
            <button onClick={() => setSelectedCategory(null)}
              className={cn("transition-colors", !selectedCategory ? "text-ink-950 underline underline-offset-4" : "text-ink-400 hover:text-ink-700")}>
              All
            </button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={cn("transition-colors", cat === selectedCategory ? "text-ink-950 underline underline-offset-4" : "text-ink-400 hover:text-ink-700")}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-ink-200 focus-within:border-ink-900 pb-2 mb-2 transition-colors">
        <Search className="w-4 h-4 text-ink-400 shrink-0" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms..." className="flex-1 bg-transparent text-sm text-ink-800 placeholder:text-ink-400 outline-none" />
      </div>

      {/* Terms */}
      <div className="divide-y divide-ink-200">
        {filtered.map((term) => (
          <div key={term.term} className="py-5">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h4 className="font-display italic text-lg text-ink-900">{term.term}</h4>
              {term.category && <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400 shrink-0 pt-1.5">{term.category}</span>}
            </div>
            <p className="text-[13px] text-ink-600 leading-relaxed">{term.definition}</p>
            {term.source_files.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {term.source_files.slice(0, 3).map((f) => <span key={f} className="text-[10px] font-mono text-ink-400">{f.split("/").pop()}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-center py-10 text-sm text-ink-400">No terms match your search.</p>}
    </div>
  );
}
