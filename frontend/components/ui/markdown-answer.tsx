"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownAnswer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose-sm max-w-none"
      components={{
        p: ({ children }) => <p className="text-[13px] text-ink-600 leading-relaxed mb-3 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-base font-semibold text-ink-900 mb-2 mt-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold text-ink-900 mb-2 mt-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-medium text-ink-800 mb-1.5 mt-2">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-ink-900">{children}</strong>,
        em: ({ children }) => <em className="text-ink-600 italic">{children}</em>,
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <pre className="my-3 p-3 rounded-md bg-ink-900 border border-ink-800 overflow-x-auto">
                <code className="text-[12px] font-mono text-ink-200 leading-relaxed">{children}</code>
              </pre>
            );
          }
          return <code className="px-1.5 py-0.5 rounded-md bg-ink-100 text-ink-800 text-[12px] font-mono" {...props}>{children}</code>;
        },
        pre: ({ children }) => <>{children}</>,
        ul: ({ children }) => <ul className="space-y-1 mb-3 ml-4">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-1 mb-3 ml-4 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="text-[13px] text-ink-500 leading-relaxed list-disc">{children}</li>,
        a: ({ href, children }) => <a href={href} className="text-accent-600 hover:underline" target="_blank" rel="noopener">{children}</a>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-ink-200 pl-3 my-2 text-ink-500">{children}</blockquote>,
        table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-[12px]">{children}</table></div>,
        th: ({ children }) => <th className="text-left px-3 py-1.5 border-b border-ink-200 text-ink-600 font-medium">{children}</th>,
        td: ({ children }) => <td className="px-3 py-1.5 border-b border-ink-100 text-ink-500">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
