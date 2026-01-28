'use client';

/**
 * 聊天输入框组件 - 悬浮设计
 * 
 * 优化点：
 * - 增加更深的阴影，营造悬浮感
 * - 增加 Backdrop Blur 效果
 * - 优化输入体验
 */
import { useRef, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Send, Loader2, Paperclip, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  inputValueAtom,
  isLoadingAtom,
  currentConversationIdAtom,
  createConversationAtom,
  addMessageAtom,
  streamingMessageAtom,
  updateStreamingMessageAtom,
} from '@/lib/atoms';
import { sendChatMessage } from '@/lib/api';
import type { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  messages: Message[];
}

export function ChatInput({ messages }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useAtom(inputValueAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [currentId] = useAtom(currentConversationIdAtom);
  const createConversation = useSetAtom(createConversationAtom);
  const addMessage = useSetAtom(addMessageAtom);
  const setStreamingMessage = useSetAtom(streamingMessageAtom);
  const updateStreamingMessage = useSetAtom(updateStreamingMessageAtom);

  // 自动聚焦
  useEffect(() => {
    if (!isLoading && currentId) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentId, isLoading]);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // 重置高度
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isLoading) return;

    let conversationId = currentId;
    if (!conversationId) {
      const newConv = createConversation();
      conversationId = newConv.id;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date(),
    };

    addMessage(userMessage);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    setIsLoading(true);

    const aiMessageId = crypto.randomUUID();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      isStreaming: true,
    };
    setStreamingMessage(aiMessage);

    const allMessages = [...messages, userMessage];
    
    await sendChatMessage(
      allMessages,
      (content) => {
        updateStreamingMessage(content, false);
      },
      (messageId, citations) => {
        setStreamingMessage((prev) => {
          if (prev) {
            updateStreamingMessage(prev.content, true, citations);
          }
          return null;
        });
        setIsLoading(false);
      },
      (error) => {
        console.error('Chat error:', error);
        updateStreamingMessage(`抱歉，发生了错误：${error.message}`, true);
        setIsLoading(false);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-0">
      {/* 悬浮容器 */}
      <div className={cn(
        "relative flex items-end w-full p-2 bg-background/80 backdrop-blur-md border border-border/50 rounded-[26px] shadow-lg shadow-black/5 transition-all duration-300",
        "focus-within:shadow-xl focus-within:border-primary/20 focus-within:ring-1 focus-within:ring-primary/20",
        isLoading && "opacity-80 cursor-not-allowed"
      )}>
        {/* 左侧工具栏 */}
        <div className="flex items-center gap-1 pl-1 pb-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="上传文件 (Coming soon)"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>

        {/* 输入框 */}
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="给 HRY Chat 发送消息..."
          className="flex-1 min-h-[40px] max-h-[200px] bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none py-2.5 px-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/50"
          disabled={isLoading}
          rows={1}
        />

        {/* 右侧发送按钮 */}
        <div className="flex items-center gap-1 pr-1 pb-1">
          {/* 语音输入预留 */}
          {!inputValue && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}

          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full transition-all duration-200 shadow-sm",
              inputValue.trim() 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 ml-0.5" />
            )}
          </Button>
        </div>
      </div>
      
      {/* 底部提示语 */}
      <div className="text-center mt-3">
        <p className="text-[10px] text-muted-foreground/40 font-medium tracking-wide">
          HRY CHAT 可能会生成不准确的信息，请核实重要内容。
        </p>
      </div>
    </div>
  );
}
