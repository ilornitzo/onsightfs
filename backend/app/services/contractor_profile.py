from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.contractor import Contractor
from app.models.contractor_profile import ContractorProfile
from app.schemas.contractor_profile import ContractorProfileOut, ContractorProfileUpsert


def get_contractor_profile(db: Session, contractor_id: UUID) -> ContractorProfileOut:
    profile = db.execute(
        select(ContractorProfile).where(ContractorProfile.contractor_id == contractor_id)
    ).scalar_one_or_none()
    if profile is None:
        return ContractorProfileOut(contractor_id=contractor_id)
    return ContractorProfileOut.model_validate(profile)


def upsert_contractor_profile(
    db: Session, contractor_id: UUID, payload: ContractorProfileUpsert
) -> ContractorProfileOut:
    contractor = db.execute(select(Contractor).where(Contractor.id == contractor_id)).scalar_one_or_none()
    if contractor is None:
        raise ValueError("contractor not found")

    profile = db.execute(
        select(ContractorProfile).where(ContractorProfile.contractor_id == contractor_id)
    ).scalar_one_or_none()

    if profile is None:
        profile = ContractorProfile(contractor_id=contractor_id)
        db.add(profile)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return ContractorProfileOut.model_validate(profile)
