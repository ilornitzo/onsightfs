from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ClientCreate(BaseModel):
    name: str
    external_ref: str | None = None
    active: bool | None = True


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    external_ref: str | None = None
    active: bool


class ContractorPayRateCreate(BaseModel):
    contractor_id: UUID
    client_id: UUID
    state: str | None = None
    county: str | None = None
    city: str | None = None
    amount: Decimal
    priority: int = 100
    active: bool = True


class ContractorPayRateUpdate(BaseModel):
    contractor_id: UUID | None = None
    client_id: UUID | None = None
    state: str | None = None
    county: str | None = None
    city: str | None = None
    amount: Decimal | None = None
    priority: int | None = None
    active: bool | None = None


class ContractorPayRateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    contractor_id: UUID
    client_id: UUID
    state: str | None = None
    county: str | None = None
    city: str | None = None
    amount: Decimal
    priority: int
    active: bool


class RecalculatePayRequest(BaseModel):
    client: str | None = None
    contractor: str | None = None
    county: str | None = None
    state: str | None = None
    city: str | None = None
    submitted_from: date | None = None
    submitted_to: date | None = None
    only_unpaid: bool = True


class RecalculatePayResponse(BaseModel):
    updated: int
    missing_rate: int
    conflicts: int
