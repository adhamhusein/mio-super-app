"""
Database configuration and connection utilities for SQL Server.
This module handles all database connections and provides connection pooling.
"""
import pyodbc
from typing import Optional
import os


class DatabaseConfig:
    """Database configuration class for SQL Server connections."""
    
    def __init__(self):
        # Read configuration only from environment variables to avoid
        # hard-coded defaults and accidental secret leakage.
        self.server = os.getenv('DB_SERVER')
        self.database = os.getenv('DB_NAME')
        self.username = os.getenv('DB_USER')
        self.password = os.getenv('DB_PASSWORD')
        self.driver = os.getenv('DB_DRIVER')
        # DB_TRUSTED_CONNECTION may be unset; treat only explicit 'yes' (case-insensitive) as True
        trusted = os.getenv('DB_TRUSTED_CONNECTION')
        self.trusted_connection = True if trusted and trusted.lower() == 'yes' else False
    
    def get_connection_string(self) -> str:
        """Generate connection string for SQL Server."""
        if self.trusted_connection:
            return (
                f"DRIVER={self.driver};"
                f"SERVER={self.server};"
                f"DATABASE={self.database};"
                f"Trusted_Connection=yes;"
            )
        else:
            return (
                f"DRIVER={self.driver};"
                f"SERVER={self.server};"
                f"DATABASE={self.database};"
                f"UID={self.username};"
                f"PWD={self.password};"
            )


def get_db_connection():
    """Get a database connection using the configuration."""
    config = DatabaseConfig()
    try:
        conn = pyodbc.connect(config.get_connection_string())
        return conn
    except pyodbc.Error as e:
        print(f"Database connection error: {e}")
        raise


def init_database():
    """Initialize database with required tables if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create miosphere_users table with fullname column if it doesn't exist
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='miosphere_users' AND xtype='U')
            CREATE TABLE miosphere_users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(50) UNIQUE NOT NULL,
                password NVARCHAR(255) NOT NULL,
                fullname NVARCHAR(100) NOT NULL,
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            )
        """)
        conn.commit()
        print("Database initialized successfully")
    except pyodbc.Error as e:
        print(f"Error initializing database: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

