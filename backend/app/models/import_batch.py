import uuid

from sqlalchemy import Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.db import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    source_system = Column(String, nullable=False)
    source_file_name = Column(String, nullable=False)
    source_file_hash = Column(String, nullable=True)
    imported_by = Column(String, nullable=True)
    imported_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    row_count = Column(Integer, nullable=False)
    inserted_count = Column(Integer, nullable=False)
    duplicate_count = Column(Integer, nullable=False)
    error_count = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
