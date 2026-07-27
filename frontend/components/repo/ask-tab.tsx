"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, AtSign, X, User } from "lucide-react";
import { useAskQuestion } from "@/hooks/use-api";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MarkdownAnswer } from "@/components/ui/markdown-answer";

const MIN_QUESTION_LENGTH = 3;

function ChatTurn({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className={cn("flex gap-3 px-4 py-5 rounded-md", role === "assistant" && "bg-ink-50")}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        role === "user" ? "bg-ink-900" : "bg-accent-500"
      )}>
        {role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">{children}</div>
    </div>
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

  const trimmed = input.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_QUESTION_LENGTH;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [qaHistory.length, askMutation.isPending]);

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
    if (!question || question.length < MIN_QUESTION_LENGTH || askMutation.isPending) return;
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
    } catch (err: any) {
      addQA(repoId, { question, answer: err?.message || "Could not find an answer. Try rephrasing.", confidence: 0 });
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
    <div className="flex flex-col h-[calc(100vh-190px)] animate-fade-in-up">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-1 pb-4">
          {qaHistory.length === 0 && !askMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 min-h-[50vh]">
              <Sparkles className="w-6 h-6 text-ink-300 mb-5" />
              <h3 className="text-lg font-medium text-ink-800 mb-1.5">Ask anything about this codebase</h3>
              <p className="text-[13px] text-ink-400 max-w-sm leading-relaxed mb-6">
                RAG-powered search over the whole repo, with markdown answers. Type <kbd className="px-1 py-0.5 rounded bg-ink-100 text-ink-700 text-[10px] font-mono">@</kbd> to reference a specific file.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center max-w-lg">
                {["How do I get started with this project?", "What's the database schema?", "How does authentication work?", "What are the main API endpoints?"].map((q) => (
                  <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-[12px] text-ink-500 hover:text-ink-900 underline-offset-4 hover:underline transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {qaHistory.map((qa, i) => (
            <div key={i}>
              <ChatTurn role="user">
                <p className="text-sm text-ink-800 leading-relaxed whitespace-pre-wrap">{qa.question}</p>
              </ChatTurn>
              <ChatTurn role="assistant">
                <MarkdownAnswer content={qa.answer} />
              </ChatTurn>
            </div>
          ))}

          {askMutation.isPending && (
            <ChatTurn role="assistant">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-ink-400" />
                <span className="text-[13px] text-ink-500">Searching the codebase...</span>
              </div>
            </ChatTurn>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer - always pinned to the bottom of the tab, never scrolls away */}
      <div className="shrink-0 pt-3 border-t border-ink-200">
        <div className="max-w-3xl mx-auto w-full">
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ink-100 text-[11px] font-mono text-ink-700">
                <AtSign className="w-3 h-3" />
                {attachedFile.split("/").pop()}
                <button onClick={() => setAttachedFile(null)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
              </span>
            </div>
          )}

          {showFilePicker && (
            <div className="panel mb-2 max-h-48 overflow-y-auto shadow-lg">
              <div className="p-2">
                <input
                  type="text"
                  value={fileQuery}
                  onChange={(e) => setFileQuery(e.target.value)}
                  placeholder="Search files..."
                  className="w-full bg-transparent text-sm text-ink-800 placeholder:text-ink-400 outline-none px-2 py-1"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Escape") setShowFilePicker(false); }}
                />
              </div>
              <div className="border-t border-ink-100">
                {fileResults.map((f) => (
                  <button key={f.path} onClick={() => { setAttachedFile(f.path); setShowFilePicker(false); setInput(input.replace(/@$/, "")); }}
                    className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-ink-600 hover:bg-ink-50 transition-colors truncate">
                    {f.path}
                  </button>
                ))}
                {fileResults.length === 0 && fileQuery && <p className="px-3 py-2 text-[11px] text-ink-400">No files found</p>}
              </div>
            </div>
          )}

          <div className={cn(
            "flex items-center gap-2 bg-white border rounded-md px-2 py-2 transition-colors",
            tooShort ? "border-amber-300" : "border-ink-200 focus-within:border-ink-900"
          )}>
            <button onClick={() => setShowFilePicker(!showFilePicker)} className="p-2 rounded hover:bg-ink-100 transition-colors shrink-0" title="Attach a file (@)">
              <AtSign className="w-4 h-4 text-ink-400" />
            </button>
            <input ref={inputRef} type="text" value={input} onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ask about the codebase... (@ to reference a file)"
              className="flex-1 bg-transparent text-sm text-ink-800 placeholder:text-ink-400 outline-none"
              disabled={askMutation.isPending} />
            <button onClick={handleSubmit} disabled={askMutation.isPending || !trimmed || tooShort}
              className="btn-primary !rounded !px-3 !py-2 shrink-0 disabled:!opacity-20">
              <Send className="w-4 h-4" />
            </button>
          </div>
          {tooShort && (
            <p className="text-[11px] text-amber-600 mt-1.5 px-1">Ask a bit more - at least {MIN_QUESTION_LENGTH} characters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
