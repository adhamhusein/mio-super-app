// Timesheet Validation Wizard - Client-side UI Logic Only

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let timesheetState = {
    step: 1,
    selectedDate: '',
    selectedShifts: [],
    unitType: '3 Shift',
    hasFriday: false,
    step2: {
        equipmentNumber: '',
        operatorId: '',
        trips: [],
        editingTripId: null // Track which trip is being edited
    }
};

let manualIdCounter = 0; // Counter for unique manual trip IDs

// ============================================================================
// STEP NAVIGATION
// ============================================================================

function initTimesheetWizard() {
    loadStep(1);
}

function loadStep(stepNumber) {
    timesheetState.step = stepNumber;
    if (stepNumber === 1) loadStep1();
    else if (stepNumber === 2) loadStep2();
}

// ============================================================================
// STEP 1: DATE & SHIFT SELECTION
// ============================================================================

function loadStep1() {
    fetch('/api/timesheet/step1', { method: 'GET', headers: {'Content-Type': 'application/json'} })
        .then(r => r.json())
        .then(data => {
            if (data.success && data.data) {
                timesheetState.selectedDate = data.data.selectedDate || '';
                timesheetState.selectedShifts = data.data.selectedShifts || [];
                timesheetState.unitType = data.data.unitType || '3 Shift';
            }
            renderStep1();
        })
        .catch(() => renderStep1());
}

function renderStep1() {
    const container = document.getElementById('timesheet-wizard-container');
    
    // Detect Friday
    if (timesheetState.selectedDate) {
        const d = new Date(timesheetState.selectedDate + 'T00:00:00');
        timesheetState.hasFriday = d.getDay() === 5;
    } else {
        timesheetState.hasFriday = false;
    }
    
    container.innerHTML = `
        <div class="wizard-step">
            <div class="step-header">
                <h2>Step 1 of 7 – Date & Shift Selection</h2>
                <p class="step-description">Select dates and their applicable shifts before proceeding.</p>
            </div>
            <div class="step-content">
                <div class="form-row">
                    <div class="form-section">
                        <label class="form-label">Date Picker</label>
                        <input type="date" id="datePicker" class="date-picker" value="${timesheetState.selectedDate}" onchange="handleDateChange(this.value)">
                    </div>
                    <div class="form-section">
                        <label class="form-label">Shift Picker</label>
                        <div class="custom-dropdown">
                            <button type="button" class="dropdown-toggle" onclick="toggleShiftDropdown()">
                                <span id="dropdownText">${timesheetState.selectedShifts.length > 0 ? timesheetState.selectedShifts.join(', ') : 'Select shifts...'}</span>
                                <span class="dropdown-arrow">▼</span>
                            </button>
                            <div class="dropdown-menu" id="shiftDropdownMenu" style="display: none;">
                                <label class="dropdown-option"><input type="checkbox" value="S01" ${timesheetState.selectedShifts.includes('S01') ? 'checked' : ''} onchange="handleShiftCheckbox('S01', this.checked)"><span>S01</span></label>
                                <label class="dropdown-option"><input type="checkbox" value="S02" ${timesheetState.selectedShifts.includes('S02') ? 'checked' : ''} onchange="handleShiftCheckbox('S02', this.checked)"><span>S02</span></label>
                                <label class="dropdown-option"><input type="checkbox" value="S03" ${timesheetState.selectedShifts.includes('S03') ? 'checked' : ''} onchange="handleShiftCheckbox('S03', this.checked)"><span>S03</span></label>
                                <label class="dropdown-option"><input type="checkbox" value="S08" ${timesheetState.selectedShifts.includes('S08') ? 'checked' : ''} onchange="handleShiftCheckbox('S08', this.checked)"><span>S08</span></label>
                                <label class="dropdown-option"><input type="checkbox" value="S09" ${timesheetState.selectedShifts.includes('S09') ? 'checked' : ''} onchange="handleShiftCheckbox('S09', this.checked)"><span>S09</span></label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ${timesheetState.hasFriday ? `
            <div class="alert-banner alert-warning" id="fridayAlert">
                <span class="alert-icon">⚠️</span>
                <span class="alert-text">Friday detected — please update Unit Type from 3-Shift to 2-Shift (Long Shift)</span>
            </div>
            ` : ''}
            <div class="step-navigation">
                <button class="btn-cancel" onclick="cancelWizard()">Cancel</button>
                <button class="btn-next" id="nextBtn" onclick="nextStep()" ${!timesheetState.selectedDate || timesheetState.selectedShifts.length === 0 ? 'disabled' : ''}>Next</button>
            </div>
        </div>
    `;
}

function handleDateChange(dateString) {
    timesheetState.selectedDate = dateString || '';
    checkForFriday();
    validateStep1();
}

function checkForFriday() {
    const hadFriday = timesheetState.hasFriday;
    if (timesheetState.selectedDate) {
        const d = new Date(timesheetState.selectedDate + 'T00:00:00');
        timesheetState.hasFriday = d.getDay() === 5;
    } else {
        timesheetState.hasFriday = false;
    }
    if (hadFriday !== timesheetState.hasFriday) renderStep1();
}

function toggleShiftDropdown() {
    const menu = document.getElementById('shiftDropdownMenu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function handleShiftCheckbox(shift, isChecked) {
    if (isChecked) {
        if (!timesheetState.selectedShifts.includes(shift)) {
            timesheetState.selectedShifts.push(shift);
        }
    } else {
        timesheetState.selectedShifts = timesheetState.selectedShifts.filter(s => s !== shift);
    }
    timesheetState.selectedShifts.sort();
    updateDropdownText();
    validateStep1();
}

function updateDropdownText() {
    const dropdownText = document.getElementById('dropdownText');
    if (dropdownText) {
        dropdownText.textContent = timesheetState.selectedShifts.length > 0 
            ? timesheetState.selectedShifts.join(', ') 
            : 'Select shifts...';
    }
}

function validateStep1() {
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.disabled = !(timesheetState.selectedDate && timesheetState.selectedShifts.length > 0);
    }
}

function cancelWizard() {
    if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
        fetch('/api/timesheet/clear', { method: 'POST' });
        document.getElementById('timesheet-wizard-container').innerHTML = `
            <div class="wizard-start">
                <h2>Timesheet Validation Wizard</h2>
                <p>Click "Start" to begin the validation process.</p>
                <button class="btn-primary" onclick="initTimesheetWizard()">Start</button>
            </div>
        `;
    }
}

function nextStep() {
    if (timesheetState.step === 1) {
        const step1Data = {
            selectedDate: timesheetState.selectedDate,
            selectedShifts: timesheetState.selectedShifts,
            unitType: timesheetState.unitType
        };
        fetch('/api/timesheet/step1', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(step1Data)
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) loadStep(2);
            else alert('Error saving step 1: ' + (data.message || 'Unknown error'));
        })
        .catch(error => alert('Error saving step 1: ' + error.message));
    } else if (timesheetState.step === 2) {
        const step2Data = {
            equipmentNumber: timesheetState.step2.equipmentNumber,
            operatorId: timesheetState.step2.operatorId,
            trips: timesheetState.step2.trips
        };
        fetch('/api/timesheet/step2', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(step2Data)
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) alert('Step 2 saved successfully! Step 3 coming soon...');
            else alert('Error saving step 2: ' + (data.message || 'Unknown error'));
        })
        .catch(error => alert('Error saving step 2: ' + error.message));
    }
}

function goBackStep() {
    if (timesheetState.step === 2) loadStep(1);
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.querySelector('.custom-dropdown');
    const menu = document.getElementById('shiftDropdownMenu');
    if (dropdown && menu && !dropdown.contains(event.target)) {
        menu.style.display = 'none';
    }
});

// ============================================================================
// STEP 2: MANUAL ROTATION INJECT
// ============================================================================

function loadStep2() {
    fetch('/api/timesheet/step2', { method: 'GET', headers: {'Content-Type': 'application/json'} })
        .then(r => r.json())
        .then(data => {
            if (data.success && data.data) {
                timesheetState.step2.equipmentNumber = data.data.equipmentNumber || '';
                timesheetState.step2.operatorId = data.data.operatorId || '';
                timesheetState.step2.trips = data.data.trips || [];
            }
            renderStep2();
        })
        .catch(() => renderStep2());
}

function renderStep2() {
    const container = document.getElementById('timesheet-wizard-container');
    const dateStr = timesheetState.selectedDate ? new Date(timesheetState.selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not selected';
    const shiftsStr = timesheetState.selectedShifts.length > 0 ? timesheetState.selectedShifts.join(', ') : 'Not selected';
    
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

// Render trip table rows
function renderTripRows() {
    // Check if user has attempted to fetch trips
    const hasSearched = timesheetState.step2.equipmentNumber;
    
    if (timesheetState.step2.trips.length === 0) {
        if (hasSearched) {
            const operatorMsg = timesheetState.step2.operatorId ? ' and Operator ID combination' : '';
            return `<tr><td colspan="12" class="empty-message">No data found for this Equipment Number${operatorMsg}.</td></tr>`;
        } else {
            return '<tr><td colspan="12" class="empty-message">No trips fetched yet. Enter Equipment Number (Operator ID is optional), then click "Fetch Trips".</td></tr>';
        }
    }
    
    // Sort chronologically by reportTime
    const sortedTrips = [...timesheetState.step2.trips].sort((a, b) => {
        const timeA = a.reportTime ? new Date(a.reportTime).getTime() : 0;
        const timeB = b.reportTime ? new Date(b.reportTime).getTime() : 0;
        return timeA - timeB;
    });
    
    return sortedTrips.map((trip, index) => createTripRow(trip, index)).join('');
}

// Create a single trip row HTML
function createTripRow(trip, rowNum) {
    const isDeleted = trip.note === 'deleted';
    const isManual = trip.note === 'manual';
    const loaderUpper = (trip.loaderId || '').toString().toUpperCase();
    const isLoginRow = loaderUpper === 'LOGIN';
    const isLogoutRow = loaderUpper === 'LOGOUT';
    const isEditing = timesheetState.step2.editingTripId === String(trip.id);
    
    let rowClass = isDeleted ? 'deleted-row' : (isManual ? 'manual-row' : '');
    if (isLoginRow) rowClass += (rowClass ? ' ' : '') + 'login-row';
    if (isLogoutRow) rowClass += (rowClass ? ' ' : '') + 'logout-row';
    if (isEditing) rowClass += (rowClass ? ' ' : '') + 'editing-row';
    
    const reportTimeStr = trip.reportTime ? formatDateTimeDisplay(trip.reportTime) : '-';
    const reportTimeInput = trip.reportTime ? formatDateTimeLocal(trip.reportTime) : '';
    
    // Actions column based on row type
    let actionsHtml = '<td class="actions-cell"></td>';
    if (isEditing) {
        actionsHtml = `<td class="actions-cell">
            <button class="action-btn save-btn" onclick="saveRow('${trip.id}')" title="Save changes">💾</button>
            <button class="action-btn cancel-btn" onclick="cancelEdit()" title="Cancel">✖️</button>
        </td>`;
    } else if (isLoginRow || isLogoutRow) {
        actionsHtml = `<td class="actions-cell">
            <button class="action-btn add-btn" onclick="addRowBelow('${trip.id}')" title="Add row below">➕</button>
        </td>`;
    } else if (isDeleted) {
        actionsHtml = `<td class="actions-cell">
            <button class="action-btn restore-btn" onclick="restoreRow('${trip.id}')" title="Restore row">↻</button>
        </td>`;
    } else {
        actionsHtml = `<td class="actions-cell">
            <button class="action-btn add-btn" onclick="addRowBelow('${trip.id}')" title="Add row below">➕</button>
            <button class="action-btn delete-btn" onclick="deleteRow('${trip.id}')" title="Delete row">🗑️</button>
            <button class="action-btn modify-btn" onclick="modifyRow('${trip.id}')" title="Modify row">✏️</button>
        </td>`;
    }
    
    // Editable fields when in edit mode
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDateTimeLocal(dateTimeStr) {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDateTimeDisplay(dateTimeStr) {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDateTimeForDB(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function addOneMinute(dateTimeStr) {
    if (!dateTimeStr) {
        return formatDateTimeForDB(new Date());
    }
    const date = new Date(dateTimeStr);
    date.setMinutes(date.getMinutes() + 1);
    return formatDateTimeForDB(date);
}

// ============================================================================
// TRIP ACTIONS (Add, Delete, Modify, Restore)
// ============================================================================

function fetchTrips() {
    const equipmentNumber = document.getElementById('equipmentNumber').value.trim();
    const operatorId = document.getElementById('operatorId').value.trim();
    
    if (!equipmentNumber) {
        alert('Please enter Equipment Number');
        return;
    }
    
    if (!timesheetState.selectedDate || timesheetState.selectedShifts.length === 0) {
        alert('Please complete Step 1 first');
        return;
    }
    
    timesheetState.step2.equipmentNumber = equipmentNumber;
    timesheetState.step2.operatorId = operatorId;
    
    const params = new URLSearchParams({
        equipment: equipmentNumber,
        date: timesheetState.selectedDate,
        shifts: timesheetState.selectedShifts.join(',')
    });
    
    // Add operator only if provided
    if (operatorId) {
        params.append('operator', operatorId);
    }
    
    fetch(`/api/trips?${params}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                timesheetState.step2.trips = data.trips || [];
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
    // Clear trips array
    timesheetState.step2.trips = [];
    timesheetState.step2.equipmentNumber = '';
    timesheetState.step2.operatorId = '';
    
    // Clear input fields
    const equipmentInput = document.getElementById('equipmentNumber');
    const operatorInput = document.getElementById('operatorId');
    
    if (equipmentInput) equipmentInput.value = '';
    if (operatorInput) operatorInput.value = '';
    
    // Re-render to show empty state
    renderStep2();
}

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
            for (let i = currentIndex + 1; i < sortedTrips.length; i++) {
                const trip = sortedTrips[i];
                const tripLoaderUpper = (trip.loaderId || '').toString().toUpperCase();
                if (tripLoaderUpper !== 'LOGIN' && tripLoaderUpper !== 'LOGOUT') {
                    referenceTrip = trip;
                    break;
                }
            }
        } else if (isLogoutRow) {
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
    
    // Generate 8-digit ID and create new trip
    manualIdCounter++;
    const newId = 10000000 + (manualIdCounter % 90000000);
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
    
    // Insert into database
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

function modifyRow(tripId) {
    timesheetState.step2.editingTripId = String(tripId);
    renderStep2();
}

function saveRow(tripId) {
    const trip = timesheetState.step2.trips.find(t => String(t.id) === String(tripId));
    if (!trip) return;
    
    const reportTime = document.getElementById(`edit-reportTime-${tripId}`).value;
    const loaderId = document.getElementById(`edit-loaderId-${tripId}`).value;
    const posName = document.getElementById(`edit-posName-${tripId}`).value;
    const distance = document.getElementById(`edit-distance-${tripId}`).value;
    
    trip.reportTime = reportTime ? new Date(reportTime).toISOString() : trip.reportTime;
    trip.loaderId = loaderId;
    trip.posName = posName;
    trip.distance = distance || '';
    
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

function cancelEdit() {
    timesheetState.step2.editingTripId = null;
    renderStep2();
}

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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function(mutations) {
        const container = document.getElementById('timesheet-wizard-container');
        if (container && container.innerHTML.trim() === '') {
            initTimesheetWizard();
        }
    });
    
    const featureContent = document.getElementById('featureContent');
    if (featureContent) {
        observer.observe(featureContent, { childList: true, subtree: true });
    }
    
    document.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
});
