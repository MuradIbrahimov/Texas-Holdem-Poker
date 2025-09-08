import os
import psycopg2
from contextlib import contextmanager
from typing import Generator


class DatabaseConnection:
    """Simple database connection manager for PostgreSQL"""
    
    def __init__(self):
        # Use environment variables for database configuration
        # Default to localhost for local development
        self.host = os.getenv("DB_HOST", "localhost")
        self.port = os.getenv("DB_PORT", "5432")
        self.database = os.getenv("DB_NAME", "poker_db")
        self.user = os.getenv("DB_USER", "poker_user")
        self.password = os.getenv("DB_PASSWORD", "poker_password")
    
    @contextmanager
    def get_connection(self) -> Generator[psycopg2.extensions.connection, None, None]:
        """Context manager for database connections"""
        conn = psycopg2.connect(
            host=self.host,
            port=self.port,
            database=self.database,
            user=self.user,
            password=self.password
        )
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def init_db(self):
        """Initialize database tables if they don't exist"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if hand_uuid column exists
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='hands' AND column_name='hand_uuid'
                """)
                
                if not cursor.fetchone():
                    # Table exists but without hand_uuid column, drop and recreate
                    cursor.execute("DROP TABLE IF EXISTS hands CASCADE")
                    print("📋 Dropping old table schema...")
                
                # Create table with correct schema
                create_table_query = """
                CREATE TABLE IF NOT EXISTS hands (
                    id SERIAL PRIMARY KEY,
                    hand_uuid VARCHAR(36) NOT NULL UNIQUE,
                    players_data JSONB NOT NULL,
                    board_cards VARCHAR(20) NOT NULL,
                    pot_size INTEGER NOT NULL,
                    small_blind INTEGER NOT NULL DEFAULT 20,
                    big_blind INTEGER NOT NULL DEFAULT 40,
                    results JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_hands_created_at ON hands(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_hands_uuid ON hands(hand_uuid);
                """
                
                cursor.execute(create_table_query)
                print("✅ Database table initialized with UUID support")
    
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