import pymysql
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import DATABASE_URL, SERVER_URL_NO_DB, DB_NAME

Base = declarative_base()

def get_engine():
    try:
        temp_engine = create_engine(SERVER_URL_NO_DB, isolation_level="AUTOCOMMIT", connect_args={"connect_timeout": 3})
        with temp_engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
        temp_engine.dispose()

        mysql_engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600, connect_args={"connect_timeout": 3})
        with mysql_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return mysql_engine
    except Exception as e:
        print(f"[Database] MySQL connection notice: {e}. Using SQLite fallback.")
        return create_engine("sqlite:///./homenest.db", connect_args={"check_same_thread": False})

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import backend.models
    Base.metadata.create_all(bind=engine)
    print(f"[Database] Tables initialized successfully in '{DB_NAME}'.")
