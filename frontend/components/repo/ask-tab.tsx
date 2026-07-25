"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, AtSign, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAskQuestion } from "@/hooks/use-api";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function MarkdownAnswer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose-sm max-w-none"
      components={{
        p: ({ children }) => <p className="text-[13px] text-zinc-300 leading-relaxed mb-3 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-base font-semibold text-zinc-100 mb-2 mt-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold text-zinc-100 mb-2 mt-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-medium text-zinc-200 mb-1.5 mt-2">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
        em: ({ children }) => <em className="text-zinc-300 italic">{children}</em>,
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <pre className="my-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800/40 overflow-x-auto">
                <code className="text-[12px] font-mono text-zinc-300 leading-relaxed">{children}</code>
              </pre>
            );
          }
          return <code className="px-1.5 py-0.5 rounded-md bg-zinc-800/60 text-accent-400 text-[12px] font-mono" {...props}>{children}</code>;
        },
        pre: ({ children }) => <>{children}</>,
        ul: ({ children }) => <ul className="space-y-1 mb-3 ml-4">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-1 mb-3 ml-4 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="text-[13px] text-zinc-400 leading-relaxed list-disc">{children}</li>,
        a: ({ href, children }) => <a href={href} className="text-accent-400 hover:underline" target="_blank" rel="noopener">{children}</a>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-accent-600/30 pl-3 my-2 text-zinc-500">{children}</blockquote>,
        table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-[12px]">{children}</table></div>,
        th: ({ children }) => <th className="text-left px-3 py-1.5 border-b border-zinc-800/40 text-zinc-400 font-medium">{children}</th>,
        td: ({ children }) => <td className="px-3 py-1.5 border-b border-zinc-800/20 text-zinc-400">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function AskTab({ repoId }: { repoId: string }) {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [fileQuery, setFileQuery] = useState("");
  const [fileResults, setFileResults] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const askMutation = useAskQuestion(repoId);
  const qaHistory = useAppStore((s) => s.qaHistory[repoId] || []);
  const addQA = useAppStore((s) => s.addQA);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [qaHistory.length]);

  // @-mention file search
  const searchFiles = useCallback(async (q: string) => {
    if (q.length < 1) { setFileResults([]); return; }
    try {
      const res = await api.searchFiles(repoId, q);
      setFileResults(res.results);
    } catch { setFileResults([]); }
  }, [repoId]);

  useEffect(() => {
    const timer = setTimeout(() => searchFiles(fileQuery), 200);
    return () => clearTimeout(timer);
  }, [fileQuery, searchFiles]);

  const handleSubmit = async () => {
    const question = input.trim();
    if (!question || askMutation.isPending) return;
    setInput("");
    const filePath = attachedFile;
    setAttachedFile(null);

    try {
      const result = await askMutation.mutateAsync({
        repo_id: repoId,
        question: filePath ? `[About ${filePath}] ${question}` : question,
        include_code_snippets: true,
        file_path: filePath || "",
      });
      addQA(repoId, { question: filePath ? `@${filePath.split("/").pop()} ${question}` : question, answer: result.answer, confidence: result.confidence });
    } catch {
      addQA(repoId, { question, answer: "Could not find an answer. Try rephrasing.", confidence: 0 });
    }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    // Detect @-mention trigger
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && lastAt === val.length - 1) {
      setShowFilePicker(true);
      setFileQuery("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {qaHistory.length === 0 && !askMutation.isPending && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-accent-600/8 border border-accent-600/15 flex items-center justify-center mb-5">
              <Sparkles className="w-6 h-6 text-accent-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-300 mb-1">Ask anything about the codebase</h3>
            <p className="text-[12px] text-zinc-600 max-w-sm leading-relaxed mb-6">
              RAG-powered search with markdown answers. Type <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-accent-400 text-[10px] font-mono">@</kbd> to reference a specific file.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {["How do I get started with this project?", "What's the database schema?", "How does authentication work?", "What are the main API endpoints?"].map((q) => (
                <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800/30 border border-zinc-800/40 text-[12px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700/50 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {qaHistory.map((qa, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md bg-accent-600/10 border border-accent-600/15 text-sm text-zinc-200">
                {qa.question}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[90%] card p-5">
                <MarkdownAnswer content={qa.answer} />
                {qa.confidence > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/40 flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", qa.confidence > 0.7 ? "bg-accent-400" : qa.confidence > 0.4 ? "bg-amber-400" : "bg-red-400")} />
                    <span className="text-[10px] font-mono text-zinc-600">{(qa.confidence * 100).toFixed(0)}% confidence</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {askMutation.isPending && (
          <div className="flex justify-start">
            <div className="card p-4 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-accent-400" />
              <span className="text-[12px] text-zinc-500">Searching codebase...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attached file badge */}
      {attachedFile && (
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-600/10 border border-accent-600/20 text-[11px] font-mono text-accent-400">
            <AtSign className="w-3 h-3" />
            {attachedFile.split("/").pop()}
            <button onClick={() => setAttachedFile(null)} className="ml-1 hover:text-red-400"><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}

      {/* @-mention file picker */}
      {showFilePicker && (
        <div className="card mb-2 max-h-48 overflow-y-auto">
          <div className="p-2">
            <input
              type="text"
              value={fileQuery}
              onChange={(e) => setFileQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-700 outline-none px-2 py-1"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Escape") setShowFilePicker(false); }}
            />
          </div>
          <div className="border-t border-zinc-800/40">
            {fileResults.map((f) => (
              <button key={f.path} onClick={() => { setAttachedFile(f.path); setShowFilePicker(false); setInput(input.replace(/@$/, "")); }}
                className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-zinc-400 hover:bg-zinc-800/30 transition-colors truncate">
                {f.path}
              </button>
            ))}
            {fileResults.length === 0 && fileQuery && <p className="px-3 py-2 text-[11px] text-zinc-600">No files found</p>}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-800/40 pt-3">
        <div className="flex items-center gap-2 card !rounded-xl p-1.5">
          <button onClick={() => setShowFilePicker(!showFilePicker)} className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors" title="Attach a file (@)">
            <AtSign className="w-4 h-4 text-zinc-600" />
          </button>
          <input ref={inputRef} type="text" value={input} onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ask about the codebase... (@ to reference a file)"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-700 outline-none"
            disabled={askMutation.isPending} />
          <button onClick={handleSubmit} disabled={askMutation.isPending || !input.trim()}
            className="btn-primary !rounded-lg !px-3 !py-2 disabled:!opacity-20">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}