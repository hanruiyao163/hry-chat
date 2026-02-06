'use client';

/**
 * 聊天窗口容器
 * 布局结构：
 * - 中间：可滚动消息区域 (flex-1, overflow-hidden)
 * - 底部：固定输入框 (shrink-0)
 */
import { useAtom } from 'jotai';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { currentMessagesAtom } from '@/lib/atoms';

export function ChatWindow() {
  const [messages] = useAtom(currentMessagesAtom);

  return (
    <div className="flex flex-col h-full w-full relative bg-white dark:bg-zinc-950 overflow-hidden">
      {/* 消息滚动区域 */}
      <div className="flex-1 overflow-hidden relative w-full flex flex-col">
        <MessageList messages={messages} />
      </div>

      {/* 底部输入框区域 */}
      <div className="shrink-0 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 p-4 pb-6 z-10">
        <ChatInput messages={messages} />
      </div>
    </div>
  );
}
