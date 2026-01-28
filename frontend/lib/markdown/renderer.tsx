'use client';

/**
 * Markdown 渲染器
 * 支持自定义引用语法和代码高亮
 */
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

  // 预处理内容：将 [^数字] 和 [[文本]] 转换为特殊标记
  const processedContent = preprocessCitations(content);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // 自定义代码块渲染
        code({ className, children, ...props }) {
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
                  className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded"
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
        // 自定义段落，处理引用标记
        p({ children }) {
          return <p>{processChildren(children, citationsMap)}</p>;
        },
        // 自定义列表项
        li({ children }) {
          return <li>{processChildren(children, citationsMap)}</li>;
        },
        // 自定义表格
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-border bg-muted px-4 py-2 text-left font-medium">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-border px-4 py-2">
              {children}
            </td>
          );
        },
        // 链接
        a({ href, children }) {
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
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          );
        },
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}

/**
 * 预处理引用语法
 * 将 [^数字] 和 [[文本]] 保持原样，让后续处理识别
 */
function preprocessCitations(content: string): string {
  // 目前保持原样，由 processChildren 处理
  return content;
}

/**
 * 处理子节点中的引用标记
 */
function processChildren(
  children: React.ReactNode,
  citationsMap: Map<string, Citation>
): React.ReactNode {
  if (typeof children === 'string') {
    return processTextWithCitations(children, citationsMap);
  }
  
  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === 'string') {
        return <span key={index}>{processTextWithCitations(child, citationsMap)}</span>;
      }
      return child;
    });
  }
  
  return children;
}

/**
 * 处理文本中的引用标记
 */
function processTextWithCitations(
  text: string,
  citationsMap: Map<string, Citation>
): React.ReactNode {
  // 匹配 [^数字] 或 [[文本]] 格式
  const pattern = /\[\^(\d+)\]|\[\[([^\]]+)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const footnoteId = match[1]; // [^数字] 格式
    const bracketText = match[2]; // [[文本]] 格式
    const refId = footnoteId || bracketText;

    // 查找引用数据
    const citation = citationsMap.get(refId);

    if (citation) {
      parts.push(
        <CitationTooltip key={key++} citation={citation}>
          <span className="citation-ref cursor-help border-b border-dashed border-primary/50 text-primary">
            {footnoteId ? `[${footnoteId}]` : `[${bracketText}]`}
          </span>
        </CitationTooltip>
      );
    } else {
      // 没有找到引用数据，显示占位符
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {match[0]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
