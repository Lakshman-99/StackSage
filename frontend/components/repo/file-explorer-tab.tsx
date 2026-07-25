"use client";

import { useState } from "react";
import { useFileTree, useFileContent } from "@/hooks/use-api";
import { Loader2, ChevronRight, ChevronDown, File, Folder, FolderOpen, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function TreeNode({ node, depth = 0, onSelectFile }: { node: any; depth?: number; onSelectFile: (path: string) => void }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDir = node.type === "directory";

  if (isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 hover:bg-zinc-800/30 rounded-lg transition-colors group"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? <ChevronDown className="w-3 h-3 text-zinc-600" /> : <ChevronRight className="w-3 h-3 text-zinc-600" />}
          {expanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-400/70" /> : <Folder className="w-3.5 h-3.5 text-amber-400/50" />}
          <span className="text-[12px] text-zinc-300 truncate">{node.name}</span>
          <span className="text-[10px] text-zinc-700 ml-auto font-mono">{node.file_count}</span>
        </button>
        {expanded && node.children?.map((child: any) => (
          <TreeNode key={child.path || child.name} node={child} depth={depth + 1} onSelectFile={onSelectFile} />
        ))}
      </div>
    );
  }

  const langColors: Record<string, string> = {
    typescript: "text-blue-400", javascript: "text-yellow-400", python: "text-green-400",
    go: "text-cyan-400", java: "text-orange-400", rust: "text-red-400",
    css: "text-pink-400", html: "text-orange-300", json: "text-zinc-400",
    yaml: "text-purple-400", sql: "text-emerald-400", markdown: "text-zinc-300",
  };

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className="flex items-center gap-1.5 w-full text-left px-2 py-1 hover:bg-zinc-800/30 rounded-lg transition-colors"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <File className={cn("w-3.5 h-3.5", langColors[node.language] || "text-zinc-500")} />
      <span className="text-[12px] text-zinc-400 truncate">{node.name}</span>
      <span className="text-[10px] text-zinc-700 ml-auto font-mono">{node.line_count}L</span>
    </button>
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
    <div className="flex flex-col h-full">
      {/* File header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/40 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <File className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="text-[12px] font-mono text-zinc-300 truncate">{filePath}</span>
          {data && <span className="text-[10px] text-zinc-600 font-mono shrink-0">{data.line_count} lines</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-accent-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600" />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors">
            <X className="w-3.5 h-3.5 text-zinc-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-4 h-4 animate-spin text-accent-400" /></div>
        ) : data ? (
          <pre className="p-4 text-[12px] font-mono text-zinc-400 leading-relaxed">
            {data.content.split("\n").map((line: string, i: number) => (
              <div key={i} className="flex hover:bg-zinc-800/20">
                <span className="w-10 text-right pr-4 text-zinc-700 select-none shrink-0">{i + 1}</span>
                <span className="whitespace-pre-wrap break-all">{line}</span>
              </div>
            ))}
          </pre>
        ) : (
          <p className="text-center py-10 text-zinc-600 text-sm">Could not load file.</p>
        )}
      </div>
    </div>
  );
}

export function FileExplorerTab({ repoId }: { repoId: string }) {
  const { data, isLoading } = useFileTree(repoId);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-accent-400" /></div>;
  if (!data) return <div className="text-center py-20 text-zinc-600 text-sm">File tree not available.</div>;

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Tree sidebar */}
      <div className="w-72 shrink-0 card overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800/40">
          <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-zinc-500">{data.file_count} files</p>
        </div>
        <div className="py-1">
          {data.tree.map((node: any) => (
            <TreeNode key={node.path || node.name} node={node} onSelectFile={setSelectedFile} />
          ))}
        </div>
      </div>

      {/* File viewer */}
      <div className="flex-1 card overflow-hidden">
        {selectedFile ? (
          <FileViewer repoId={repoId} filePath={selectedFile} onClose={() => setSelectedFile(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <File className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">Select a file to view its contents</p>
            <p className="text-xs text-zinc-700 mt-1">Click any file in the tree on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}