"""
Utility script to create a test user in the database.
Run this script to quickly set up a test account.
"""
import sys
import os

# Add parent directory to path so we can import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import get_db_connection
import hashlib


def create_user(username: str, password: str):
    """Create a user in the database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        cursor.execute(
            "INSERT INTO miosphere_users (username, password) VALUES (?, ?)",
            (username, hashed_password)
        )
        conn.commit()
        print(f"User '{username}' created successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error creating user: {e}")


if __name__ == '__main__':
    print("Create Test User")
    print("=" * 30)
    username = input("Enter username: ").strip()
    password = input("Enter password: ").strip()
    
    if username and password:
        create_user(username, password)
    else:
        print("Username and password are required!")

