"""
知识库服务
负责知识库元数据管理与文档上传
"""

from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path
from typing import Iterable, Optional

import asyncpg
import boto3
from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.models.schemas import (
    BatchDocumentOperationRequest,
    KnowledgeBaseCreate,
    UpdateKnowledgeBaseRequest,
    UpdateKnowledgeDocumentRequest,
)

ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt", ".docx"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
SORT_BY_MAP = {
    "filename": "filename",
    "created_at": "created_at",
    "size_bytes": "size_bytes",
    "status": "is_enabled",
}


async def ensure_knowledge_base_schema(pool: asyncpg.Pool) -> None:
    """初始化知识库所需表结构"""
    ddl = """
    CREATE TABLE IF NOT EXISTS knowledge_bases (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS knowledge_documents (
        id TEXT PRIMARY KEY,
        knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT '',
        size_bytes BIGINT NOT NULL,
        storage_key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'uploaded',
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        uploaded_by TEXT NOT NULL DEFAULT 'current_user',
        source TEXT NOT NULL DEFAULT 'manual_upload',
        tags TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS knowledge_document_audit_logs (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        action TEXT NOT NULL,
        operator TEXT NOT NULL DEFAULT 'current_user',
        detail_json JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_knowledge_documents_kb_id
    ON knowledge_documents (knowledge_base_id);
    """
    async with pool.acquire() as conn:
        await conn.execute(ddl)
        # Backward-compatible schema upgrades for existing tables.
        await conn.execute("ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT TRUE")
        await conn.execute("ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS uploaded_by TEXT NOT NULL DEFAULT 'current_user'")
        await conn.execute("ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual_upload'")
        await conn.execute("ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'")


class KnowledgeBaseService:
    """知识库核心业务逻辑"""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=settings.ENDPOINT_URL,
            aws_access_key_id=settings.ACCESS_KEY_ID,
            aws_secret_access_key=settings.SECRET_ACCESS_KEY,
        )

    async def list_knowledge_bases(self) -> list[dict]:
        query = """
        SELECT
            kb.id,
            kb.name,
            kb.description,
            kb.created_at,
            kb.updated_at,
            COUNT(doc.id)::INT AS document_count
        FROM knowledge_bases kb
        LEFT JOIN knowledge_documents doc ON doc.knowledge_base_id = kb.id
        GROUP BY kb.id
        ORDER BY kb.updated_at DESC;
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query)
        return [dict(row) for row in rows]

    async def create_knowledge_base(self, payload: KnowledgeBaseCreate) -> dict:
        kb_id = str(uuid.uuid4())
        query = """
        INSERT INTO knowledge_bases (id, name, description)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, created_at, updated_at;
        """
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, kb_id, payload.name.strip(), payload.description.strip())
        except asyncpg.UniqueViolationError as exc:
            raise HTTPException(status_code=409, detail="知识库名称已存在") from exc

        data = dict(row)
        data["document_count"] = 0
        return data

    async def update_knowledge_base(self, knowledge_base_id: str, payload: UpdateKnowledgeBaseRequest) -> dict:
        await self._ensure_knowledge_base_exists(knowledge_base_id)
        
        # 获取当前信息
        async with self.pool.acquire() as conn:
            current = await conn.fetchrow("SELECT name, description FROM knowledge_bases WHERE id = $1", knowledge_base_id)
        
        name = payload.name.strip() if payload.name is not None else current["name"]
        description = payload.description.strip() if payload.description is not None else current["description"]

        query = """
        UPDATE knowledge_bases
        SET name = $1, description = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, description, created_at, updated_at;
        """
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, name, description, knowledge_base_id)
        except asyncpg.UniqueViolationError as exc:
            raise HTTPException(status_code=409, detail="知识库名称已存在") from exc
            
        # 获取文档计数
        count_query = "SELECT COUNT(*)::INT FROM knowledge_documents WHERE knowledge_base_id = $1"
        async with self.pool.acquire() as conn:
            count = await conn.fetchval(count_query, knowledge_base_id)
            
        data = dict(row)
        data["document_count"] = count
        return data

    async def delete_knowledge_base(self, knowledge_base_id: str) -> None:
        await self._ensure_knowledge_base_exists(knowledge_base_id)
        
        # 1. 获取所有文档的 storage_key
        query = "SELECT storage_key FROM knowledge_documents WHERE knowledge_base_id = $1"
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, knowledge_base_id)
        
        # 2. 从 S3 删除文件
        storage_keys = [row["storage_key"] for row in rows]
        if storage_keys:
            # S3 delete_objects 限制每次 1000 个
            objects = [{"Key": key} for key in storage_keys]
            # 分批处理，每批 1000
            for i in range(0, len(objects), 1000):
                batch = objects[i : i + 1000]
                await asyncio.to_thread(
                    self.s3_client.delete_objects,
                    Bucket=settings.BUCKET_NAME,
                    Delete={"Objects": batch},
                )

        # 3. 删除 DB 记录 (Cascade 会自动删除 documents)
        async with self.pool.acquire() as conn:
            await conn.execute("DELETE FROM knowledge_bases WHERE id = $1", knowledge_base_id)

    async def list_documents(
        self,
        knowledge_base_id: str,
        keyword: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        status: Optional[str] = None,
        file_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        await self._ensure_knowledge_base_exists(knowledge_base_id)
        sort_column = SORT_BY_MAP.get(sort_by, "created_at")
        order_clause = "ASC" if sort_order.lower() == "asc" else "DESC"
        offset = (max(page, 1) - 1) * max(page_size, 1)

        filters = ["knowledge_base_id = $1"]
        params: list[object] = [knowledge_base_id]
        param_index = 2

        if keyword:
            filters.append(f"(filename ILIKE ${param_index} OR content_type ILIKE ${param_index} OR array_to_string(tags, ',') ILIKE ${param_index})")
            params.append(f"%{keyword}%")
            param_index += 1
        if status == "enabled":
            filters.append("is_enabled = TRUE")
        if status == "disabled":
            filters.append("is_enabled = FALSE")
        if file_type:
            normalized_file_type = file_type.strip().lower().lstrip(".")
            if normalized_file_type:
                filters.append(
                    f"(LOWER(content_type) LIKE ${param_index} OR LOWER(filename) LIKE ${param_index + 1})"
                )
                params.append(f"%{normalized_file_type}%")
                params.append(f"%.{normalized_file_type}")
                param_index += 2

        where_clause = " AND ".join(filters)

        query = f"""
        SELECT
            id,
            knowledge_base_id,
            filename,
            content_type,
            size_bytes,
            status,
            is_enabled,
            uploaded_by,
            source,
            tags,
            created_at,
            updated_at
        FROM knowledge_documents
        WHERE {where_clause}
        ORDER BY {sort_column} {order_clause}
        OFFSET ${param_index}
        LIMIT ${param_index + 1};
        """
        count_query = f"SELECT COUNT(*)::INT FROM knowledge_documents WHERE {where_clause};"

        params_with_paging = [*params, offset, page_size]
        async with self.pool.acquire() as conn:
            total = await conn.fetchval(count_query, *params)
            rows = await conn.fetch(query, *params_with_paging)
        return {
            "items": [dict(row) for row in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def upload_documents(
        self,
        knowledge_base_id: str,
        files: Iterable[UploadFile],
        conflict_strategy: str = "rename",
    ) -> list[dict]:
        await self._ensure_knowledge_base_exists(knowledge_base_id)
        if conflict_strategy not in {"rename", "replace", "cancel"}:
            raise HTTPException(status_code=400, detail="不支持的冲突策略")
        uploaded: list[dict] = []

        for file in files:
            filename = _safe_filename(file.filename or "document")
            suffix = Path(filename).suffix.lower()
            if suffix not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"不支持的文件类型: {suffix}")

            existing = await self._get_document_by_filename(knowledge_base_id, filename)
            if existing:
                if conflict_strategy == "cancel":
                    raise HTTPException(status_code=409, detail=f"文件已存在: {filename}")
                if conflict_strategy == "rename":
                    filename = await self._resolve_renamed_filename(knowledge_base_id, filename)
                if conflict_strategy == "replace":
                    await self.delete_document(knowledge_base_id, existing["id"])

            content = await file.read()
            size = len(content)
            if size <= 0:
                raise HTTPException(status_code=400, detail=f"文件为空: {filename}")
            if size > MAX_FILE_SIZE_BYTES:
                raise HTTPException(status_code=400, detail=f"文件过大: {filename}")

            document_id = str(uuid.uuid4())
            storage_key = f"knowledge-bases/{knowledge_base_id}/{document_id}/{filename}"

            await asyncio.to_thread(
                self.s3_client.put_object,
                Bucket=settings.BUCKET_NAME,
                Key=storage_key,
                Body=content,
                ContentType=file.content_type or "application/octet-stream",
            )

            query = """
            INSERT INTO knowledge_documents (
                id,
                knowledge_base_id,
                filename,
                content_type,
                size_bytes,
                storage_key,
                status,
                is_enabled,
                uploaded_by,
                source,
                tags
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'uploaded', TRUE, 'current_user', 'manual_upload', '{}')
            RETURNING id, knowledge_base_id, filename, content_type, size_bytes, status, is_enabled, uploaded_by, source, tags, created_at, updated_at;
            """
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    query,
                    document_id,
                    knowledge_base_id,
                    filename,
                    file.content_type or "",
                    size,
                    storage_key,
                )
                await conn.execute(
                    "UPDATE knowledge_bases SET updated_at = NOW() WHERE id = $1",
                    knowledge_base_id,
                )
            uploaded.append(dict(row))

        return uploaded

    async def update_document(self, knowledge_base_id: str, document_id: str, payload: UpdateKnowledgeDocumentRequest) -> dict:
        document = await self._get_document_by_id(knowledge_base_id, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")

        filename = payload.filename.strip() if payload.filename else document["filename"]
        is_enabled = payload.is_enabled if payload.is_enabled is not None else document["is_enabled"]

        if payload.filename and payload.filename != document["filename"]:
            same_name_doc = await self._get_document_by_filename(knowledge_base_id, filename)
            if same_name_doc and same_name_doc["id"] != document_id:
                raise HTTPException(status_code=409, detail="文档名称已存在")

        query = """
        UPDATE knowledge_documents
        SET filename = $1, is_enabled = $2, updated_at = NOW()
        WHERE id = $3 AND knowledge_base_id = $4
        RETURNING id, knowledge_base_id, filename, content_type, size_bytes, status, is_enabled, uploaded_by, source, tags, created_at, updated_at;
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, filename, is_enabled, document_id, knowledge_base_id)
        await self._log_audit(document_id, "update", {"filename": filename, "is_enabled": is_enabled})
        return dict(row)

    async def update_document_tags(self, knowledge_base_id: str, document_id: str, tags: list[str]) -> dict:
        document = await self._get_document_by_id(knowledge_base_id, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")

        clean_tags = list(dict.fromkeys([tag.strip() for tag in tags if tag.strip()]))
        query = """
        UPDATE knowledge_documents
        SET tags = $1, updated_at = NOW()
        WHERE id = $2 AND knowledge_base_id = $3
        RETURNING id, knowledge_base_id, filename, content_type, size_bytes, status, is_enabled, uploaded_by, source, tags, created_at, updated_at;
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, clean_tags, document_id, knowledge_base_id)
        await self._log_audit(document_id, "tags", {"tags": clean_tags})
        return dict(row)

    async def delete_document(self, knowledge_base_id: str, document_id: str) -> None:
        document = await self._get_document_by_id(knowledge_base_id, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")

        await asyncio.to_thread(
            self.s3_client.delete_object,
            Bucket=settings.BUCKET_NAME,
            Key=document["storage_key"],
        )

        async with self.pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM knowledge_documents WHERE id = $1 AND knowledge_base_id = $2",
                document_id,
                knowledge_base_id,
            )
            await conn.execute("UPDATE knowledge_bases SET updated_at = NOW() WHERE id = $1", knowledge_base_id)
        await self._log_audit(document_id, "delete", {"filename": document["filename"]})

    async def batch_operate_documents(self, knowledge_base_id: str, payload: BatchDocumentOperationRequest) -> int:
        await self._ensure_knowledge_base_exists(knowledge_base_id)
        if not payload.document_ids:
            return 0

        operation = payload.operation
        if operation not in {"delete", "enable", "disable"}:
            raise HTTPException(status_code=400, detail="不支持的批量操作")

        affected = 0
        if operation == "delete":
            for doc_id in payload.document_ids:
                await self.delete_document(knowledge_base_id, doc_id)
                affected += 1
            return affected

        target_enabled = operation == "enable"
        query = """
        UPDATE knowledge_documents
        SET is_enabled = $1, updated_at = NOW()
        WHERE knowledge_base_id = $2 AND id = ANY($3::text[])
        """
        async with self.pool.acquire() as conn:
            result = await conn.execute(query, target_enabled, knowledge_base_id, payload.document_ids)
        affected = int(result.split(" ")[1]) if " " in result else 0
        for doc_id in payload.document_ids:
            await self._log_audit(doc_id, operation, {"is_enabled": target_enabled})
        return affected

    async def get_document_download(self, knowledge_base_id: str, document_id: str) -> dict:
        document = await self._get_document_by_id(knowledge_base_id, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")

        obj = await asyncio.to_thread(
            self.s3_client.get_object,
            Bucket=settings.BUCKET_NAME,
            Key=document["storage_key"],
        )
        body = await asyncio.to_thread(obj["Body"].read)
        return {
            "filename": document["filename"],
            "content_type": document["content_type"] or "application/octet-stream",
            "body": body,
        }

    async def get_document_preview(self, knowledge_base_id: str, document_id: str) -> str:
        document = await self._get_document_by_id(knowledge_base_id, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")

        suffix = Path(document["filename"]).suffix.lower()
        if suffix not in {".md", ".txt"}:
            raise HTTPException(status_code=400, detail="仅支持 txt/md 预览")

        obj = await asyncio.to_thread(
            self.s3_client.get_object,
            Bucket=settings.BUCKET_NAME,
            Key=document["storage_key"],
        )
        body = await asyncio.to_thread(obj["Body"].read)
        try:
            return body.decode("utf-8")
        except UnicodeDecodeError:
            return body.decode("utf-8", errors="ignore")

    async def _ensure_knowledge_base_exists(self, knowledge_base_id: str) -> None:
        async with self.pool.acquire() as conn:
            exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM knowledge_bases WHERE id = $1)",
                knowledge_base_id,
            )
        if not exists:
            raise HTTPException(status_code=404, detail="知识库不存在")

    async def _get_document_by_id(self, knowledge_base_id: str, document_id: str) -> Optional[dict]:
        query = """
        SELECT id, knowledge_base_id, filename, content_type, size_bytes, storage_key, status, is_enabled, uploaded_by, source, tags, created_at, updated_at
        FROM knowledge_documents
        WHERE knowledge_base_id = $1 AND id = $2;
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, knowledge_base_id, document_id)
        return dict(row) if row else None

    async def _get_document_by_filename(self, knowledge_base_id: str, filename: str) -> Optional[dict]:
        query = """
        SELECT id, knowledge_base_id, filename, content_type, size_bytes, storage_key, status, is_enabled, uploaded_by, source, tags, created_at, updated_at
        FROM knowledge_documents
        WHERE knowledge_base_id = $1 AND filename = $2;
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, knowledge_base_id, filename)
        return dict(row) if row else None

    async def _resolve_renamed_filename(self, knowledge_base_id: str, filename: str) -> str:
        base = Path(filename).stem
        suffix = Path(filename).suffix
        candidate = filename
        index = 1
        while await self._get_document_by_filename(knowledge_base_id, candidate):
            candidate = f"{base} ({index}){suffix}"
            index += 1
        return candidate

    async def _log_audit(self, document_id: str, action: str, detail: dict) -> None:
        query = """
        INSERT INTO knowledge_document_audit_logs (id, document_id, action, operator, detail_json)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        """
        async with self.pool.acquire() as conn:
            await conn.execute(query, str(uuid.uuid4()), document_id, action, "current_user", json.dumps(detail))


def _safe_filename(filename: str) -> str:
    return Path(filename).name.replace("/", "_").replace("\\", "_")
