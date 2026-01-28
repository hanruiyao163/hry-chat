'use client';

/**
 * 消息列表组件
 * 负责渲染消息流，自动滚动
 */
import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { MessageItem } from './message-item';
import { streamingMessageAtom } from '@/lib/atoms';
import type { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [streamingMessage] = useAtom(streamingMessageAtom);

  const allMessages = streamingMessage 
    ? [...messages, streamingMessage]
    : messages;

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length, streamingMessage?.content]);

  if (allMessages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold mb-2">有什么可以帮你的吗？</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          支持 Markdown 渲染、引用标注和流式响应。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-6">
      {/* 调整容器宽度，使其更宽 */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6">
        {allMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {/* 滚动锚点 */}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
