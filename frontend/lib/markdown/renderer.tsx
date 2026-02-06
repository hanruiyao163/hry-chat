'use client';

/**
 * Markdown 渲染器
 * 支持自定义引用语法和代码高亮
 */
import { Children, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CitationTooltip } from '@/components/chat/citation-tooltip';
import type { Citation } from '@/types/chat';

interface MarkdownRendererProps {
  content: string;
  citations?: Citation[];
}

export function MarkdownRenderer({ content, citations = [] }: MarkdownRendererProps) {
  // 创建引用映射
  const citationsMap = new Map<string, Citation>();
  citations.forEach(c => {
    citationsMap.set(c.id, c);
  });

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkCitations]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // 自定义代码块渲染
        code({ className, children, ...props }: { className?: string; children?: ReactNode } & Record<string, any>) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;
          
          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          }
          
          return (
            <div className="relative group">
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="text-xs bg-muted hover:bg-muted/80 px-2 py-0.5 rounded"
                  onClick={() => {
                    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                  }}
                >
                  复制
                </button>
              </div>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            </div>
          );
        },
        // 自定义引用标签（由 AST 插件生成）
        citation({ refid, children }: { refid?: string | string[]; children?: ReactNode }) {
          const refId = typeof refid === 'string' ? refid : Array.isArray(refid) ? refid[0] : undefined;
          const citation = refId ? citationsMap.get(refId) : undefined;
          const hasChildren = Children.count(children) > 0;
          const label = hasChildren ? children : refId ? `[${refId}]` : '';

          if (citation) {
            return (
              <CitationTooltip citation={citation}>
                <span className="citation-ref cursor-help border-b border-dashed border-primary/50 text-primary">
                  {label}
                </span>
              </CitationTooltip>
            );
          }

          return <span className="text-muted-foreground">{label}</span>;
        },
        // 自定义表格
        table({ children }: { children?: ReactNode }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          );
        },
        th({ children }: { children?: ReactNode }) {
          return (
            <th className="border border-border bg-muted px-4 py-2 text-left font-medium">
              {children}
            </th>
          );
        },
        td({ children }: { children?: ReactNode }) {
          return (
            <td className="border border-border px-4 py-2">
              {children}
            </td>
          );
        },
        // 链接
        a({ href, children }: { href?: string; children?: ReactNode }) {
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          );
        },
        // 引用块
        blockquote({ children }: { children?: ReactNode }) {
          return (
            <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          );
        },
      } as any}
    >
      {content}
    </ReactMarkdown>
  );
}

/**
 * remark 插件：将 [^数字] 与 [[文本]] 解析为 citation 节点
 */
function remarkCitations() {
  return (tree: any) => {
    walk(tree);
  };
}

function walk(node: any) {
  if (!node || node.type === 'code' || node.type === 'inlineCode') {
    return;
  }

  const children = node.children;
  if (!Array.isArray(children)) {
    return;
  }

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (child?.type === 'text' && typeof child.value === 'string') {
      const replaced = splitTextToCitations(child.value);
      if (replaced) {
        children.splice(i, 1, ...replaced);
        i += replaced.length - 1;
      }
    } else {
      walk(child);
    }
  }
}

function splitTextToCitations(value: string) {
  const pattern = /\[\^(\d+)\]|\[\[([^\]]+)\]\]/g;
  const nodes: any[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    }

    const footnoteId = match[1];
    const bracketText = match[2];
    const refId = footnoteId || bracketText;
    const label = footnoteId ? `[${footnoteId}]` : `[${bracketText}]`;

    nodes.push({
      type: 'citation',
      data: {
        hName: 'citation',
        hProperties: {
          refid: refId,
          kind: footnoteId ? 'footnote' : 'bracket',
        },
      },
      children: [{ type: 'text', value: label }],
    });

    lastIndex = match.index + match[0].length;
  }

  if (nodes.length === 0) {
    return null;
  }

  if (lastIndex < value.length) {
    nodes.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return nodes;
}
