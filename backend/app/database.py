# backend/app/database.py - Fixed database initialization

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional

class DatabaseConnection:
    def __init__(self):
        # Get database credentials from environment or use defaults
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'poker_db'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'postgres')
        }
        self.connection = None
        self.connect()
    
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(**self.db_config)
            self.connection.autocommit = True
            print(f"✅ Connected to database: {self.db_config['database']}")
        except psycopg2.Error as e:
            print(f"❌ Database connection failed: {e}")
            raise
    
    def init_db(self):
        """Initialize database tables if they don't exist"""
        try:
            cursor = self.connection.cursor()
            
            # Drop and recreate the table to ensure correct schema
            cursor.execute("DROP TABLE IF EXISTS hands CASCADE")
            
            # Create hands table with all required columns
            create_table_query = """
                CREATE TABLE IF NOT EXISTS hands (
                    id SERIAL PRIMARY KEY,
                    uuid VARCHAR(36) UNIQUE NOT NULL,
                    players_data TEXT,
                    board_cards VARCHAR(10),
                    pot_size INTEGER,
                    small_blind INTEGER DEFAULT 20,
                    big_blind INTEGER DEFAULT 40,
                    results TEXT,
                    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            cursor.execute(create_table_query)
            
            # Create indexes for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_hands_completed_at ON hands(completed_at DESC)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_hands_uuid ON hands(uuid)")
            
            cursor.close()
            print("✅ Database tables initialized successfully")
        except psycopg2.Error as e:
            print(f"❌ Failed to initialize database tables: {e}")
            raise
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a query and return results as list of dictionaries"""
        try:
            cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params)
            
            # If it's a SELECT query, fetch results
            if query.strip().upper().startswith('SELECT'):
                results = cursor.fetchall()
                cursor.close()
                return results
            
            # For INSERT/UPDATE/DELETE, commit and return empty list
            self.connection.commit()
            cursor.close()
            return []
            
        except psycopg2.Error as e:
            print(f"❌ Query execution failed: {e}")
            print(f"Query: {query}")
            print(f"Params: {params}")
            self.connection.rollback()
            raise
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            print("Database connection closed")
    
    def __del__(self):
        """Cleanup on deletion"""
        self.close()