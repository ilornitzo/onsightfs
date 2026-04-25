"""add manual expense fields

Revision ID: 9a7c1b2d3e4f
Revises: c3f4e9a1d2b0
Create Date: 2026-03-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9a7c1b2d3e4f"
down_revision = "c3f4e9a1d2b0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("is_manual_expense", sa.Boolean(), nullable=True, server_default=sa.text("false")),
    )
    op.add_column("orders", sa.Column("notes", sa.Text(), nullable=True))
    op.execute(sa.text("UPDATE orders SET is_manual_expense = false WHERE is_manual_expense IS NULL"))
    op.alter_column("orders", "is_manual_expense", nullable=False, server_default=None)
    op.create_index("ix_orders_is_manual_expense", "orders", ["is_manual_expense"], unique=False)
    op.alter_column("orders", "import_batch_id", existing_type=sa.UUID(), nullable=True)


def downgrade() -> None:
    op.alter_column("orders", "import_batch_id", existing_type=sa.UUID(), nullable=False)
    op.drop_index("ix_orders_is_manual_expense", table_name="orders")
    op.drop_column("orders", "notes")
    op.drop_column("orders", "is_manual_expense")
