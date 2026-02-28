from pydantic import BaseModel


class ImportOrderRowError(BaseModel):
    row: int
    order_uid: str | None = None
    message: str


class ImportOrdersResponse(BaseModel):
    import_batch_id: str
    row_count: int
    inserted_count: int
    duplicate_count: int
    error_count: int
    errors: list[ImportOrderRowError]
