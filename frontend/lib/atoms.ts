/**
 * Jotai 原子状态管理
 * 管理会话、消息和配置状态
 */
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Conversation, Message, ModelConfig, Citation } from '@/types/chat';

// ============ 会话相关 ============

/** 会话列表（持久化到 localStorage） */
export const conversationsAtom = atomWithStorage<Conversation[]>('hry-chat-conversations', []);

/** 当前选中的会话 ID */
export const currentConversationIdAtom = atomWithStorage<string | null>('hry-chat-current-id', null);

/** 派生原子：当前会话 */
export const currentConversationAtom = atom((get) => {
  const conversations = get(conversationsAtom);
  const currentId = get(currentConversationIdAtom);
  return conversations.find(c => c.id === currentId) ?? null;
});

/** 派生原子：当前会话的消息列表 */
export const currentMessagesAtom = atom((get) => {
  const conversation = get(currentConversationAtom);
  return conversation?.messages ?? [];
});

// ============ 输入相关 ============

/** 输入框内容 */
export const inputValueAtom = atom<string>('');

/** 是否正在发送/等待响应 */
export const isLoadingAtom = atom<boolean>(false);

/** 当前流式消息（AI 正在回复时） */
export const streamingMessageAtom = atom<Message | null>(null);

// ============ UI 状态 ============

/** 侧边栏是否展开 */
export const sidebarOpenAtom = atomWithStorage<boolean>('hry-chat-sidebar-open', true);

/** 滚动指令：设置后 MessageList 会滚动到该消息 ID，然后清空 */
export const scrollToMessageIdAtom = atom<string | null>(null);

/** 
 * 滚动状态管理
 * - userInterrupted: 用户是否手动滚动打断了自动滚动
 * - anchorMessageId: 需要保持在视口顶部的消息 ID（用户刚发送的消息）
 */
export const scrollStateAtom = atom<{
  userInterrupted: boolean;
  anchorMessageId: string | null;
}>({
  userInterrupted: false,
  anchorMessageId: null,
});

// ============ 配置相关 ============

/** 模型配置（从后端获取） */
export const modelConfigAtom = atom<ModelConfig | null>(null);

// ============ 引用数据 ============

/** 当前可用的引用数据（用于 tooltip 显示） */
export const citationsMapAtom = atom<Record<string, Citation>>({});

// ============ 操作函数（写入原子） ============

/** 创建新会话 */
export const createConversationAtom = atom(
  null,
  (get, set) => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: '新对话',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const conversations = get(conversationsAtom);
    set(conversationsAtom, [newConversation, ...conversations]);
    set(currentConversationIdAtom, newConversation.id);
    
    return newConversation;
  }
);

/** 删除会话 */
export const deleteConversationAtom = atom(
  null,
  (get, set, conversationId: string) => {
    const conversations = get(conversationsAtom);
    const filtered = conversations.filter(c => c.id !== conversationId);
    set(conversationsAtom, filtered);
    
    // 如果删除的是当前会话，切换到第一个
    const currentId = get(currentConversationIdAtom);
    if (currentId === conversationId) {
      set(currentConversationIdAtom, filtered[0]?.id ?? null);
    }
  }
);

/** 添加消息到当前会话 */
export const addMessageAtom = atom(
  null,
  (get, set, message: Message) => {
    const conversations = get(conversationsAtom);
    const currentId = get(currentConversationIdAtom);
    
    if (!currentId) return;
    
    const updated = conversations.map(conv => {
      if (conv.id === currentId) {
        // 更新会话标题（如果是第一条用户消息）
        let title = conv.title;
        if (conv.messages.length === 0 && message.role === 'user') {
          title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
        }
        
        return {
          ...conv,
          title,
          messages: [...conv.messages, message],
          updatedAt: new Date(),
        };
      }
      return conv;
    });
    
    set(conversationsAtom, updated);
  }
);

/** 更新流式消息（AI 回复时实时更新） */
export const updateStreamingMessageAtom = atom(
  null,
  (get, set, content: string, done: boolean, citations?: Citation[]) => {
    const streaming = get(streamingMessageAtom);
    
    if (!streaming) return;
    
    if (done) {
      // 完成时，将流式消息添加到会话并清空
      const finalMessage: Message = {
        ...streaming,
        content,
        isStreaming: false,
        citations,
      };
      
      set(addMessageAtom, finalMessage);
      set(streamingMessageAtom, null);
      
      // 更新引用数据
      if (citations) {
        const citationsMap = get(citationsMapAtom);
        const newMap = { ...citationsMap };
        citations.forEach(c => {
          newMap[c.id] = c;
        });
        set(citationsMapAtom, newMap);
      }
    } else {
      // 更新流式内容
      set(streamingMessageAtom, {
        ...streaming,
        content,
      });
    }
  }
);
