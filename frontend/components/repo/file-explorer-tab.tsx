"use client";

import { useMemo, useRef, useState } from "react";
import { useFileTree, useFileContent, useAskQuestion } from "@/hooks/use-api";
import {
  Loader2, ChevronRight, File, Folder, FolderOpen, X, Copy, Check,
  Search, Sparkles, MessageCircle, Send,
} from "lucide-react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import ruby from "react-syntax-highlighter/dist/esm/languages/prism/ruby";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import swift from "react-syntax-highlighter/dist/esm/languages/prism/swift";
import kotlin from "react-syntax-highlighter/dist/esm/languages/prism/kotlin";
import scala from "react-syntax-highlighter/dist/esm/languages/prism/scala";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import scss from "react-syntax-highlighter/dist/esm/languages/prism/scss";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import toml from "react-syntax-highlighter/dist/esm/languages/prism/toml";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import docker from "react-syntax-highlighter/dist/esm/languages/prism/docker";
import hcl from "react-syntax-highlighter/dist/esm/languages/prism/hcl";
import protobuf from "react-syntax-highlighter/dist/esm/languages/prism/protobuf";
import { cn } from "@/lib/utils";
import { MarkdownAnswer } from "@/components/ui/markdown-answer";

[
  ["python", python], ["javascript", javascript], ["typescript", typescript],
  ["java", java], ["go", go], ["rust", rust], ["ruby", ruby], ["php", php],
  ["c", c], ["cpp", cpp], ["csharp", csharp], ["swift", swift], ["kotlin", kotlin],
  ["scala", scala], ["html", markup], ["css", css], ["scss", scss], ["sql", sql],
  ["shell", bash], ["yaml", yaml], ["toml", toml], ["json", json], ["markdown", markdown],
  ["dockerfile", docker], ["terraform", hcl], ["protobuf", protobuf],
].forEach(([name, lang]) => SyntaxHighlighter.registerLanguage(name as string, lang as any));

interface FlatNode {
  name: string;
  type: "file" | "directory";
  path: string;
  language?: string;
  line_count?: number;
  file_count?: number;
  children?: FlatNode[];
}

function filterTree(nodes: FlatNode[], query: string): FlatNode[] {
  if (!query.trim()) return nodes;
  const q = query.toLowerCase();
  return nodes
    .map((node) => {
      if (node.type === "file") {
        return node.name.toLowerCase().includes(q) ? node : null;
      }
      const children = filterTree(node.children || [], query);
      if (children.length === 0 && !node.name.toLowerCase().includes(q)) return null;
      return { ...node, children: children.length ? children : node.children };
    })
    .filter(Boolean) as FlatNode[];
}

const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-500", javascript: "text-yellow-600", python: "text-green-600",
  go: "text-cyan-600", java: "text-orange-500", rust: "text-red-500",
  css: "text-pink-500", html: "text-orange-400", json: "text-ink-400",
  yaml: "text-purple-500", sql: "text-emerald-600", markdown: "text-ink-400",
};

function TreeNode({ node, depth = 0, selectedPath, onSelectFile }: {
  node: FlatNode; depth?: number; selectedPath: string | null; onSelectFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDir = node.type === "directory";

  if (isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md hover:bg-ink-100 transition-colors group"
        >
          <ChevronRight className={cn("w-3 h-3 text-ink-400 shrink-0 transition-transform", expanded && "rotate-90")} />
          {expanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />}
          <span className="text-[12px] text-ink-700 truncate">{node.name}</span>
          <span className="text-[10px] text-ink-300 ml-auto font-mono shrink-0">{node.file_count}</span>
        </button>
        {expanded && node.children && node.children.length > 0 && (
          <div className="ml-3.5 pl-2 border-l border-ink-200">
            {node.children.map((child) => (
              <TreeNode key={child.path || child.name} node={child} depth={depth + 1} selectedPath={selectedPath} onSelectFile={onSelectFile} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedPath === node.path;

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={cn(
        "flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md transition-colors",
        isSelected ? "bg-ink-100 text-ink-900" : "hover:bg-ink-100"
      )}
    >
      <File className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-ink-900" : LANG_COLORS[node.language || ""] || "text-ink-400")} />
      <span className={cn("text-[12px] truncate", isSelected ? "text-ink-900 font-medium" : "text-ink-600")}>{node.name}</span>
      <span className="text-[10px] text-ink-300 ml-auto font-mono shrink-0">{node.line_count}L</span>
    </button>
  );
}

interface Selection {
  text: string;
  x: number;
  y: number;
}

type AiMode = "toolbar" | "ask-input" | "result" | null;

function SelectionAiPopover({ repoId, filePath, children }: { repoId: string; filePath: string; children: React.ReactNode }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mode, setMode] = useState<AiMode>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const askMutation = useAskQuestion(repoId);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!text || !sel || sel.rangeCount === 0) return;
    const anchorNode = sel.anchorNode;
    if (!anchorNode || !containerRef.current?.contains(anchorNode)) return;

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelection({ text, x: rect.left, y: rect.top });
    setMode("toolbar");
    setAnswer(null);
    setQuestion("");
  };

  const close = () => { setMode(null); setSelection(null); };

  const runAsk = async (fullQuestion: string) => {
    if (!selection) return;
    setMode("result");
    try {
      const result = await askMutation.mutateAsync({
        repo_id: repoId,
        question: fullQuestion,
        include_code_snippets: false,
        file_path: filePath,
      });
      setAnswer(result.answer);
    } catch (err: any) {
      setAnswer(err?.message || "Could not answer this question.");
    }
  };

  const handleExplain = () => {
    if (!selection) return;
    runAsk(`Explain this code snippet from ${filePath}:\n\n${selection.text}`);
  };

  const handleAskSubmit = () => {
    if (!selection || !question.trim()) return;
    runAsk(`${question.trim()}\n\nRegarding this snippet from ${filePath}:\n\n${selection.text}`);
  };

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp} className="h-full">
      {children}
      {selection && mode && (
        <div
          className="fixed z-50"
          style={{ top: Math.max(8, selection.y - 46), left: Math.min(Math.max(8, selection.x), window.innerWidth - 320) }}
        >
          {mode === "toolbar" && (
            <div className="flex items-center gap-0.5 bg-ink-900 rounded-md shadow-xl p-1 animate-fade-in-up" style={{ animationDuration: "150ms" }}>
              <button onClick={handleExplain} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-ink-50 hover:bg-ink-800 transition-colors">
                <Sparkles className="w-3 h-3 text-accent-400" /> Explain
              </button>
              <div className="w-px h-4 bg-ink-700" />
              <button onClick={() => setMode("ask-input")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-ink-50 hover:bg-ink-800 transition-colors">
                <MessageCircle className="w-3 h-3 text-accent-400" /> Ask
              </button>
              <button onClick={close} className="p-1.5 rounded hover:bg-ink-800 transition-colors">
                <X className="w-3 h-3 text-ink-400" />
              </button>
            </div>
          )}

          {mode === "ask-input" && (
            <div className="flex items-center gap-1 bg-white border border-ink-200 rounded-md shadow-xl p-1.5 w-80">
              <input
                autoFocus
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskSubmit()}
                placeholder="Ask about this selection..."
                className="flex-1 text-[12px] px-2 py-1.5 outline-none text-ink-800 placeholder:text-ink-400"
              />
              <button onClick={handleAskSubmit} disabled={!question.trim()} className="btn-primary !p-1.5 !rounded disabled:!opacity-30">
                <Send className="w-3.5 h-3.5" />
              </button>
              <button onClick={close} className="p-1.5 rounded hover:bg-ink-100 transition-colors">
                <X className="w-3.5 h-3.5 text-ink-400" />
              </button>
            </div>
          )}

          {mode === "result" && (
            <div className="w-96 max-h-80 overflow-y-auto bg-white border border-ink-200 rounded-md shadow-2xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-accent-500" /> AI on selection
                </span>
                <button onClick={close} className="p-1 rounded hover:bg-ink-100 transition-colors">
                  <X className="w-3.5 h-3.5 text-ink-400" />
                </button>
              </div>
              {askMutation.isPending ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-ink-400" />
                  <span className="text-[12px] text-ink-500">Thinking...</span>
                </div>
              ) : (
                <MarkdownAnswer content={answer || ""} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileViewer({ repoId, filePath, onClose }: { repoId: string; filePath: string; onClose: () => void }) {
  const { data, isLoading } = useFileContent(repoId, filePath);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (data?.content) {
      navigator.clipboard.writeText(data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* File header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-800 bg-ink-900 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <File className="w-3.5 h-3.5 text-ink-500 shrink-0" />
          <span className="text-[12px] font-mono text-ink-200 truncate">{filePath}</span>
          {data && <span className="text-[10px] text-ink-500 font-mono shrink-0">{data.line_count} lines</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleCopy} className="p-1.5 rounded hover:bg-ink-800 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-accent-400" /> : <Copy className="w-3.5 h-3.5 text-ink-500" />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ink-800 transition-colors">
            <X className="w-3.5 h-3.5 text-ink-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white relative">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-4 h-4 animate-spin text-ink-400" /></div>
        ) : data ? (
          <SelectionAiPopover repoId={repoId} filePath={filePath}>
            <SyntaxHighlighter
              language={data.language || "text"}
              style={oneLight}
              showLineNumbers
              wrapLongLines
              customStyle={{ margin: 0, padding: "1rem", background: "transparent", fontSize: "12px" }}
              lineNumberStyle={{ color: "#C9C4B8", minWidth: "2.5em" }}
            >
              {data.content}
            </SyntaxHighlighter>
          </SelectionAiPopover>
        ) : (
          <p className="text-center py-10 text-ink-500 text-sm">Could not load file.</p>
        )}
      </div>
    </div>
  );
}

export function FileExplorerTab({ repoId }: { repoId: string }) {
  const { data, isLoading } = useFileTree(repoId);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredTree = useMemo(() => (data ? filterTree(data.tree as FlatNode[], search) : []), [data, search]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-ink-400" /></div>;
  if (!data) return <div className="text-center py-20 text-ink-400 text-sm">File tree not available.</div>;

  return (
    <div className="flex h-[calc(100vh-200px)] border-t border-ink-200">
      {/* Tree sidebar */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden border-r border-ink-200">
        <div className="px-3 py-2.5 border-b border-ink-100 shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-ink-50 border border-ink-100">
            <Search className="w-3.5 h-3.5 text-ink-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${data.file_count} files...`}
              className="flex-1 bg-transparent text-[12px] text-ink-700 placeholder:text-ink-400 outline-none min-w-0"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1.5 px-1">
          {filteredTree.length === 0 ? (
            <p className="px-3 py-8 text-[11px] text-ink-400 text-center">No files match "{search}"</p>
          ) : (
            filteredTree.map((node) => (
              <TreeNode key={node.path || node.name} node={node} selectedPath={selectedFile} onSelectFile={setSelectedFile} />
            ))
          )}
        </div>
      </div>

      {/* File viewer */}
      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          <FileViewer repoId={repoId} filePath={selectedFile} onClose={() => setSelectedFile(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <File className="w-8 h-8 text-ink-300 mb-3" />
            <p className="text-sm text-ink-500">Select a file to view its contents</p>
            <p className="text-xs text-ink-400 mt-1">Select any text in a file to explain or ask AI about it</p>
          </div>
        )}
      </div>
    </div>
  );
}
