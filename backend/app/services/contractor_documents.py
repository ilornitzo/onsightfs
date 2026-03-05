from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.contractor import Contractor
from app.models.document import Document
from app.models.enums import DocumentType


def _normalize_document_type(value: str) -> DocumentType:
    normalized = (value or "").strip().lower()
    if normalized == "id":
        return DocumentType.id
    if normalized == "w9":
        return DocumentType.w9
    raise ValueError("invalid document_type; allowed: id, w9")


def _sanitize_file_name(name: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return safe or "upload.bin"


def _upload_root() -> Path:
    # backend/uploads
    return Path(__file__).resolve().parents[2] / "uploads"


def save_contractor_document(
    db: Session,
    contractor_id: UUID,
    document_type: str,
    file_name: str,
    mime_type: str | None,
    file_bytes: bytes,
) -> dict[str, str | None]:
    contractor = db.execute(select(Contractor).where(Contractor.id == contractor_id)).scalar_one_or_none()
    if contractor is None:
        raise ValueError("contractor not found")

    if not file_bytes:
        raise ValueError("file is empty")

    doc_type = _normalize_document_type(document_type)
    safe_name = _sanitize_file_name(file_name)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    final_name = f"{timestamp}_{safe_name}"

    doc_dir = _upload_root() / "contractors" / str(contractor_id) / doc_type.value
    doc_dir.mkdir(parents=True, exist_ok=True)
    full_path = doc_dir / final_name
    full_path.write_bytes(file_bytes)

    document = Document(
        contractor_id=contractor_id,
        document_type=doc_type,
        file_name=safe_name,
        mime_type=mime_type,
        storage_path=str(full_path),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return {
        "id": str(document.id),
        "document_type": document.document_type.value,
        "file_name": document.file_name,
        "created_at": document.created_at.isoformat() if document.created_at else None,
    }


def list_contractor_documents(db: Session, contractor_id: UUID) -> list[dict[str, str | None]]:
    contractor = db.execute(select(Contractor).where(Contractor.id == contractor_id)).scalar_one_or_none()
    if contractor is None:
        raise ValueError("contractor not found")

    docs = db.execute(
        select(Document)
        .where(Document.contractor_id == contractor_id)
        .order_by(Document.created_at.desc())
    ).scalars().all()

    return [
        {
            "id": str(doc.id),
            "document_type": doc.document_type.value,
            "file_name": doc.file_name,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc in docs
    ]


def download_document_file(db: Session, document_id: UUID) -> tuple[str, str, str | None]:
    doc = db.execute(select(Document).where(Document.id == document_id)).scalar_one_or_none()
    if doc is None:
        raise ValueError("document not found")

    path = Path(doc.storage_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError("document file not found")

    return str(path), doc.file_name, doc.mime_type
