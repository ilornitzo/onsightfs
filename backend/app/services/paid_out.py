from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import PaidOutStatus
from app.models.order import Order


def set_order_paid_out_status(db: Session, order_id: UUID, paid: bool) -> dict[str, str]:
    order = db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
    if order is None:
        raise ValueError("order not found")

    order.paid_out_status = PaidOutStatus.paid if paid else PaidOutStatus.unpaid
    db.commit()

    return {
        "order_id": str(order.id),
        "paid_out_status": order.paid_out_status.value,
    }
