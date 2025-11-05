// ============================================================================
// TIMESHEET STEP 001 - Date & Shift Selection
// ============================================================================
// Step 1: User selects date and shifts before proceeding
// This step also detects if selected date is Friday (for shift type warning)

// Load Step 1 data from server and render
function loadStep1() {
    // Fetch saved Step 1 data from server
    fetch('/api/timesheet/step1', { method: 'GET', headers: {'Content-Type': 'application/json'} })
        .then(r => r.json())
        .then(data => {
            // Restore saved values if they exist
            if (data.success && data.data) {
                timesheetState.selectedDate = data.data.selectedDate || '';
                timesheetState.selectedShifts = data.data.selectedShifts || [];
                timesheetState.unitType = data.data.unitType || '3 Shift';
            }
            renderStep1();
        })
        .catch(() => renderStep1());
}

// Render Step 1 HTML interface
function renderStep1() {
    const container = document.getElementById('timesheet-wizard-container');
    
    // Check if selected date is Friday (for shift type warning)
    if (timesheetState.selectedDate) {
        const d = new Date(timesheetState.selectedDate + 'T00:00:00');
        timesheetState.hasFriday = d.getDay() === 5; // 5 = Friday
    } else {
        timesheetState.hasFriday = false;
    }
    
    // Build HTML for Step 1
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

// Handle date input change
function handleDateChange(dateString) {
    timesheetState.selectedDate = dateString || '';
    checkForFriday();
    validateStep1();
}

// Check if selected date is Friday and update flag
function checkForFriday() {
    const hadFriday = timesheetState.hasFriday;
    if (timesheetState.selectedDate) {
        const d = new Date(timesheetState.selectedDate + 'T00:00:00');
        timesheetState.hasFriday = d.getDay() === 5; // 5 = Friday
    } else {
        timesheetState.hasFriday = false;
    }
    // Re-render if Friday status changed (to show/hide warning)
    if (hadFriday !== timesheetState.hasFriday) renderStep1();
}

// Toggle shift dropdown menu visibility
function toggleShiftDropdown() {
    const menu = document.getElementById('shiftDropdownMenu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Handle shift checkbox change
function handleShiftCheckbox(shift, isChecked) {
    if (isChecked) {
        // Add shift if not already in list
        if (!timesheetState.selectedShifts.includes(shift)) {
            timesheetState.selectedShifts.push(shift);
        }
    } else {
        // Remove shift from list
        timesheetState.selectedShifts = timesheetState.selectedShifts.filter(s => s !== shift);
    }
    // Sort shifts alphabetically
    timesheetState.selectedShifts.sort();
    updateDropdownText();
    validateStep1();
}

// Update dropdown text to show selected shifts
function updateDropdownText() {
    const dropdownText = document.getElementById('dropdownText');
    if (dropdownText) {
        dropdownText.textContent = timesheetState.selectedShifts.length > 0 
            ? timesheetState.selectedShifts.join(', ') 
            : 'Select shifts...';
    }
}

// Validate Step 1 - enable/disable Next button
function validateStep1() {
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        // Enable Next only if both date and at least one shift are selected
        nextBtn.disabled = !(timesheetState.selectedDate && timesheetState.selectedShifts.length > 0);
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.querySelector('.custom-dropdown');
    const menu = document.getElementById('shiftDropdownMenu');
    if (dropdown && menu && !dropdown.contains(event.target)) {
        menu.style.display = 'none';
    }
});

