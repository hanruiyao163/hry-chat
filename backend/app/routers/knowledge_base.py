"""
知识库路由
"""

from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, File, Query, Response, UploadFile

from app.core.db import get_db_pool
from app.models.schemas import (
    BatchDocumentOperationRequest,
    BatchDocumentOperationResponse,
    KnowledgeBaseCreate,
    KnowledgeDocumentListResponse,
    KnowledgeBaseResponse,
    KnowledgeDocumentResponse,
    PreviewDocumentResponse,
    UpdateKnowledgeBaseRequest,
    UpdateKnowledgeDocumentRequest,
    UpdateKnowledgeDocumentTagsRequest,
    UploadKnowledgeDocumentsResponse,
)
from app.services.knowledge_base_service import KnowledgeBaseService

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])


def get_knowledge_base_service(pool: asyncpg.Pool = Depends(get_db_pool)) -> KnowledgeBaseService:
    return KnowledgeBaseService(pool)


@router.get("", response_model=list[KnowledgeBaseResponse])
async def list_knowledge_bases(
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    return await service.list_knowledge_bases()


@router.post("", response_model=KnowledgeBaseResponse)
async def create_knowledge_base(
    payload: KnowledgeBaseCreate,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    return await service.create_knowledge_base(payload)


@router.patch("/{knowledge_base_id}", response_model=KnowledgeBaseResponse)
async def update_knowledge_base(
    knowledge_base_id: str,
    payload: UpdateKnowledgeBaseRequest,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    return await service.update_knowledge_base(knowledge_base_id, payload)


@router.delete("/{knowledge_base_id}")
async def delete_knowledge_base(
    knowledge_base_id: str,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    await service.delete_knowledge_base(knowledge_base_id)
    return {"message": "删除成功"}


@router.get("/{knowledge_base_id}/documents", response_model=KnowledgeDocumentListResponse)
async def list_documents(
    knowledge_base_id: str,
    keyword: str | None = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    status: str | None = Query(default=None),
    file_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    return await service.list_documents(knowledge_base_id, keyword, sort_by, sort_order, status, file_type, page, page_size)


@router.post("/{knowledge_base_id}/documents/upload", response_model=UploadKnowledgeDocumentsResponse)
async def upload_documents(
    knowledge_base_id: str,
    files: list[UploadFile] = File(...),
    conflict_strategy: str = Query(default="rename"),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    uploaded = await service.upload_documents(knowledge_base_id, files, conflict_strategy)
    return UploadKnowledgeDocumentsResponse(uploaded=uploaded)


@router.patch("/{knowledge_base_id}/documents/{document_id}", response_model=KnowledgeDocumentResponse)
async def update_document(
    knowledge_base_id: str,
    document_id: str,
    payload: UpdateKnowledgeDocumentRequest,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    return await service.update_document(knowledge_base_id, document_id, payload)


@router.patch("/{knowledge_base_id}/documents/{document_id}/tags", response_model=KnowledgeDocumentResponse)
async def update_document_tags(
    knowledge_base_id: str,
    document_id: str,
    payload: UpdateKnowledgeDocumentTagsRequest,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    return await service.update_document_tags(knowledge_base_id, document_id, payload.tags)


@router.delete("/{knowledge_base_id}/documents/{document_id}")
async def delete_document(
    knowledge_base_id: str,
    document_id: str,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    await service.delete_document(knowledge_base_id, document_id)
    return {"message": "删除成功"}


@router.post("/{knowledge_base_id}/documents/batch", response_model=BatchDocumentOperationResponse)
async def batch_documents(
    knowledge_base_id: str,
    payload: BatchDocumentOperationRequest,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    affected = await service.batch_operate_documents(knowledge_base_id, payload)
    return BatchDocumentOperationResponse(affected=affected)


@router.get("/{knowledge_base_id}/documents/{document_id}/download")
async def download_document(
    knowledge_base_id: str,
    document_id: str,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    data = await service.get_document_download(knowledge_base_id, document_id)
    return Response(
        content=data["body"],
        media_type=data["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{data["filename"]}"'},
    )


@router.get("/{knowledge_base_id}/documents/{document_id}/preview", response_model=PreviewDocumentResponse)
async def preview_document(
    knowledge_base_id: str,
    document_id: str,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    content = await service.get_document_preview(knowledge_base_id, document_id)
    return PreviewDocumentResponse(content=content)
