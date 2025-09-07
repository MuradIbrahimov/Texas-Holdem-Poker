import os
import psycopg2
from contextlib import contextmanager
from typing import Generator
from urllib.parse import urlparse


class DatabaseConnection:
    """Database connection manager using raw PostgreSQL"""
    
    def __init__(self):
        # Support both individual env vars and DATABASE_URL
        database_url = os.getenv("DATABASE_URL")
        
        if database_url:
            # Parse DATABASE_URL format: postgresql://user:password@host:port/database
            parsed = urlparse(database_url)
            self.host = parsed.hostname
            self.port = parsed.port or 5432
            self.database = parsed.path[1:]  # Remove leading slash
            self.user = parsed.username
            self.password = parsed.password
        else:
            # Fallback to individual environment variables
            self.host = os.getenv("DB_HOST", "localhost")
            self.port = os.getenv("DB_PORT", "5432")
            self.database = os.getenv("DB_NAME", "poker_db")
            self.user = os.getenv("DB_USER", "poker_user")
            self.password = os.getenv("DB_PASSWORD", "poker_password")
    
    def get_connection_string(self) -> str:
        """Get PostgreSQL connection string"""
        return f"host={self.host} port={self.port} dbname={self.database} user={self.user} password={self.password}"
    
    @contextmanager
    def get_connection(self) -> Generator[psycopg2.extensions.connection, None, None]:
        """Context manager for database connections"""
        conn = psycopg2.connect(self.get_connection_string())
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
   
    def execute_query(self, query: str, params: tuple = None):
        """Execute a query and return results"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                if cursor.description:
                    columns = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()
                    return [dict(zip(columns, row)) for row in rows]
                return cursor.rowcount
    
    def execute_insert(self, query: str, params: tuple = None) -> int:
        """Execute an insert query and return the inserted ID"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.fetchone()[0]