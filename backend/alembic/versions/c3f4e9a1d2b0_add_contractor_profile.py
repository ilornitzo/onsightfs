"""add contractor profile

Revision ID: c3f4e9a1d2b0
Revises: b2677a66f516
Create Date: 2026-03-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c3f4e9a1d2b0"
down_revision = "b2677a66f516"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "contractor_profiles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("contractor_id", sa.UUID(), nullable=False),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("ssn_or_ein", sa.String(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("aspen_grove_abc_number", sa.String(), nullable=True),
        sa.Column("bank_name", sa.String(), nullable=True),
        sa.Column("bank_account_type", sa.String(), nullable=True),
        sa.Column("bank_routing_number", sa.String(), nullable=True),
        sa.Column("bank_account_number", sa.String(), nullable=True),
        sa.Column("counties", sa.JSON(), nullable=True),
        sa.Column("expected_pay_per_inspection", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("min_daily_volume", sa.Integer(), nullable=True),
        sa.Column("ic_acknowledged", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("signature_name", sa.String(), nullable=True),
        sa.Column("signature_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["contractor_id"], ["contractors.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("contractor_id"),
    )
    op.alter_column("contractor_profiles", "ic_acknowledged", server_default=None)


def downgrade() -> None:
    op.drop_table("contractor_profiles")
