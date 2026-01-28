/**
 * API 调用封装
 * 处理与后端的通信
 */
import type { ChatRequest, ChatChunk, ModelConfig, Message } from '@/types/chat';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * 获取模型配置
 */
export async function fetchModelConfig(): Promise<ModelConfig> {
  const response = await fetch(`${API_BASE_URL}/api/config`);
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  return response.json();
}

/**
 * 发送聊天消息（流式响应）
 * @param messages 消息历史
 * @param onChunk 每收到一个块时的回调
 * @param onComplete 完成时的回调
 * @param onError 错误时的回调
 */
export async function sendChatMessage(
  messages: Message[],
  onChunk: (content: string) => void,
  onComplete: (messageId: string, citations?: ChatChunk['citations']) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const request: ChatRequest = {
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: new Date(m.createdAt).toISOString(),
      })),
    };

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // 处理 SSE 数据
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留未完成的行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr.trim()) {
            try {
              const chunk: ChatChunk = JSON.parse(jsonStr);
              
              if (chunk.done) {
                onComplete(chunk.message_id || '', chunk.citations);
              } else {
                fullContent += chunk.content;
                onChunk(fullContent);
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 发送聊天消息（非流式，一次性返回）
 */
export async function sendChatMessageComplete(messages: Message[]): Promise<Message> {
  const request: ChatRequest = {
    messages: messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: new Date(m.createdAt).toISOString(),
    })),
  };

  const response = await fetch(`${API_BASE_URL}/api/chat/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    role: data.role,
    content: data.content,
    createdAt: new Date(data.created_at),
    citations: data.citations,
  };
}
