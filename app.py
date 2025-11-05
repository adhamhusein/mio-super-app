from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from datetime import datetime
import hashlib
import os
from dotenv import load_dotenv
from config.database import get_db_connection, init_database

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

init_database()


@app.route('/api/timesheet/historical-login')
def api_historical_login():
    mobileid = request.args.get('mobileid')
    if not mobileid:
        return jsonify({'success': False, 'error': 'Missing mobileid'})
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("exec dbo.miosphere_dtv_get_latest_login_data @mobileid=?", mobileid)
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify({'success': True, 'rows': rows})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


@app.route('/')
def landing():
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        if not username or not password:
            flash('Please enter both username and password', 'error')
            return render_template('login.html')
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            hashed_password = hash_password(password)
            cursor.execute(
                "SELECT id, username, fullname FROM miosphere_users WHERE username = ? AND password = ?",
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
    
    return render_template('login.html')


@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        flash('Please login to access the dashboard', 'error')
        return redirect(url_for('login'))
    return render_template('dashboard.html', fullname=session.get('fullname'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        fullname = request.form.get('fullname', '').strip()
        
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
            cursor.execute(
                "SELECT id FROM miosphere_users WHERE username = ?",
                (username,)
            )
            existing_user = cursor.fetchone()
            
            if existing_user:
                cursor.close()
                conn.close()
                flash('Username already exists. Please choose a different username.', 'error')
                return render_template('register.html')
            
            hashed_password = hash_password(password)
            fullname_upper = fullname.upper()
            cursor.execute(
                "INSERT INTO miosphere_users (username, password, fullname) VALUES (?, ?, ?)",
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
    
    return render_template('register.html')


@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))


@app.route('/api/timesheet/step1', methods=['GET', 'POST'])
def timesheet_step1():
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
    
    step1_data = session.get('timesheet_step1', {})
    return jsonify({'success': True, 'data': step1_data})


@app.route('/api/timesheet/step2', methods=['GET', 'POST'])
def timesheet_step2():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            session['timesheet_step2'] = {
                'equipmentNumber': data.get('equipmentNumber', ''),
                'operatorId': data.get('operatorId', ''),
                'trips': data.get('trips', []),
                'history': []
            }
            return jsonify({'success': True, 'message': 'Step 2 data saved'})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 400
    
    step2_data = session.get('timesheet_step2', {})
    return jsonify({'success': True, 'data': step2_data})


@app.route('/api/timesheet/step3', methods=['GET'])
def timesheet_step3():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SET NOCOUNT ON; EXEC [dbo].[miosphere_dtv_get_realtime_hm_validation]")

        max_sets = 10
        sets_checked = 0
        while cursor.description is None and sets_checked < max_sets:
            if not cursor.nextset():
                break
            sets_checked += 1

        if cursor.description is None:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'No results. Previous SQL was not a query.'}), 400

        col_names = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

        result = []
        for row in rows:
            item = {}
            for idx, col in enumerate(col_names):
                val = row[idx] if idx < len(row) else None
                try:
                    if hasattr(val, 'isoformat'):
                        val = val.isoformat()
                except Exception:
                    pass
                item[col] = val
            result.append(item)

        cursor.close()
        conn.close()
        return jsonify({'success': True, 'columns': col_names, 'rows': result})

    except Exception as e:
        print(f"Error fetching realtime HM validation: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/trips', methods=['GET'])
def fetch_trips():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    equipment = request.args.get('equipment', '').strip()
    operator = request.args.get('operator', '').strip()
    date = request.args.get('date', '').strip()
    shifts_str = request.args.get('shifts', '').strip()
    
    if not equipment or not date or not shifts_str:
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400
    
    shifts = [s.strip() for s in shifts_str.split(',') if s.strip()]
    if not shifts:
        return jsonify({'success': False, 'message': 'At least one shift required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        all_trips = []
        seen_ids = set()
        
        for shift_code in shifts:
            shift_code_upper = shift_code.upper().strip()
            if shift_code_upper not in ['S01', 'S02', 'S03', 'S08', 'S09']:
                continue
            
            if operator:
                query = "EXECUTE dbo.miosphere_dtv_get_trip_by_unit_nrp @date = ?, @shift_code = ?, @mobileid = ?, @opr_nrp = ?"
                cursor.execute(query, (date, shift_code_upper, equipment, operator))
            else:
                query = "EXECUTE dbo.miosphere_dtv_get_trip_by_unit @date = ?, @shift_code = ?, @mobileid = ?"
                cursor.execute(query, (date, shift_code_upper, equipment))
            
            rows = cursor.fetchall()
            
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
                
                trip_id = trip.get('id')
                if trip_id:
                    if trip_id in seen_ids:
                        continue
                    seen_ids.add(trip_id)

                all_trips.append(trip)
        
        cursor.close()
        conn.close()
        all_trips.sort(key=lambda x: x['reportTime'] if x['reportTime'] else '')
        return jsonify({'success': True, 'trips': all_trips})
        
    except Exception as e:
        print(f"Error fetching trips: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/sort', methods=['POST'])
def timesheet_sort():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        trips = data.get('trips', [])
        trips.sort(key=lambda x: x.get('reportTime', '') or '')
        return jsonify({'success': True, 'trips': trips})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@app.route('/api/timesheet/add-trip', methods=['POST'])
def add_trip():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        report_time = data.get('reportTime', '')
        mobile_id = data.get('equipmentNo', '')
        opr_nrp = data.get('operatorId', '')
        opr_shift = data.get('oprShift', '')
        act_loaderid = data.get('loaderId', '')
        pos_name = data.get('posName', '')
        act_hauldistance = data.get('distance', '')
        
        if not report_time or not mobile_id or not opr_nrp:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        try:
            if 'T' in report_time:
                report_time_dt = datetime.strptime(report_time.split('.')[0], '%Y-%m-%dT%H:%M:%S')
            else:
                report_time_dt = datetime.strptime(report_time, '%Y-%m-%d %H:%M:%S')
            report_time_str = report_time_dt.strftime('%Y-%m-%d %H:%M:%S')
        except Exception as e:
            return jsonify({'success': False, 'message': f'Invalid date format: {str(e)}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        EXEC dbo.miosphere_dtv_insert_trip
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
        
        id_query = """
        SELECT TOP 1 id 
        FROM db_web.dbo.opr_dump 
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
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        trip_id = data.get('id')
        
        if not trip_id:
            return jsonify({'success': False, 'message': 'Missing trip ID'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "EXECUTE dbo.miosphere_dtv_delete_trip @id = ?"
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
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        trip_id = data.get('id')
        
        if not trip_id:
            return jsonify({'success': False, 'message': 'Missing trip ID'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "EXECUTE dbo.miosphere_dtv_restore_trip @id = ?"
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
        
        report_time_str = None
        if report_time:
            try:
                if 'T' in report_time:
                    report_time_dt = datetime.strptime(report_time.split('.')[0], '%Y-%m-%dT%H:%M:%S')
                else:
                    report_time_dt = datetime.strptime(report_time, '%Y-%m-%d %H:%M:%S')
                report_time_str = report_time_dt.strftime('%Y-%m-%d %H:%M:%S')
            except Exception as e:
                return jsonify({'success': False, 'message': f'Invalid date format: {str(e)}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        EXECUTE dbo.miosphere_dtv_modify_trip
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


@app.route('/api/timesheet/update-shift', methods=['POST'])
def update_shift():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        record_id = data.get('id')
        next_id = data.get('next_id')
        reporttime = data.get('reporttime')
        next_reporttime = data.get('next_reporttime')
        mobileid = data.get('mobileid')
        opr_nrp = data.get('opr_nrp')
        hm = data.get('hm')
        next_hm = data.get('next_hm')
        opr_shift = data.get('opr_shift')
        new_shift = data.get('new_shift', '').strip()
        
        if not record_id:
            return jsonify({'success': False, 'message': 'Missing ID'}), 400
        
        if not new_shift:
            return jsonify({'success': False, 'message': 'Missing shift value'}), 400
        
        valid_shifts = ['6', '7', '1', '2', '3']
        if new_shift not in valid_shifts:
            return jsonify({'success': False, 'message': 'Invalid shift value'}), 400
        
        # Convert datetime strings to datetime objects if they exist
        # Original datetime values come as ISO strings from step3 endpoint
        reporttime_dt = None
        if reporttime:
            try:
                if isinstance(reporttime, str):
                    # Handle ISO format strings from step3
                    if 'T' in reporttime:
                        reporttime_dt = datetime.strptime(reporttime.split('.')[0], '%Y-%m-%dT%H:%M:%S')
                    else:
                        reporttime_dt = datetime.strptime(reporttime, '%Y-%m-%d %H:%M:%S')
                else:
                    reporttime_dt = reporttime
            except Exception:
                reporttime_dt = None
        
        next_reporttime_dt = None
        if next_reporttime:
            try:
                if isinstance(next_reporttime, str):
                    # Handle ISO format strings from step3
                    if 'T' in next_reporttime:
                        next_reporttime_dt = datetime.strptime(next_reporttime.split('.')[0], '%Y-%m-%dT%H:%M:%S')
                    else:
                        next_reporttime_dt = datetime.strptime(next_reporttime, '%Y-%m-%d %H:%M:%S')
                else:
                    next_reporttime_dt = next_reporttime
            except Exception:
                next_reporttime_dt = None
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        EXECUTE dbo.miosphere_dtv_update_shift
            @id = ?,
            @next_id = ?,
            @reporttime = ?,
            @next_reporttime = ?,
            @mobileid = ?,
            @opr_nrp = ?,
            @hm = ?,
            @next_hm = ?,
            @opr_shift = ?,
            @new_shift = ?
        """
        cursor.execute(query, (
            record_id,
            next_id,
            reporttime_dt,
            next_reporttime_dt,
            mobileid,
            opr_nrp,
            hm,
            next_hm,
            opr_shift,
            new_shift
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Shift updated successfully'})
    except Exception as e:
        print(f"Error updating shift: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/update-hm', methods=['POST'])
def update_hm():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        record_id = data.get('id')
        opr_nrp = data.get('opr_nrp')
        hm = data.get('hm')
        new_hm = data.get('new_hm')
        opr_shift = data.get('opr_shift')
        
        if not record_id:
            return jsonify({'success': False, 'message': 'Missing ID'}), 400
        
        if not opr_nrp:
            return jsonify({'success': False, 'message': 'Missing opr_nrp'}), 400
        
        if new_hm is None:
            return jsonify({'success': False, 'message': 'Missing new_hm value'}), 400
        
        try:
            new_hm = float(new_hm)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid HM value'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        EXEC dbo.miosphere_dtv_insert_login_update
            @id = ?,
            @b_nrp = ?,
            @a_nrp = ?,
            @b_hm = ?,
            @a_hm = ?,
            @b_shift = ?,
            @a_shift = ?,
            @remark = 'hm_update',
            @updated_by = 'dispatcher'
        """
        cursor.execute(query, (
            record_id,
            opr_nrp,
            opr_nrp,
            hm,
            new_hm,
            opr_shift,
            opr_shift
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'HM Login updated successfully'})
    except Exception as e:
        print(f"Error updating HM Login: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/validate-data', methods=['POST'])
def validate_data():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        record_id = data.get('id')
        opr_nrp = data.get('opr_nrp')
        hm = data.get('hm')
        new_hm = data.get('new_hm')
        opr_shift = data.get('opr_shift')
        
        if not record_id:
            return jsonify({'success': False, 'message': 'Missing ID'}), 400
        
        if not opr_nrp:
            return jsonify({'success': False, 'message': 'Missing opr_nrp'}), 400
        
        if new_hm is None:
            return jsonify({'success': False, 'message': 'Missing new_hm value'}), 400
        
        try:
            new_hm = float(new_hm)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid HM value'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        EXEC dbo.miosphere_dtv_insert_login_update
            @id = ?,
            @b_nrp = ?,
            @a_nrp = ?,
            @b_hm = ?,
            @a_hm = ?,
            @b_shift = ?,
            @a_shift = ?,
            @remark = 'valid',
            @updated_by = 'dispatcher'
        """
        cursor.execute(query, (
            record_id,
            opr_nrp,
            opr_nrp,
            hm,
            new_hm,
            opr_shift,
            opr_shift
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Data validated successfully'})
    except Exception as e:
        print(f"Error validating data: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/update-next-hm', methods=['POST'])
def update_next_hm():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        next_id = data.get('next_id')
        opr_nrp = data.get('opr_nrp')
        next_hm = data.get('next_hm')
        new_hm = data.get('new_hm')
        opr_shift = data.get('opr_shift')
        
        if not next_id:
            return jsonify({'success': False, 'message': 'Missing next_id'}), 400
        
        if not opr_nrp:
            return jsonify({'success': False, 'message': 'Missing opr_nrp'}), 400
        
        if new_hm is None:
            return jsonify({'success': False, 'message': 'Missing new_hm value'}), 400
        
        try:
            new_hm = float(new_hm)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid HM value'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        EXEC dbo.miosphere_dtv_insert_login_update
            @id = ?,
            @b_nrp = ?,
            @a_nrp = ?,
            @b_hm = ?,
            @a_hm = ?,
            @b_shift = ?,
            @a_shift = ?,
            @remark = 'next_hm_update',
            @updated_by = 'dispatcher'
        """
        cursor.execute(query, (
            next_id,
            opr_nrp,
            opr_nrp,
            next_hm,
            new_hm,
            opr_shift,
            opr_shift
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'HM Logout updated successfully'})
    except Exception as e:
        print(f"Error updating HM Logout: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/update-prev-hm', methods=['POST'])
def update_prev_hm():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        prev_id = data.get('prev_id')
        opr_nrp = data.get('opr_nrp')
        prev_hm = data.get('prev_hm')
        new_hm = data.get('new_hm')
        opr_shift = data.get('opr_shift')
        
        if not prev_id:
            return jsonify({'success': False, 'message': 'Missing prev_id'}), 400
        
        if not opr_nrp:
            return jsonify({'success': False, 'message': 'Missing opr_nrp'}), 400
        
        if new_hm is None:
            return jsonify({'success': False, 'message': 'Missing new_hm value'}), 400
        
        try:
            new_hm = float(new_hm)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid HM value'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        EXEC dbo.miosphere_dtv_insert_login_update
            @id = ?,
            @b_nrp = ?,
            @a_nrp = ?,
            @b_hm = ?,
            @a_hm = ?,
            @b_shift = ?,
            @a_shift = ?,
            @remark = 'prev_hm_update',
            @updated_by = 'dispatcher'
        """
        cursor.execute(query, (
            prev_id,
            opr_nrp,
            opr_nrp,
            prev_hm,
            new_hm,
            opr_shift,
            opr_shift
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Previous HM updated successfully'})
    except Exception as e:
        print(f"Error updating previous HM: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timesheet/clear', methods=['POST'])
def timesheet_clear():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    session.pop('timesheet_step1', None)
    session.pop('timesheet_step2', None)
    return jsonify({'success': True, 'message': 'Session cleared'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

