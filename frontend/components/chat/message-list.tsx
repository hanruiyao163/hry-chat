'use client';

/**
 * 消息列表组件
 * 负责渲染消息流
 * 
 * 滚动行为：
 * - 用户发送消息后，用户消息滚动到视口顶部
 * - 流式输出时自动滚动到底部，跟随内容更新
 */
import { useLayoutEffect, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import { MessageItem } from './message-item';
import { streamingMessageAtom, scrollToMessageIdAtom } from '@/lib/atoms';
import type { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [streamingMessage] = useAtom(streamingMessageAtom);
  const [scrollToId, setScrollToId] = useAtom(scrollToMessageIdAtom);
  const lastStreamingContentRef = useRef<string>('');
  const shouldAutoScrollRef = useRef<boolean>(true);
  const rafIdRef = useRef<number | null>(null);

  const allMessages = streamingMessage 
    ? [...messages, streamingMessage]
    : messages;

  // 用于检测消息列表变化
  const messagesLength = messages.length;

  // 滚动到底部的辅助函数
  const scrollToBottom = useCallback((smooth: boolean = false) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const targetScrollTop = container.scrollHeight - container.clientHeight;
      if (smooth) {
        container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      } else {
        // 直接赋值避免频繁 smooth 造成卡顿
        container.scrollTop = targetScrollTop;
      }
    });
  }, []);

  // 检测用户是否手动滚动
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 距离底部 120px 内视为可自动跟随
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    shouldAutoScrollRef.current = isNearBottom;
  }, []);

  // 用户发送消息后，将用户消息滚动到视口顶部
  useLayoutEffect(() => {
    if (!scrollToId) return;

    const tryScroll = () => {
      const element = document.getElementById(`msg-${scrollToId}`);
      if (element && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top;
        const target = container.scrollTop + relativeTop;
        container.scrollTo({ top: Math.max(target, 0), behavior: 'auto' });
        setScrollToId(null);
        return true;
      }
      return false;
    };

    // 先尝试立即滚动
    if (tryScroll()) return;

    // 如果元素还不存在，延迟重试
    const timer = setTimeout(tryScroll, 50);
    return () => clearTimeout(timer);
  }, [scrollToId, setScrollToId, messagesLength]);

  // 流式输出时自动滚动到底部
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 如果流式消息不存在，重置状态
    if (!streamingMessage) {
      // 如果之前有流式消息，现在完成了，确保滚动到底部
      if (lastStreamingContentRef.current) {
        lastStreamingContentRef.current = '';
        // 流式消息完成时，滚动到底部（使用平滑滚动）
        requestAnimationFrame(() => {
          scrollToBottom(true);
        });
      }
      return;
    }

    // 检测内容是否更新
    const contentChanged = streamingMessage.content !== lastStreamingContentRef.current;
    const isNewMessage = lastStreamingContentRef.current === '';
    
    if (!contentChanged && !isNewMessage) return;

    lastStreamingContentRef.current = streamingMessage.content;

    // 用户不在底部时不自动滚动，避免打断阅读
    if (!shouldAutoScrollRef.current && !isNewMessage) return;

    scrollToBottom(false);
  }, [streamingMessage?.content, streamingMessage?.id, scrollToBottom]);

  // 添加滚动事件监听
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleScroll]);

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
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto w-full h-full p-4 scroll-anchor-none"
    >
      <div className="flex flex-col py-2">
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6">
          {allMessages.map((message) => (
            <div key={message.id} id={`msg-${message.id}`}>
              <MessageItem message={message} />
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
