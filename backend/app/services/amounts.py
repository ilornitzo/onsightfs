from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.order import Order


def _coerce_amount(value: object) -> Decimal:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValueError(f"invalid amount value: {value}") from exc

    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def update_order_amounts(
    db: Session,
    order_id: UUID,
    client_pay_amount: object | None = None,
    contractor_pay_amount: object | None = None,
) -> dict[str, str | None]:
    order = db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
    if order is None:
        raise ValueError("order not found")

    if client_pay_amount is not None:
        order.client_pay_amount = _coerce_amount(client_pay_amount)
    if contractor_pay_amount is not None:
        order.contractor_pay_amount = _coerce_amount(contractor_pay_amount)

    db.commit()

    return {
        "order_id": str(order.id),
        "client_pay_amount": (
            f"{Decimal(str(order.client_pay_amount)).quantize(Decimal('0.01'))}"
            if order.client_pay_amount is not None
            else None
        ),
        "contractor_pay_amount": (
            f"{Decimal(str(order.contractor_pay_amount)).quantize(Decimal('0.01'))}"
            if order.contractor_pay_amount is not None
            else None
        ),
    }
