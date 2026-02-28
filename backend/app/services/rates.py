from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.contractor import Contractor
from app.models.contractor_pay_rate import ContractorPayRate
from app.schemas.rates import (
    ClientCreate,
    ContractorPayRateCreate,
    ContractorPayRateUpdate,
)


def list_contractors(db: Session) -> list[Contractor]:
    return list(db.execute(select(Contractor).order_by(Contractor.name.asc())).scalars().all())


def create_contractor(
    db: Session,
    name: str,
    external_user_id: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    active: bool | None = True,
) -> Contractor:
    contractor = Contractor(
        name=name,
        external_user_id=external_user_id,
        email=email,
        phone=phone,
        active=True if active is None else active,
    )
    db.add(contractor)
    db.commit()
    db.refresh(contractor)
    return contractor


def list_clients(db: Session) -> list[Client]:
    return list(db.execute(select(Client).order_by(Client.name.asc())).scalars().all())


def create_client(db: Session, payload: ClientCreate) -> Client:
    client = Client(
        name=payload.name,
        external_ref=payload.external_ref,
        active=True if payload.active is None else payload.active,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def list_contractor_pay_rates(
    db: Session,
    contractor_id: UUID | None = None,
    client_id: UUID | None = None,
) -> list[ContractorPayRate]:
    stmt = select(ContractorPayRate)
    if contractor_id is not None:
        stmt = stmt.where(ContractorPayRate.contractor_id == contractor_id)
    if client_id is not None:
        stmt = stmt.where(ContractorPayRate.client_id == client_id)

    stmt = stmt.order_by(
        ContractorPayRate.contractor_id.asc(),
        ContractorPayRate.client_id.asc(),
        ContractorPayRate.priority.asc(),
    )
    return list(db.execute(stmt).scalars().all())


def create_contractor_pay_rate(db: Session, payload: ContractorPayRateCreate) -> ContractorPayRate:
    rate = ContractorPayRate(
        contractor_id=payload.contractor_id,
        client_id=payload.client_id,
        state=payload.state,
        county=payload.county,
        city=payload.city,
        amount=payload.amount,
        priority=payload.priority,
        active=payload.active,
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate


def update_contractor_pay_rate(
    db: Session,
    rate_id: UUID,
    payload: ContractorPayRateUpdate,
) -> ContractorPayRate:
    rate = db.execute(select(ContractorPayRate).where(ContractorPayRate.id == rate_id)).scalar_one_or_none()
    if rate is None:
        raise ValueError("rate not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rate, key, value)

    db.commit()
    db.refresh(rate)
    return rate


def delete_contractor_pay_rate(db: Session, rate_id: UUID) -> None:
    rate = db.execute(select(ContractorPayRate).where(ContractorPayRate.id == rate_id)).scalar_one_or_none()
    if rate is None:
        raise ValueError("rate not found")

    db.delete(rate)
    db.commit()
