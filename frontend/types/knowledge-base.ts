/**
 * 知识库模块类型定义
 */

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledge_base_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: 'uploaded' | 'indexed';
  is_enabled: boolean;
  uploaded_by: string;
  source: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
}

export interface UpdateKnowledgeBaseRequest {
  name?: string;
  description?: string;
}

export interface UploadKnowledgeDocumentsResponse {
  uploaded: KnowledgeDocument[];
}

export interface KnowledgeDocumentListResponse {
  items: KnowledgeDocument[];
  total: number;
  page: number;
  page_size: number;
}

export interface FetchKnowledgeDocumentsParams {
  keyword?: string;
  sort_by?: 'filename' | 'created_at' | 'size_bytes' | 'status';
  sort_order?: 'asc' | 'desc';
  status?: 'enabled' | 'disabled';
  file_type?: string;
  page?: number;
  page_size?: number;
}

export interface UpdateKnowledgeDocumentRequest {
  filename?: string;
  is_enabled?: boolean;
}

export interface BatchDocumentOperationRequest {
  operation: 'delete' | 'enable' | 'disable';
  document_ids: string[];
}

export interface BatchDocumentOperationResponse {
  affected: number;
}

export interface UpdateKnowledgeDocumentTagsRequest {
  tags: string[];
}

export interface PreviewDocumentResponse {
  content: string;
}
