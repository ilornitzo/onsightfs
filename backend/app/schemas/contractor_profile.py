from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ContractorProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | None = None
    contractor_id: UUID
    dob: date | None = None
    ssn_or_ein: str | None = None
    address: str | None = None
    aspen_grove_abc_number: str | None = None
    bank_name: str | None = None
    bank_account_type: str | None = None
    bank_routing_number: str | None = None
    bank_account_number: str | None = None
    counties: list[str] | None = None
    expected_pay_per_inspection: Decimal | None = None
    min_daily_volume: int | None = None
    ic_acknowledged: bool = False
    signature_name: str | None = None
    signature_date: date | None = None


class ContractorProfileUpsert(BaseModel):
    dob: date | None = None
    ssn_or_ein: str | None = None
    address: str | None = None
    aspen_grove_abc_number: str | None = None
    bank_name: str | None = None
    bank_account_type: str | None = None
    bank_routing_number: str | None = None
    bank_account_number: str | None = None
    counties: list[str] | None = None
    expected_pay_per_inspection: Decimal | None = None
    min_daily_volume: int | None = None
    ic_acknowledged: bool | None = None
    signature_name: str | None = None
    signature_date: date | None = None
