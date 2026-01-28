/**
 * 聊天相关的 TypeScript 类型定义
 */

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system';

/** 引用信息 */
export interface Citation {
  id: string;
  title: string;
  content: string;
  source?: string;
}

/** 单条消息 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  citations?: Citation[];
  isStreaming?: boolean;
}

/** 会话 */
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

/** 聊天请求 */
export interface ChatRequest {
  messages: {
    id: string;
    role: MessageRole;
    content: string;
    created_at: string;
  }[];
  conversation_id?: string;
  temperature?: number;
  max_tokens?: number;
}

/** 流式响应块 */
export interface ChatChunk {
  content: string;
  done: boolean;
  message_id?: string;
  citations?: Citation[];
}

/** 模型配置 */
export interface ModelConfig {
  provider: string;
  model: string;
  mock_mode: boolean;
  app_name: string;
}
