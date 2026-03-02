from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.order import Order
from app.schemas.orders import OrderRow, OrdersListResponse, OrdersSummaryResponse

_ALLOWED_SORTS = {
    "submitted_to_client_at": Order.submitted_to_client_at,
    "due_date": Order.due_date,
    "client_pay_amount": Order.client_pay_amount,
    "contractor_pay_amount": Order.contractor_pay_amount,
}


def _build_filters(
    q: str | None = None,
    contractor: str | None = None,
    client: str | None = None,
    county: str | None = None,
    state: str | None = None,
    city: str | None = None,
    submitted_from: date | str | None = None,
    submitted_to: date | str | None = None,
    paid_out_status: str | None = None,
    billed_status: str | None = None,
):
    filters = []

    if q:
        like = f"%{q}%"
        filters.append(
            or_(
                Order.address.ilike(like),
                Order.city.ilike(like),
                Order.county.ilike(like),
                Order.client_name_raw.ilike(like),
                Order.contractor_name_raw.ilike(like),
                Order.order_number.ilike(like),
            )
        )
    if contractor:
        filters.append(Order.contractor_name_raw.ilike(f"%{contractor}%"))
    if client:
        filters.append(Order.client_name_raw.ilike(f"%{client}%"))
    if county:
        filters.append(Order.county.ilike(f"%{county}%"))
    if state:
        filters.append(Order.state.ilike(f"%{state}%"))
    if city:
        filters.append(Order.city.ilike(f"%{city}%"))
    submitted_from_date = _coerce_bound_date(submitted_from)
    submitted_to_date = _coerce_bound_date(submitted_to)
    if submitted_from_date:
        filters.append(
            Order.submitted_to_client_at
            >= datetime.combine(submitted_from_date, time.min).replace(tzinfo=timezone.utc)
        )
    if submitted_to_date:
        filters.append(
            Order.submitted_to_client_at
            < datetime.combine(submitted_to_date + timedelta(days=1), time.min).replace(tzinfo=timezone.utc)
        )
    if paid_out_status:
        filters.append(Order.paid_out_status == paid_out_status)
    if billed_status:
        filters.append(Order.billed_status == billed_status)

    return filters


def _parse_sort(sort: str):
    desc = sort.startswith("-")
    field = sort[1:] if desc else sort
    column = _ALLOWED_SORTS.get(field)
    if column is None:
        raise ValueError("invalid sort field")
    return column.desc() if desc else column.asc()


def _coerce_bound_date(value: date | str | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


def list_orders(
    db: Session,
    q: str | None = None,
    contractor: str | None = None,
    client: str | None = None,
    county: str | None = None,
    state: str | None = None,
    city: str | None = None,
    submitted_from: date | str | None = None,
    submitted_to: date | str | None = None,
    paid_out_status: str | None = None,
    billed_status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    sort: str = "-submitted_to_client_at",
) -> OrdersListResponse:
    filters = _build_filters(
        q=q,
        contractor=contractor,
        client=client,
        county=county,
        state=state,
        city=city,
        submitted_from=submitted_from,
        submitted_to=submitted_to,
        paid_out_status=paid_out_status,
        billed_status=billed_status,
    )

    count_stmt = select(func.count(Order.id)).where(*filters)
    total_count = db.execute(count_stmt).scalar_one()

    stmt = (
        select(
            Order.contractor_name_raw.label("contractor_name_raw"),
            Order.client_name_raw.label("client_name_raw"),
            Order.county.label("county"),
            Order.city.label("city"),
            Order.address.label("address"),
            Order.zip.label("zip"),
            Order.client_pay_amount.label("client_pay_amount"),
            Order.contractor_pay_amount.label("contractor_pay_amount"),
            Order.submitted_to_client_at.label("submitted_to_client_at"),
            Order.due_date.label("due_date"),
            Order.id.label("id"),
            Order.order_uid.label("order_uid"),
            Order.order_number.label("order_number"),
            Order.missing_paid_out_rate.label("missing_paid_out_rate"),
            Order.conflicting_paid_out_rate.label("conflicting_paid_out_rate"),
            Order.missing_paid_in_rate.label("missing_paid_in_rate"),
            Order.conflicting_paid_in_rate.label("conflicting_paid_in_rate"),
            Order.paid_out_status.label("paid_out_status"),
            Order.paid_in_status.label("paid_in_status"),
            Order.billed_status.label("billed_status"),
        )
        .where(*filters)
        .order_by(_parse_sort(sort), Order.order_uid.asc())
        .limit(limit)
        .offset(offset)
    )

    rows = db.execute(stmt).mappings().all()
    results: list[OrderRow] = []
    for row in rows:
        row_data = dict(row)
        row_data["id"] = str(row_data["id"])
        results.append(OrderRow(**row_data))

    return OrdersListResponse(count=total_count, results=results)


def summarize_orders(
    db: Session,
    q: str | None = None,
    contractor: str | None = None,
    client: str | None = None,
    county: str | None = None,
    state: str | None = None,
    city: str | None = None,
    submitted_from: date | str | None = None,
    submitted_to: date | str | None = None,
    paid_out_status: str | None = None,
    billed_status: str | None = None,
) -> OrdersSummaryResponse:
    filters = _build_filters(
        q=q,
        contractor=contractor,
        client=client,
        county=county,
        state=state,
        city=city,
        submitted_from=submitted_from,
        submitted_to=submitted_to,
        paid_out_status=paid_out_status,
        billed_status=billed_status,
    )

    stmt = select(
        func.count(Order.id).label("count"),
        func.coalesce(func.sum(Order.client_pay_amount), 0).label("paid_in_total"),
        func.coalesce(func.sum(Order.contractor_pay_amount), 0).label("paid_out_total"),
    ).where(*filters)

    row = db.execute(stmt).mappings().one()
    paid_in_total = Decimal(row["paid_in_total"])
    paid_out_total = Decimal(row["paid_out_total"])
    margin_total = paid_in_total - paid_out_total

    return OrdersSummaryResponse(
        count=row["count"],
        paid_in_total=paid_in_total,
        paid_out_total=paid_out_total,
        margin_total=margin_total,
    )
