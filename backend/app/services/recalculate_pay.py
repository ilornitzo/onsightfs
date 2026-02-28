from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.contractor import Contractor
from app.models.contractor_pay_rate import ContractorPayRate
from app.models.order import Order
from app.schemas.rates import RecalculatePayRequest, RecalculatePayResponse
from app.services.orders_query import _build_filters


def _normalized(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text.lower() if text else None


def _matches_location(rule_value: str | None, order_value: str | None) -> bool:
    normalized_rule = _normalized(rule_value)
    if normalized_rule is None:
        return True
    return normalized_rule == _normalized(order_value)


def _specificity(rate: ContractorPayRate) -> int:
    return sum(
        1
        for part in (rate.state, rate.county, rate.city)
        if part is not None and str(part).strip() != ""
    )


def _resolve_or_create_client(db: Session, name: str | None) -> Client | None:
    if name is None or name.strip() == "":
        return None
    client = db.execute(select(Client).where(Client.name == name)).scalar_one_or_none()
    if client is None:
        client = Client(name=name, active=True)
        db.add(client)
        db.flush()
    return client


def _resolve_or_create_contractor(db: Session, name: str | None) -> Contractor | None:
    if name is None or name.strip() == "":
        return None
    contractor = db.execute(select(Contractor).where(Contractor.name == name)).scalar_one_or_none()
    if contractor is None:
        contractor = Contractor(name=name, active=True)
        db.add(contractor)
        db.flush()
    return contractor


def recalculate_contractor_pay(db: Session, payload: RecalculatePayRequest) -> RecalculatePayResponse:
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

    orders = list(db.execute(select(Order).where(*filters)).scalars().all())

    updated = 0
    missing_rate = 0
    conflicts = 0

    for order in orders:
        contractor = _resolve_or_create_contractor(db, order.contractor_name_raw)
        client = _resolve_or_create_client(db, order.client_name_raw)

        order.contractor_id = contractor.id if contractor is not None else None
        order.client_id = client.id if client is not None else None

        if contractor is None or client is None:
            order.contractor_pay_amount = None
            order.missing_paid_out_rate = True
            order.conflicting_paid_out_rate = False
            missing_rate += 1
            continue

        candidate_rates = list(
            db.execute(
                select(ContractorPayRate).where(
                    ContractorPayRate.active.is_(True),
                    ContractorPayRate.contractor_id == contractor.id,
                    ContractorPayRate.client_id == client.id,
                )
            )
            .scalars()
            .all()
        )

        matched_rates = [
            rate
            for rate in candidate_rates
            if _matches_location(rate.state, order.state)
            and _matches_location(rate.county, order.county)
            and _matches_location(rate.city, order.city)
        ]

        if not matched_rates:
            order.contractor_pay_amount = None
            order.missing_paid_out_rate = True
            order.conflicting_paid_out_rate = False
            missing_rate += 1
            continue

        best_specificity = max(_specificity(rate) for rate in matched_rates)
        most_specific = [rate for rate in matched_rates if _specificity(rate) == best_specificity]
        best_priority = min(rate.priority for rate in most_specific)
        winners = [rate for rate in most_specific if rate.priority == best_priority]

        if len(winners) == 1:
            order.contractor_pay_amount = Decimal(winners[0].amount)
            order.missing_paid_out_rate = False
            order.conflicting_paid_out_rate = False
            updated += 1
        else:
            order.contractor_pay_amount = None
            order.missing_paid_out_rate = False
            order.conflicting_paid_out_rate = True
            conflicts += 1

    db.commit()

    return RecalculatePayResponse(
        updated=updated,
        missing_rate=missing_rate,
        conflicts=conflicts,
    )
