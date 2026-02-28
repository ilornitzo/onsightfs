from __future__ import with_statement

import os

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.models.base import Base

config = context.config
target_metadata = Base.metadata

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL environment variable is required")

config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
