// ============================================================================
// TIMESHEET STEP 002 - Manual Rotation Inject
// ============================================================================
// Step 2: User enters equipment number and operator ID, fetches trips,
// and can add/edit/delete trip rows

// Load Step 2 data from server and render
function loadStep2() {
    // Fetch saved Step 2 data from server
    fetch('/api/timesheet/step2', { method: 'GET', headers: {'Content-Type': 'application/json'} })
        .then(r => r.json())
        .then(data => {
            // Restore saved values if they exist
            if (data.success && data.data) {
                timesheetState.step2.equipmentNumber = data.data.equipmentNumber || '';
                timesheetState.step2.operatorId = data.data.operatorId || '';
                timesheetState.step2.trips = data.data.trips || [];
            }
            renderStep2();
        })
        .catch(() => renderStep2());
}

// Render Step 2 HTML interface
function renderStep2() {
    const container = document.getElementById('timesheet-wizard-container');
    
    // Format date and shifts for display
    const dateStr = timesheetState.selectedDate ? new Date(timesheetState.selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not selected';
    const shiftsStr = timesheetState.selectedShifts.length > 0 ? timesheetState.selectedShifts.join(', ') : 'Not selected';
    
    // Build HTML for Step 2
    container.innerHTML = `
        <div class="wizard-step">
            <div class="step-header">
                <h2>Step 2 of 7 – Manual Ritation Inject</h2>
                <div class="step1-summary">
                    <span><strong>Date:</strong> ${dateStr}</span>
                    <span><strong>Shifts:</strong> ${shiftsStr}</span>
                </div>
            </div>
            <div class="step-content">
                <div class="input-section">
                    <div class="input-row">
                        <div class="input-group">
                            <label class="form-label">Equipment Number</label>
                            <input type="text" id="equipmentNumber" class="form-input" value="${timesheetState.step2.equipmentNumber}" placeholder="Enter equipment number">
                        </div>
                        <div class="input-group">
                            <label class="form-label">Operator ID <span style="font-weight: normal; color: #666;">(Optional)</span></label>
                            <input type="text" id="operatorId" class="form-input" value="${timesheetState.step2.operatorId}" placeholder="Enter operator ID (optional)">
                        </div>
                        <div class="input-group">
                            <label class="form-label">&nbsp;</label>
                            <button class="btn-fetch" onclick="fetchTrips()">Fetch Trips</button>
                        </div>
                        <div class="input-group">
                            <label class="form-label">&nbsp;</label>
                            <button class="btn-clear" onclick="clearTable()">Clear</button>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="trip-table" id="tripTable">
                        <thead>
                            <tr>
                                <th>Row</th><th>Actions</th><th>ID</th><th>Report Time</th><th>Equipment No</th>
                                <th>Operator ID</th><th>Operator Name</th><th>Shift</th><th>Loader ID</th><th>Pos Name</th><th>Distance</th><th>Note</th>
                            </tr>
                        </thead>
                        <tbody id="tripTableBody">${renderTripRows()}</tbody>
                    </table>
                </div>
                <div class="stats-footer">
                    <span id="activeTrips">Active Trips: 0</span>
                    <span id="addedTrips">Added: 0</span>
                    <span id="deletedTrips">Deleted: 0</span>
                </div>
            </div>
            <div class="step-navigation">
                <button class="btn-back" onclick="goBackStep()">Back</button>
                <button class="btn-next" id="nextBtn" onclick="nextStep()">Next</button>
            </div>
        </div>
    `;
    
    updateStats();
}

// Render trip table rows HTML
function renderTripRows() {
    const hasSearched = timesheetState.step2.equipmentNumber;
    
    // Show empty message if no trips
    if (timesheetState.step2.trips.length === 0) {
        if (hasSearched) {
            const operatorMsg = timesheetState.step2.operatorId ? ' and Operator ID combination' : '';
            return `<tr><td colspan="12" class="empty-message">No data found for this Equipment Number${operatorMsg}.</td></tr>`;
        } else {
            return '<tr><td colspan="12" class="empty-message">No trips fetched yet. Enter Equipment Number (Operator ID is optional), then click "Fetch Trips".</td></tr>';
        }
    }
    
    // Sort trips by report time (chronological order)
    const sortedTrips = [...timesheetState.step2.trips].sort((a, b) => {
        const timeA = a.reportTime ? new Date(a.reportTime).getTime() : 0;
        const timeB = b.reportTime ? new Date(b.reportTime).getTime() : 0;
        return timeA - timeB;
    });
    
    // Generate HTML for each trip row
    return sortedTrips.map((trip, index) => createTripRow(trip, index)).join('');
}

// Create HTML for a single trip row
function createTripRow(trip, rowNum) {
    // Determine row type and status
    const isDeleted = trip.note === 'deleted';
    const isManual = trip.note === 'manual';
    const loaderUpper = (trip.loaderId || '').toString().toUpperCase();
    const isLoginRow = loaderUpper === 'LOGIN';
    const isLogoutRow = loaderUpper === 'LOGOUT';
    const isEditing = timesheetState.step2.editingTripId === String(trip.id);
    
    // Build CSS classes for row
    let rowClass = isDeleted ? 'deleted-row' : (isManual ? 'manual-row' : '');
    if (isLoginRow) rowClass += (rowClass ? ' ' : '') + 'login-row';
    if (isLogoutRow) rowClass += (rowClass ? ' ' : '') + 'logout-row';
    if (isEditing) rowClass += (rowClass ? ' ' : '') + 'editing-row';
    
    // Format report time for display
    const reportTimeStr = trip.reportTime ? formatDateTimeDisplay(trip.reportTime) : '-';
    const reportTimeInput = trip.reportTime ? formatDateTimeLocal(trip.reportTime) : '';
    
    // Build actions column HTML based on row type
    let actionsHtml = '<td class="actions-cell"></td>';
    if (isEditing) {
        // Editing mode: show save and cancel buttons
        actionsHtml = `<td class="actions-cell">
            <button class="action-btn save-btn" onclick="saveRow('${trip.id}')" title="Save changes">💾</button>
            <button class="action-btn cancel-btn" onclick="cancelEdit()" title="Cancel">✖️</button>
        </td>`;
    } else if (isLoginRow || isLogoutRow) {
        // Login/Logout rows: only allow adding rows
        actionsHtml = `<td class="actions-cell">
            <button class="action-btn add-btn" onclick="addRowBelow('${trip.id}')" title="Add row below">➕</button>
        </td>`;
    } else if (isDeleted) {
        // Deleted rows: only allow restoring
        actionsHtml = `<td class="actions-cell">
            <button class="action-btn restore-btn" onclick="restoreRow('${trip.id}')" title="Restore row">↻</button>
        </td>`;
    } else {
        // Normal rows: allow add, delete, and modify
        actionsHtml = `<td class="actions-cell">
            <button class="action-btn add-btn" onclick="addRowBelow('${trip.id}')" title="Add row below">➕</button>
            <button class="action-btn delete-btn" onclick="deleteRow('${trip.id}')" title="Delete row">🗑️</button>
            <button class="action-btn modify-btn" onclick="modifyRow('${trip.id}')" title="Modify row">✏️</button>
        </td>`;
    }
    
    // Build editable cells (if editing) or display cells
    const reportTimeCell = isEditing ? 
        `<td><input type="datetime-local" id="edit-reportTime-${trip.id}" value="${reportTimeInput}" class="edit-input" step="60" lang="en-GB"></td>` :
        `<td>${reportTimeStr}</td>`;
    const loaderIdCell = isEditing ?
        `<td><input type="text" id="edit-loaderId-${trip.id}" value="${escapeHtml(trip.loaderId || '')}" class="edit-input"></td>` :
        `<td>${escapeHtml(trip.loaderId || '-')}</td>`;
    const posNameCell = isEditing ?
        `<td><input type="text" id="edit-posName-${trip.id}" value="${escapeHtml(trip.posName || '')}" class="edit-input"></td>` :
        `<td>${escapeHtml(trip.posName || '-')}</td>`;
    const distanceCell = isEditing ?
        `<td><input type="number" id="edit-distance-${trip.id}" value="${trip.distance || ''}" class="edit-input"></td>` :
        `<td>${trip.distance || '-'}</td>`;
    
    // Return complete row HTML
    return `<tr data-row-id="${trip.id || rowNum}" class="${rowClass}">
        <td>${rowNum + 1}</td>${actionsHtml}
        <td>${trip.id || '-'}</td>${reportTimeCell}
        <td>${escapeHtml(trip.equipmentNo || '-')}</td>
        <td>${escapeHtml(trip.operatorId || '-')}</td>
        <td>${escapeHtml(trip.operatorName || '-')}</td>
        <td>${escapeHtml(trip.oprShift || '-')}</td>
        ${loaderIdCell}${posNameCell}${distanceCell}
        <td class="note-cell">${trip.note || ''}</td>
    </tr>`;
}

// Fetch trips from server based on equipment number and operator ID
function fetchTrips() {
    const equipmentNumber = document.getElementById('equipmentNumber').value.trim();
    const operatorId = document.getElementById('operatorId').value.trim();
    
    // Validate inputs
    if (!equipmentNumber) {
        alert('Please enter Equipment Number');
        return;
    }
    
    if (!timesheetState.selectedDate || timesheetState.selectedShifts.length === 0) {
        alert('Please complete Step 1 first');
        return;
    }
    
    // Save to state
    timesheetState.step2.equipmentNumber = equipmentNumber;
    timesheetState.step2.operatorId = operatorId;
    
    // Build API request parameters
    const params = new URLSearchParams({
        equipment: equipmentNumber,
        date: timesheetState.selectedDate,
        shifts: timesheetState.selectedShifts.join(',')
    });
    
    // Add operator if provided
    if (operatorId) {
        params.append('operator', operatorId);
    }
    
    // Fetch trips from server
    fetch(`/api/trips?${params}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                timesheetState.step2.trips = data.trips || [];
                // Save operator name from first trip if available
                const firstOp = timesheetState.step2.trips.find(t => t.operatorName && t.operatorName.trim() !== '');
                if (firstOp) timesheetState.step2.operatorName = firstOp.operatorName;
                renderStep2();
            } else {
                alert('Error fetching trips: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => alert('Error fetching trips: ' + error.message));
}

// Clear table and input fields
function clearTable() {
    timesheetState.step2.trips = [];
    timesheetState.step2.equipmentNumber = '';
    timesheetState.step2.operatorId = '';
    
    const equipmentInput = document.getElementById('equipmentNumber');
    const operatorInput = document.getElementById('operatorId');
    if (equipmentInput) equipmentInput.value = '';
    if (operatorInput) operatorInput.value = '';
    
    renderStep2();
}

// Add new trip row below selected trip
function addRowBelow(tripId) {
    const currentTrip = timesheetState.step2.trips.find(t => String(t.id) === String(tripId));
    if (!currentTrip) return;
    
    const loaderUpper = (currentTrip.loaderId || '').toString().toUpperCase();
    const isLoginRow = loaderUpper === 'LOGIN';
    const isLogoutRow = loaderUpper === 'LOGOUT';
    
    let referenceTrip = currentTrip;
    
    // For login/logout rows, find reference trip (next for login, previous for logout)
    if (isLoginRow || isLogoutRow) {
        const sortedTrips = [...timesheetState.step2.trips].sort((a, b) => {
            const timeA = a.reportTime ? new Date(a.reportTime).getTime() : 0;
            const timeB = b.reportTime ? new Date(b.reportTime).getTime() : 0;
            return timeA - timeB;
        });
        
        const currentIndex = sortedTrips.findIndex(t => String(t.id) === String(tripId));
        
        if (isLoginRow) {
            // Find next non-login/logout trip
            for (let i = currentIndex + 1; i < sortedTrips.length; i++) {
                const trip = sortedTrips[i];
                const tripLoaderUpper = (trip.loaderId || '').toString().toUpperCase();
                if (tripLoaderUpper !== 'LOGIN' && tripLoaderUpper !== 'LOGOUT') {
                    referenceTrip = trip;
                    break;
                }
            }
        } else if (isLogoutRow) {
            // Find previous non-login/logout trip
            for (let i = currentIndex - 1; i >= 0; i--) {
                const trip = sortedTrips[i];
                const tripLoaderUpper = (trip.loaderId || '').toString().toUpperCase();
                if (tripLoaderUpper !== 'LOGIN' && tripLoaderUpper !== 'LOGOUT') {
                    referenceTrip = trip;
                    break;
                }
            }
        }
    }
    
    // Generate unique ID for new trip
    manualIdCounter++;
    const newId = 10000000 + (manualIdCounter % 90000000);
    
    // Create new trip object
    const newTrip = {
        id: newId,
        reportTime: addOneMinute(referenceTrip.reportTime),
        equipmentNo: referenceTrip.equipmentNo || '',
        operatorId: referenceTrip.operatorId || '',
        operatorName: referenceTrip.operatorName || '',
        oprShift: referenceTrip.oprShift || '',
        loaderId: referenceTrip.loaderId || '',
        posName: referenceTrip.posName || '',
        distance: referenceTrip.distance || '',
        note: 'manual'
    };
    
    // Save to database
    fetch('/api/timesheet/add-trip', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newTrip)
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            if (data.id) newTrip.id = data.id;
            timesheetState.step2.trips.push(newTrip);
            // Sort trips by time
            timesheetState.step2.trips.sort((a, b) => {
                const timeA = a.reportTime ? new Date(a.reportTime).getTime() : 0;
                const timeB = b.reportTime ? new Date(b.reportTime).getTime() : 0;
                return timeA - timeB;
            });
            renderStep2();
        } else {
            alert('Error adding trip to database: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => alert('Error adding trip: ' + error.message));
}

// Delete a trip row (marks as deleted, doesn't remove from database)
function deleteRow(tripId) {
    if (!confirm('Are you sure you want to delete this row?')) return;
    const trip = timesheetState.step2.trips.find(t => String(t.id) === String(tripId));
    if (!trip) return;
    
    fetch('/api/timesheet/delete-trip', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: tripId})
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            trip.note = 'deleted';
            renderStep2();
        } else {
            alert('Error deleting trip: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => alert('Error deleting trip: ' + error.message));
}

// Restore a deleted trip row
function restoreRow(tripId) {
    const trip = timesheetState.step2.trips.find(t => String(t.id) === String(tripId));
    if (!trip) return;
    
    fetch('/api/timesheet/restore-trip', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: tripId})
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            trip.note = '';
            renderStep2();
        } else {
            alert('Error restoring trip: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => alert('Error restoring trip: ' + error.message));
}

// Enter edit mode for a trip row
function modifyRow(tripId) {
    timesheetState.step2.editingTripId = String(tripId);
    renderStep2();
}

// Save edited trip row
function saveRow(tripId) {
    const trip = timesheetState.step2.trips.find(t => String(t.id) === String(tripId));
    if (!trip) return;
    
    // Get values from input fields
    const reportTime = document.getElementById(`edit-reportTime-${tripId}`).value;
    const loaderId = document.getElementById(`edit-loaderId-${tripId}`).value;
    const posName = document.getElementById(`edit-posName-${tripId}`).value;
    const distance = document.getElementById(`edit-distance-${tripId}`).value;
    
    // Update trip object
    trip.reportTime = reportTime ? new Date(reportTime).toISOString() : trip.reportTime;
    trip.loaderId = loaderId;
    trip.posName = posName;
    trip.distance = distance || '';
    
    // Save to database
    fetch('/api/timesheet/update-trip', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            id: tripId,
            reportTime: reportTime ? formatDateTimeForDB(new Date(reportTime)) : '',
            loaderId: loaderId,
            posName: posName,
            distance: distance || ''
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            timesheetState.step2.editingTripId = null;
            // Re-sort if time changed
            if (reportTime) {
                timesheetState.step2.trips.sort((a, b) => {
                    const timeA = a.reportTime ? new Date(a.reportTime).getTime() : 0;
                    const timeB = b.reportTime ? new Date(b.reportTime).getTime() : 0;
                    return timeA - timeB;
                });
            }
            renderStep2();
        } else {
            alert('Error updating trip: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => alert('Error updating trip: ' + error.message));
}

// Cancel edit mode
function cancelEdit() {
    timesheetState.step2.editingTripId = null;
    renderStep2();
}

// Update statistics footer (active, added, deleted trip counts)
function updateStats() {
    const activeTrips = timesheetState.step2.trips.filter(t => t.note !== 'deleted').length;
    const addedTrips = timesheetState.step2.trips.filter(t => t.note === 'manual').length;
    const deletedTrips = timesheetState.step2.trips.filter(t => t.note === 'deleted').length;
    
    const activeTripsEl = document.getElementById('activeTrips');
    const addedTripsEl = document.getElementById('addedTrips');
    const deletedTripsEl = document.getElementById('deletedTrips');
    
    if (activeTripsEl) activeTripsEl.textContent = `Active Trips: ${activeTrips}`;
    if (addedTripsEl) addedTripsEl.textContent = `Added: ${addedTrips}`;
    if (deletedTripsEl) deletedTripsEl.textContent = `Deleted: ${deletedTrips}`;
}

