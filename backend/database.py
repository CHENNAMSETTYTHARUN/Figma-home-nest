import pymysql
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import DATABASE_URL, SERVER_URL_NO_DB, DB_NAME

def ensure_database_exists():
    """Ensure the MySQL database exists before initializing SQLAlchemy."""
    try:
        temp_engine = create_engine(SERVER_URL_NO_DB, isolation_level="AUTOCOMMIT")
        with temp_engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
        temp_engine.dispose()
    except Exception as e:
        print(f"[Warning] Could not automatically create database {DB_NAME}: {e}")

ensure_database_exists()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency that yields a database session for each request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables."""
    import backend.models
    Base.metadata.create_all(bind=engine)
    print(f"[Database] Tables initialized successfully in '{DB_NAME}'.")
