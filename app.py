"""
Main Flask application for Super App.
This is the central coordination file for web requests.
"""
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import hashlib
from config.database import get_db_connection, init_database
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# Initialize database on startup
init_database()


def hash_password(password: str) -> str:
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


@app.route('/')
def landing():
    """Landing page - redirects to login."""
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page and authentication handler."""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        if not username or not password:
            flash('Please enter both username and password', 'error')
            return render_template('login.html')
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if user exists
            hashed_password = hash_password(password)
            cursor.execute(
                "SELECT id, username, fullname FROM users WHERE username = ? AND password = ?",
                (username, hashed_password)
            )
            user = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if user:
                session['user_id'] = user[0]
                session['username'] = user[1]
                session['fullname'] = user[2]
                flash('Login successful!', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash('Invalid username or password', 'error')
                
        except Exception as e:
            flash(f'Database error: {str(e)}', 'error')
            print(f"Login error: {e}")
        
        return render_template('login.html')
    
    # GET request - show login page
    return render_template('login.html')


@app.route('/dashboard')
def dashboard():
    """Dashboard page after successful login."""
    if 'user_id' not in session:
        flash('Please login to access the dashboard', 'error')
        return redirect(url_for('login'))
    
    return render_template('dashboard.html', fullname=session.get('fullname'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration page and handler."""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        fullname = request.form.get('fullname', '').strip()
        
        # Validation
        if not username or not password or not confirm_password or not fullname:
            flash('All fields are required', 'error')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('register.html')
        
        if len(password) < 4:
            flash('Password must be at least 4 characters long', 'error')
            return render_template('register.html')
        
        if len(username) < 3:
            flash('Username must be at least 3 characters long', 'error')
            return render_template('register.html')
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if username already exists
            cursor.execute(
                "SELECT id FROM users WHERE username = ?",
                (username,)
            )
            existing_user = cursor.fetchone()
            
            if existing_user:
                cursor.close()
                conn.close()
                flash('Username already exists. Please choose a different username.', 'error')
                return render_template('register.html')
            
            # Create new user with uppercase fullname
            hashed_password = hash_password(password)
            fullname_upper = fullname.upper()
            cursor.execute(
                "INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)",
                (username, hashed_password, fullname_upper)
            )
            conn.commit()
            
            cursor.close()
            conn.close()
            
            flash('Registration successful! You can now login.', 'success')
            return redirect(url_for('login'))
            
        except Exception as e:
            flash(f'Database error: {str(e)}', 'error')
            print(f"Registration error: {e}")
            try:
                conn.rollback()
                cursor.close()
                conn.close()
            except:
                pass
        
        return render_template('register.html')
    
    # GET request - show registration page
    return render_template('register.html')


@app.route('/logout')
def logout():
    """Logout handler."""
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))


# Timesheet Validation API Routes
@app.route('/api/timesheet/step1', methods=['GET', 'POST'])
def timesheet_step1():
    """Handle Step 1 data - save and retrieve."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            session['timesheet_step1'] = {
                'selectedDate': data.get('selectedDate', ''),
                'selectedShifts': data.get('selectedShifts', []),
                'unitType': data.get('unitType', '3 Shift')
            }
            return jsonify({'success': True, 'message': 'Step 1 data saved'})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 400
    
    # GET request
    step1_data = session.get('timesheet_step1', {})
    return jsonify({'success': True, 'data': step1_data})


@app.route('/api/timesheet/step2', methods=['GET', 'POST'])
def timesheet_step2():
    """Handle Step 2 data - save and retrieve."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            session['timesheet_step2'] = {
                'equipmentNumber': data.get('equipmentNumber', ''),
                'operatorId': data.get('operatorId', ''),
                'trips': data.get('trips', []),
                'history': []  # Don't save history to session
            }
            return jsonify({'success': True, 'message': 'Step 2 data saved'})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 400
    
    # GET request
    step2_data = session.get('timesheet_step2', {})
    return jsonify({'success': True, 'data': step2_data})


@app.route('/api/trips', methods=['GET'])
def fetch_trips():
    """Fetch trips from database based on equipment, operator, date and shifts."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    equipment = request.args.get('equipment', '').strip()
    operator = request.args.get('operator', '').strip()  # Optional
    date = request.args.get('date', '').strip()
    shifts_str = request.args.get('shifts', '').strip()
    
    if not equipment or not date or not shifts_str:
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400
    
    shifts = [s.strip() for s in shifts_str.split(',') if s.strip()]
    if not shifts:
        return jsonify({'success': False, 'message': 'At least one shift required'}), 400
    
    try:
        from config.database import get_db_connection
        from datetime import datetime, timedelta
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        all_trips = []
        
        # Process each shift
        for shift_code in shifts:
            # Validate and normalize shift code (S01, S02, S03, S08, S09)
            shift_code_upper = shift_code.upper().strip()
            if shift_code_upper not in ['S01', 'S02', 'S03', 'S08', 'S09']:
                continue
            
            # Use stored procedure based on whether operator is provided
            if operator:
                # Execute stored procedure with operator: MOSA_TV_GET_TRIP_BY_UNIT_NRP
                query = "EXECUTE [dbo].[MOSA_TV_GET_TRIP_BY_UNIT_NRP] @date = ?, @shift = ?, @mobileid = ?, @opr_nrp = ?"
                cursor.execute(query, (date, shift_code_upper, equipment, operator))
            else:
                # Execute stored procedure without operator: MOSA_TV_GET_TRIP_BY_UNIT
                query = "EXECUTE [dbo].[MOSA_TV_GET_TRIP_BY_UNIT] @date = ?, @shift = ?, @mobileid = ?"
                cursor.execute(query, (date, shift_code_upper, equipment))
            
            rows = cursor.fetchall()
            
            # Map database columns to trip structure
            # Expected columns: id, reporttime, mobileid, opr_nrp, opr_username, opr_shift, act_loaderid, pos_name, act_hauldistance, is_deleted, record_type
            for row in rows:
                trip = {
                    'id': str(row[0]) if row[0] else None,
                    'reportTime': row[1].isoformat() if row[1] else None,
                    'equipmentNo': row[2] if row[2] else '',
                    'operatorId': row[3] if row[3] else '',
                    'operatorName': row[4] if row[4] else '',
                    'oprShift': row[5] if (len(row) > 5 and row[5] is not None) else '',
                    'loaderId': row[6] if (len(row) > 6 and row[6]) else '',
                    'posName': row[7] if (len(row) > 7 and row[7]) else '',
                    'distance': row[8] if (len(row) > 8 and row[8] is not None) else '',
                    'note': 'deleted' if (len(row) > 9 and row[9] == 1 and (len(row) > 10 and row[10] == 'trip')) else '',
                    'recordType': row[10] if len(row) > 10 else 'trip'
                }
                
                all_trips.append(trip)
        
        cursor.close()
        conn.close()
        
        # Sort all trips by report time
        all_trips.sort(key=lambda x: x['reportTime'] if x['reportTime'] else '')
        
        return jsonify({'success': True, 'trips': all_trips})
        
    except Exception as e:
        print(f"Error fetching trips: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/sort', methods=['POST'])
def timesheet_sort():
    """Sort trips by reportTime on server side."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        trips = data.get('trips', [])
        
        # Sort by reportTime
        trips.sort(key=lambda x: x.get('reportTime', '') or '')
        
        return jsonify({'success': True, 'trips': trips})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@app.route('/api/timesheet/add-trip', methods=['POST'])
def add_trip():
    """Insert a new trip into opr_dump table."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        from config.database import get_db_connection
        from datetime import datetime
        
        # Extract trip data
        report_time = data.get('reportTime', '')
        mobile_id = data.get('equipmentNo', '')
        opr_nrp = data.get('operatorId', '')
        opr_username = data.get('operatorName', '')
        opr_shift = data.get('oprShift', '')
        act_loaderid = data.get('loaderId', '')
        pos_name = data.get('posName', '')
        act_hauldistance = data.get('distance', '')
        
        # Validate required fields
        if not report_time or not mobile_id or not opr_nrp:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        # Convert reportTime to datetime string format for stored procedure
        try:
            # Parse as naive datetime (no timezone) to preserve exact time
            if 'T' in report_time:
                report_time_dt = datetime.strptime(report_time.split('.')[0], '%Y-%m-%dT%H:%M:%S')
            else:
                report_time_dt = datetime.strptime(report_time, '%Y-%m-%d %H:%M:%S')
            # Format as string for stored procedure: 'YYYY-MM-DD HH:MM:SS'
            report_time_str = report_time_dt.strftime('%Y-%m-%d %H:%M:%S')
        except Exception as e:
            return jsonify({'success': False, 'message': f'Invalid date format: {str(e)}'}), 400
        
        # Insert into database using stored procedure
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        EXEC [dbo].[MOSA_TV_INSERT_TRIP]
            @rep = ?,
            @mobileid = ?,
            @opr_nrp = ?,
            @opr_shift = ?,
            @act_loaderid = ?,
            @pos_name = ?,
            @act_hauldistance = ?
        """
        
        cursor.execute(query, (
            report_time_str,
            mobile_id,
            opr_nrp,
            opr_shift if opr_shift else None,
            act_loaderid if act_loaderid else None,
            pos_name if pos_name else None,
            act_hauldistance if act_hauldistance else None
        ))
        
        conn.commit()
        
        # Query the inserted ID separately (stored procedure doesn't return result set)
        # Use required fields: reporttime, mobileid, opr_nrp
        id_query = """
        SELECT TOP 1 id 
        FROM opr_dump 
        WHERE reporttime = ? AND mobileid = ? AND opr_nrp = ?
        ORDER BY id DESC
        """
        cursor.execute(id_query, (report_time_dt, mobile_id, opr_nrp))
        row = cursor.fetchone()
        generated_id = str(row[0]) if row and row[0] else None
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Trip added successfully', 'id': generated_id})
        
    except Exception as e:
        print(f"Error adding trip: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/delete-trip', methods=['POST'])
def delete_trip():
    """Update trip is_deleted = 1 in opr_dump table."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        trip_id = data.get('id')
        
        if not trip_id:
            return jsonify({'success': False, 'message': 'Missing trip ID'}), 400
        
        from config.database import get_db_connection
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "EXECUTE [dbo].[MOSA_TV_DELETE_TRIP] @id = ?"
        cursor.execute(query, (trip_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Trip deleted successfully'})
        
    except Exception as e:
        print(f"Error deleting trip: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/restore-trip', methods=['POST'])
def restore_trip():
    """Update trip is_deleted = 0 in opr_dump table."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        trip_id = data.get('id')
        
        if not trip_id:
            return jsonify({'success': False, 'message': 'Missing trip ID'}), 400
        
        from config.database import get_db_connection
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "EXECUTE [dbo].[MOSA_TV_RESTORE_TRIP] @id = ?"
        cursor.execute(query, (trip_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Trip restored successfully'})
        
    except Exception as e:
        print(f"Error restoring trip: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/update-trip', methods=['POST'])
def update_trip():
    """Update trip fields in opr_dump table."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        trip_id = data.get('id')
        report_time = data.get('reportTime', '')
        loader_id = data.get('loaderId', '')
        pos_name = data.get('posName', '')
        distance = data.get('distance', '')
        
        if not trip_id:
            return jsonify({'success': False, 'message': 'Missing trip ID'}), 400
        
        from config.database import get_db_connection
        from datetime import datetime
        
        # Convert reportTime to datetime string format for stored procedure
        report_time_str = None
        if report_time:
            try:
                if 'T' in report_time:
                    report_time_dt = datetime.strptime(report_time.split('.')[0], '%Y-%m-%dT%H:%M:%S')
                else:
                    report_time_dt = datetime.strptime(report_time, '%Y-%m-%d %H:%M:%S')
                # Format as string for stored procedure: 'YYYY-MM-DD HH:MM:SS'
                report_time_str = report_time_dt.strftime('%Y-%m-%d %H:%M:%S')
            except Exception as e:
                return jsonify({'success': False, 'message': f'Invalid date format: {str(e)}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Execute stored procedure
        query = """
        EXECUTE [dbo].[MOSA_TV_MODIFY_TRIP]
            @id = ?,
            @reporttime = ?,
            @act_loaderid = ?,
            @pos_name = ?,
            @act_hauldistance = ?
        """
        
        cursor.execute(query, (
            trip_id,
            report_time_str if report_time_str else None,
            loader_id if loader_id else None,
            pos_name if pos_name else None,
            distance if distance else None
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Trip updated successfully'})
        
    except Exception as e:
        print(f"Error updating trip: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/clear', methods=['POST'])
def timesheet_clear():
    """Clear timesheet session data."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    session.pop('timesheet_step1', None)
    session.pop('timesheet_step2', None)
    return jsonify({'success': True, 'message': 'Session cleared'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

