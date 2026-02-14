from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.knowledge_base import get_knowledge_base_service, router


class FakeKnowledgeBaseService:
    async def list_knowledge_bases(self):
        return [
            {
                "id": "kb-1",
                "name": "产品文档",
                "description": "PRD and specs",
                "document_count": 2,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        ]

    async def create_knowledge_base(self, payload):
        return {
            "id": "kb-2",
            "name": payload.name,
            "description": payload.description,
            "document_count": 0,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }

    async def update_knowledge_base(self, knowledge_base_id: str, payload):
        return {
            "id": knowledge_base_id,
            "name": payload.name or "old",
            "description": payload.description or "old",
            "document_count": 0,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }

    async def delete_knowledge_base(self, knowledge_base_id: str):
        return None

    def _doc(self, knowledge_base_id: str, filename: str = "intro.md", doc_id: str = "doc-1"):
        return {
            "id": doc_id,
            "knowledge_base_id": knowledge_base_id,
            "filename": filename,
            "content_type": "text/markdown",
            "size_bytes": 128,
            "status": "uploaded",
            "is_enabled": True,
            "uploaded_by": "current_user",
            "source": "manual_upload",
            "tags": ["intro"],
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }

    async def list_documents(self, knowledge_base_id: str, keyword=None, sort_by="created_at", sort_order="desc", status=None, file_type=None, page=1, page_size=20):
        return {
            "items": [self._doc(knowledge_base_id)],
            "total": 1,
            "page": page,
            "page_size": page_size,
        }

    async def upload_documents(self, knowledge_base_id: str, files, conflict_strategy="rename"):
        return [
            self._doc(knowledge_base_id, files[0].filename, "doc-2")
        ]

    async def update_document(self, knowledge_base_id: str, document_id: str, payload):
        filename = payload.filename if payload.filename else "intro.md"
        return self._doc(knowledge_base_id, filename, document_id)

    async def update_document_tags(self, knowledge_base_id: str, document_id: str, tags):
        doc = self._doc(knowledge_base_id, "intro.md", document_id)
        doc["tags"] = tags
        return doc

    async def delete_document(self, knowledge_base_id: str, document_id: str):
        return None

    async def batch_operate_documents(self, knowledge_base_id: str, payload):
        return len(payload.document_ids)

    async def get_document_download(self, knowledge_base_id: str, document_id: str):
        return {
            "filename": "hello.md",
            "content_type": "text/markdown",
            "body": b"# hello",
        }

    async def get_document_preview(self, knowledge_base_id: str, document_id: str):
        return "# preview"


def create_test_client() -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api")
    app.dependency_overrides[get_knowledge_base_service] = lambda: FakeKnowledgeBaseService()
    return TestClient(app)


def test_list_knowledge_bases():
    client = create_test_client()
    response = client.get("/api/knowledge-bases")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "产品文档"


def test_create_knowledge_base():
    client = create_test_client()
    response = client.post(
        "/api/knowledge-bases",
        json={"name": "新知识库", "description": "test"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "新知识库"
    assert data["document_count"] == 0


def test_update_knowledge_base():
    client = create_test_client()
    response = client.patch(
        "/api/knowledge-bases/kb-1",
        json={"name": "newName", "description": "newDesc"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "newName"


def test_delete_knowledge_base():
    client = create_test_client()
    response = client.delete("/api/knowledge-bases/kb-1")
    assert response.status_code == 200


def test_list_documents():
    client = create_test_client()
    response = client.get("/api/knowledge-bases/kb-1/documents")
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["knowledge_base_id"] == "kb-1"
    assert data["total"] == 1


def test_upload_documents():
    client = create_test_client()
    files = [
        ("files", ("hello.md", b"# hello world", "text/markdown")),
    ]
    response = client.post("/api/knowledge-bases/kb-1/documents/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert len(data["uploaded"]) == 1
    assert data["uploaded"][0]["filename"] == "hello.md"


def test_update_document():
    client = create_test_client()
    response = client.patch(
        "/api/knowledge-bases/kb-1/documents/doc-1",
        json={"filename": "rename.md"},
    )
    assert response.status_code == 200
    assert response.json()["filename"] == "rename.md"


def test_update_document_tags():
    client = create_test_client()
    response = client.patch(
        "/api/knowledge-bases/kb-1/documents/doc-1/tags",
        json={"tags": ["a", "b"]},
    )
    assert response.status_code == 200
    assert response.json()["tags"] == ["a", "b"]


def test_batch_documents():
    client = create_test_client()
    response = client.post(
        "/api/knowledge-bases/kb-1/documents/batch",
        json={"operation": "disable", "document_ids": ["doc-1", "doc-2"]},
    )
    assert response.status_code == 200
    assert response.json()["affected"] == 2


def test_delete_document():
    client = create_test_client()
    response = client.delete("/api/knowledge-bases/kb-1/documents/doc-1")
    assert response.status_code == 200


def test_download_document():
    client = create_test_client()
    response = client.get("/api/knowledge-bases/kb-1/documents/doc-1/download")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")


def test_preview_document():
    client = create_test_client()
    response = client.get("/api/knowledge-bases/kb-1/documents/doc-1/preview")
    assert response.status_code == 200
    assert "preview" in response.json()["content"]
