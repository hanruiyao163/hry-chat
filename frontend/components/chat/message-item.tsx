'use client';

/**
 * 单条消息组件 - 极简主义设计
 * 
 * 设计理念：
 * - AI: 去除背景框，纯净排版，左侧对齐，强调阅读体验
 * - User: 极简气泡，右侧对齐
 * - 增加微动画
 */
import { Copy, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/chat';
import { MarkdownRenderer } from '@/lib/markdown/renderer';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (

    <div className={cn(
      "flex w-full relative",
      "max-w-full",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>

      {/* 装饰图标 (仅 AI) - 可选，增加一点点标识度，不想太抢眼 */}
      {!isUser && (
        <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden xl:block">
          <Sparkles className="h-4 w-4 text-primary/30" />
        </div>
      )}

      {/* 消息内容容器 */}
      <div className={cn(
        "relative text-[15px] leading-7", // 调整字号和行高，增加呼吸感
        isUser
          ? "bg-primary text-primary-foreground px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm" // 用户：保持气泡
          : "w-full text-foreground/90 pl-1" // AI：去除背景，纯文本，微调左边距
      )}>
        <div className={cn(
          "prose prose-slate dark:prose-invert max-w-none break-words",
          // 针对 AI 回复的排版优化
          !isUser && "prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-7 prose-li:my-1",
          // 针对用户回复的样式覆盖
          isUser && "prose-p:text-primary-foreground prose-a:text-primary-foreground/90 prose-p:m-0"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <MarkdownRenderer
                content={message.content}
                citations={message.citations}
              />
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-1 align-middle rounded-full" />
              )}
            </>
          )}
        </div>

        {/* 操作栏 - AI 消息悬浮显示 */}
        {!isUser && !message.isStreaming && (
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
              onClick={handleCopy}
              title="复制内容"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>

  );
}
