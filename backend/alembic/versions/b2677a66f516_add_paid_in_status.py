"""add paid_in_status

Revision ID: b2677a66f516
Revises: e6f6bede2651
Create Date: 2026-03-01 14:34:00.160044
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2677a66f516'
down_revision = 'e6f6bede2651'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'orders',
        sa.Column(
            'paid_in_status',
            sa.Enum('unpaid', 'paid', name='paidinstatus', native_enum=False),
            nullable=True,
            server_default='unpaid',
        ),
    )
    op.execute(sa.text("UPDATE orders SET paid_in_status = 'unpaid' WHERE paid_in_status IS NULL"))
    op.alter_column('orders', 'paid_in_status', nullable=False)
    op.alter_column('orders', 'paid_in_status', server_default=None)


def downgrade() -> None:
    op.drop_column('orders', 'paid_in_status')
