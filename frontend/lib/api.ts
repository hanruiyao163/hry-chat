/**
 * API 调用封装
 * 处理与后端的通信
 */
import type { ChatRequest, ChatChunk, ModelConfig, Message } from '@/types/chat';
import type { UserProfile, UserSettings } from '@/types/user';
import type {
  BatchDocumentOperationRequest,
  BatchDocumentOperationResponse,
  CreateKnowledgeBaseRequest,
  FetchKnowledgeDocumentsParams,
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeDocumentListResponse,
  PreviewDocumentResponse,
  UpdateKnowledgeBaseRequest,
  UpdateKnowledgeDocumentRequest,
  UpdateKnowledgeDocumentTagsRequest,
  UploadKnowledgeDocumentsResponse,
} from '@/types/knowledge-base';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * 获取用户资料
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/user/profile`);
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return response.json();
}

/**
 * 更新用户设置
 */
export async function updateUserSettings(settings: UserSettings): Promise<UserSettings> {
  const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error('Failed to update user settings');
  }
  return response.json();
}

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

/**
 * 获取知识库列表
 */
export async function fetchKnowledgeBases(): Promise<KnowledgeBase[]> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases`);
  if (!response.ok) {
    throw new Error('Failed to fetch knowledge bases');
  }
  return response.json();
}

/**
 * 创建知识库
 */
export async function createKnowledgeBase(payload: CreateKnowledgeBaseRequest): Promise<KnowledgeBase> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create knowledge base');
  }

  return response.json();
}

/**
 * 更新知识库
 */
export async function updateKnowledgeBase(kbId: string, payload: UpdateKnowledgeBaseRequest): Promise<KnowledgeBase> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update knowledge base');
  }

  return response.json();
}

/**
 * 删除知识库
 */
export async function deleteKnowledgeBase(kbId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete knowledge base');
  }
}

/**
 * 获取知识库内的文档
 */
export async function fetchKnowledgeDocuments(
  kbId: string,
  params: FetchKnowledgeDocumentsParams = {}
): Promise<KnowledgeDocumentListResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch knowledge documents');
  }
  return response.json();
}

/**
 * 上传文档到知识库
 */
export async function uploadKnowledgeDocuments(
  kbId: string,
  files: File[],
  conflictStrategy: 'rename' | 'replace' | 'cancel' = 'rename'
): Promise<UploadKnowledgeDocumentsResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/upload?conflict_strategy=${conflictStrategy}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload documents');
  }

  return response.json();
}

export async function updateKnowledgeDocument(
  kbId: string,
  documentId: string,
  payload: UpdateKnowledgeDocumentRequest
): Promise<KnowledgeDocument> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${documentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to update document');
  }
  return response.json();
}

export async function updateKnowledgeDocumentTags(
  kbId: string,
  documentId: string,
  payload: UpdateKnowledgeDocumentTagsRequest
): Promise<KnowledgeDocument> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${documentId}/tags`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to update document tags');
  }
  return response.json();
}

export async function deleteKnowledgeDocument(kbId: string, documentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${documentId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
}

export async function batchKnowledgeDocuments(
  kbId: string,
  payload: BatchDocumentOperationRequest
): Promise<BatchDocumentOperationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to batch operate documents');
  }
  return response.json();
}

export async function downloadKnowledgeDocument(kbId: string, documentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${documentId}/download`);
  if (!response.ok) {
    throw new Error('Failed to download document');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] || 'document';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function previewKnowledgeDocument(kbId: string, documentId: string): Promise<PreviewDocumentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${documentId}/preview`);
  if (!response.ok) {
    throw new Error('Failed to preview document');
  }
  return response.json();
}
