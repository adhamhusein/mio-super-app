# Super App

A scalable super app framework built with Flask and SQL Server.

## Project Structure

```
Super_App/
├── app.py                 # Main Flask application (web coordination)
├── config/
│   └── database.py       # Database configuration and connection utilities
├── templates/
│   ├── login.html        # Login page template
│   └── dashboard.html    # Dashboard template
├── static/
│   └── css/
│       └── style.css     # Application styles
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. SQL Server Setup

Make sure you have SQL Server running and create a database (or the app will try to use `SuperAppDB` by default).

### 3. Configure Database Connection

You can configure the database connection using environment variables or by modifying `config/database.py`:

**Environment Variables:**
- `DB_SERVER` - SQL Server address (default: localhost)
- `DB_NAME` - Database name (default: SuperAppDB)
- `DB_USER` - Database username (default: sa)
- `DB_PASSWORD` - Database password (default: empty)
- `DB_DRIVER` - ODBC Driver (default: ODBC Driver 17 for SQL Server)
- `DB_TRUSTED_CONNECTION` - Use Windows authentication (default: no)
- `SECRET_KEY` - Flask secret key for sessions

**Or create a `.env` file:**
```
DB_SERVER=localhost
DB_NAME=SuperAppDB
DB_USER=sa
DB_PASSWORD=your_password
SECRET_KEY=your-secret-key-here
```

### 4. Create a Test User

You'll need to insert a test user into the database. Run this SQL query:

```sql
USE SuperAppDB;
-- Password will be hashed with SHA-256
-- Example: password 'admin123' hashed
INSERT INTO miosphere_users (username, password) 
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');
```

Or create a simple Python script to hash your password:

```python
import hashlib
password = "your_password"
hashed = hashlib.sha256(password.encode()).hexdigest()
print(hashed)
```

### 5. Run the Application

```bash
python app.py
```

The app will run on `http://localhost:5000`

## Features

- **Login System**: Username/password authentication with SQL Server
- **Session Management**: Secure session handling
- **Scalable Structure**: Ready for adding ERP and other features
- **Database Integration**: Centralized database connection management

## Future Enhancements

- ERP module
- User management
- Role-based access control
- API endpoints
- Additional business modules

