from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.contractor import Contractor
from app.models.enums import PaidOutStatus, PayrollBatchStatus
from app.models.order import Order
from app.models.payroll_batch import PayrollBatch
from app.models.payroll_batch_item import PayrollBatchItem
from app.schemas.payroll import (
    CreatePayrollBatchesRequest,
    PayrollBatchContractorSummary,
)
from app.services.orders_query import _build_filters


def _resolve_or_create_contractor(db: Session, contractor_name_raw: str | None) -> Contractor:
    name = (contractor_name_raw or "").strip() or "Unknown Contractor"
    contractor = db.execute(select(Contractor).where(Contractor.name == name)).scalar_one_or_none()
    if contractor is None:
        contractor = Contractor(name=name, active=True)
        db.add(contractor)
        db.flush()
    return contractor


def _period_start(request_start: date | None, orders: list[Order]) -> date:
    if request_start is not None:
        return request_start
    dates = [o.submitted_to_client_at.date() for o in orders if o.submitted_to_client_at is not None]
    return min(dates) if dates else date.today()


def _period_end(request_end: date | None, orders: list[Order]) -> date:
    if request_end is not None:
        return request_end
    dates = [o.submitted_to_client_at.date() for o in orders if o.submitted_to_client_at is not None]
    return max(dates) if dates else date.today()


def create_payroll_batches(
    db: Session,
    payload: CreatePayrollBatchesRequest,
) -> dict[str, int | list[str] | list[PayrollBatchContractorSummary]]:
    filters = _build_filters(
        contractor=payload.contractor,
        client=payload.client,
        county=payload.county,
        state=payload.state,
        city=payload.city,
        submitted_from=payload.submitted_from,
        submitted_to=payload.submitted_to,
        paid_out_status="unpaid" if payload.only_unpaid else None,
    )

    filters.extend(
        [
            Order.contractor_pay_amount.is_not(None),
            Order.missing_paid_out_rate.is_(False),
            Order.conflicting_paid_out_rate.is_(False),
        ]
    )

    orders = list(db.execute(select(Order).where(*filters).order_by(Order.id.asc())).scalars().all())

    grouped: dict[str, dict[str, object]] = {}
    for order in orders:
        contractor = _resolve_or_create_contractor(db, order.contractor_name_raw)
        order.contractor_id = contractor.id

        key = str(contractor.id)
        if key not in grouped:
            grouped[key] = {
                "contractor": contractor,
                "orders": [],
            }
        grouped[key]["orders"].append(order)

    summaries: list[PayrollBatchContractorSummary] = []
    batch_ids: list[str] = []

    for group in grouped.values():
        contractor = group["contractor"]
        contractor_orders: list[Order] = group["orders"]

        start_date = _period_start(payload.submitted_from, contractor_orders)
        end_date = _period_end(payload.submitted_to, contractor_orders)

        batch = PayrollBatch(
            batch_name=f"Payroll {start_date.isoformat()} {contractor.name}",
            period_start=start_date,
            period_end=end_date,
            contractor_id=contractor.id,
        )
        db.add(batch)
        db.flush()
        batch_ids.append(str(batch.id))

        total_pay = Decimal("0.00")
        for order in contractor_orders:
            pay_amount = Decimal(order.contractor_pay_amount)
            total_pay += pay_amount
            db.add(
                PayrollBatchItem(
                    payroll_batch_id=batch.id,
                    order_id=order.id,
                    contractor_id=contractor.id,
                    pay_amount=pay_amount,
                    paid_out_status=order.paid_out_status,
                )
            )

        summaries.append(
            PayrollBatchContractorSummary(
                contractor_id=str(contractor.id),
                contractor_name=contractor.name,
                order_count=len(contractor_orders),
                total_pay=f"{total_pay:.2f}",
            )
        )

    db.commit()

    return {
        "batches_created": len(summaries),
        "total_orders": len(orders),
        "contractors": summaries,
        "batch_ids": batch_ids,
    }


def confirm_payroll_batch(db: Session, batch_id: UUID) -> dict[str, str | int]:
    batch = db.execute(select(PayrollBatch).where(PayrollBatch.id == batch_id)).scalar_one_or_none()
    if batch is None:
        raise ValueError("batch not found")
    if batch.status != PayrollBatchStatus.draft:
        raise ValueError("batch is not in draft status")

    rows = db.execute(
        select(PayrollBatchItem, Order)
        .join(Order, Order.id == PayrollBatchItem.order_id)
        .where(PayrollBatchItem.payroll_batch_id == batch.id)
    ).all()

    for item, order in rows:
        if item.pay_amount is None or order.contractor_pay_amount is None:
            raise ValueError("cannot confirm batch with null contractor pay")
        if order.missing_paid_out_rate or order.conflicting_paid_out_rate:
            raise ValueError("cannot confirm batch with missing/conflicting paid out rate")

    now = datetime.now(timezone.utc)
    for item, order in rows:
        order.paid_out_status = PaidOutStatus.paid
        item.paid_out_status = PaidOutStatus.paid
        item.paid_at = now

    batch.status = PayrollBatchStatus.paid
    batch.paid_at = now

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "batch_id": str(batch.id),
        "orders_marked_paid": len(rows),
    }
