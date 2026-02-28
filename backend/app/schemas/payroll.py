from datetime import date

from pydantic import BaseModel


class CreatePayrollBatchesRequest(BaseModel):
    client: str | None = None
    contractor: str | None = None
    county: str | None = None
    state: str | None = None
    city: str | None = None
    submitted_from: date | None = None
    submitted_to: date | None = None
    only_unpaid: bool = True


class PayrollBatchContractorSummary(BaseModel):
    contractor_id: str
    contractor_name: str
    order_count: int
    total_pay: str


class CreatePayrollBatchesResponse(BaseModel):
    batches_created: int
    total_orders: int
    contractors: list[PayrollBatchContractorSummary]
