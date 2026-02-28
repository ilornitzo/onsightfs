from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class OrderRow(BaseModel):
    contractor_name_raw: str | None = None
    client_name_raw: str | None = None
    county: str | None = None
    city: str | None = None
    address: str | None = None
    zip: str | None = None
    client_pay_amount: Decimal | None = None
    contractor_pay_amount: Decimal | None = None
    submitted_to_client_at: datetime | None = None
    due_date: date | None = None
    id: str
    order_uid: str
    order_number: str | None = None
    missing_paid_out_rate: bool
    conflicting_paid_out_rate: bool
    missing_paid_in_rate: bool
    conflicting_paid_in_rate: bool
    paid_out_status: str
    billed_status: str


class OrdersListResponse(BaseModel):
    count: int
    results: list[OrderRow]


class OrdersSummaryResponse(BaseModel):
    count: int
    paid_in_total: Decimal
    paid_out_total: Decimal
    margin_total: Decimal
