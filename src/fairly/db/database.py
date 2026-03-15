"""SQLAlchemy engine and session setup for fairly.

Uses SQLite stored inside the .fairly/ directory.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from fairly.config import DB_PATH
from fairly.db.models import Base

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    """Create all tables if they don't exist yet."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """Yield a database session (for use as a FastAPI dependency).

    Yields:
        A SQLAlchemy Session that auto-closes after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
