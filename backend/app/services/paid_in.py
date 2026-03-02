from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import PaidInStatus
from app.models.order import Order


def set_order_paid_in_status(db: Session, order_id: UUID, paid: bool) -> dict[str, str]:
    order = db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
    if order is None:
        raise ValueError("order not found")

    order.paid_in_status = PaidInStatus.paid if paid else PaidInStatus.unpaid
    db.commit()

    return {
        "order_id": str(order.id),
        "paid_in_status": order.paid_in_status.value,
    }
