// ============================================================================
// TIMESHEET STEP 003 - Realtime HM Validation
// ============================================================================
// Step 3: Shows realtime hour meter validation data from database
// Displays validation results with color-coded cells and clickable ID buttons

// Load Step 3 data from server and render
function loadStep3() {
    // Fetch realtime HM validation data from server
    fetch('/api/timesheet/step3', { method: 'GET', headers: {'Content-Type': 'application/json'} })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                // Store data in state
                timesheetState.step3 = data.rows || [];
                timesheetState.step3_columns = data.columns || [];
            } else {
                // Set empty arrays if fetch failed
                timesheetState.step3 = [];
                timesheetState.step3_columns = [];
            }
            renderStep3();
        })
        .catch(() => {
            timesheetState.step3 = [];
            timesheetState.step3_columns = [];
            renderStep3();
        });
}

// Render Step 3 HTML interface with validation table
function renderStep3() {
    const container = document.getElementById('timesheet-wizard-container');
    const rows = timesheetState.step3 || [];
    
    // Define which columns to display and their labels
    const displaySpec = [
        { key: 'NO', label: 'NO' },
        { key: 'id', label: 'ID' },
        { key: 'mig_type', label: 'UNIT TYPE' },
        { key: 'MOBILEID', label: 'MOBILEID' },
        { key: 'opr_nrp', label: 'NRP OPERATOR' },
        { key: 'opr_username', label: 'NAMA OPERATOR' },
        { key: 'opr_shift', label: 'SHIFT' },
        { key: 'lgn_pattern', label: 'PATTERN' },
        { key: 'prev_hm', label: 'PREVIOUS HM LOGOUT' },
        { key: 'hm', label: 'HM LOGIN' },
        { key: 'next_hm', label: 'HM LOGOUT' },
        { key: 'TOTAL_HM', label: 'TOTAL HM' },
        { key: 'HM_LONCAT', label: 'HM LONCAT' },
        { key: 'reporttime', label: 'Login Time' },
        { key: 'next_reporttime', label: 'Logout Time' },
        { key: 'problem', label: 'Problem' }
    ];

    // Helper function to get value from row (case-insensitive key lookup)
    function getVal(row, key) {
        if (!row) return null;
        // Try exact match first
        if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
        // Try case-insensitive match
        const lower = key.toLowerCase();
        for (const k of Object.keys(row)) {
            if (k.toLowerCase() === lower) return row[k];
        }
        return null;
    }

    let tableHtml = '';
    
    if (rows.length === 0) {
        // Show empty message if no data
        tableHtml = '<div class="empty-message">No realtime HM validation data available.</div>';
    } else {
        // Define which headers should have yellow background (special validation columns)
        const yellowHeaders = new Set([
            'PREVIOUS HM LOGOUT','TOTAL HM','HM LONCAT','Problem'
        ]);

        // Build table header
        const thead = `<thead><tr>${displaySpec.map(c => {
            const isSpecial = yellowHeaders.has(c.label);
            const headerClass = isSpecial ? 'header-special' : 'header-default';
            const operatorClass = (c.label === 'NAMA OPERATOR') ? 'col-operator' : '';
            let label = c.label;
            // Add line break for long header
            if (label === 'PREVIOUS HM LOGOUT') label = 'PREVIOUS<br>HM LOGOUT';
            return `<th class="${headerClass} ${operatorClass}">${label}</th>`;
        }).join('')}</tr></thead>`;

        // Build table body rows
        const tbody = rows.map((r, idx) => {
            // Get HM values and calculate totals
            const prev_hm_v = Number.parseFloat(getVal(r, 'prev_hm'));
            const hm_v = Number.parseFloat(getVal(r, 'hm'));
            const next_hm_v = Number.parseFloat(getVal(r, 'next_hm'));

            // Calculate total HM (logout - login)
            const total_hm_val = (!Number.isNaN(next_hm_v) && !Number.isNaN(hm_v)) ? +(next_hm_v - hm_v) : null;
            // Calculate HM jump (login - previous logout)
            const hm_loncat_val = (!Number.isNaN(hm_v) && !Number.isNaN(prev_hm_v)) ? +(hm_v - prev_hm_v) : null;

            // Get pattern value
            const patternVal = (getVal(r, 'lgn_pattern') || '').toString();

            // Helper to check if flag value matches expected text (case-insensitive)
            function flagEq(key, expected) {
                const raw = getVal(r, key);
                if (raw === null || typeof raw === 'undefined') return false;
                return String(raw).trim().toLowerCase() === String(expected).trim().toLowerCase();
            }

            // Build cells for each column
            const cells = displaySpec.map(col => {
                let txt = '';
                const classes = [];
                if (col.label === 'NAMA OPERATOR') classes.push('col-operator');
                if (col.key === 'problem') classes.push('col-operator');

                if (col.key === 'NO') {
                    // Row number
                    txt = String(idx + 1);
                } else if (col.key === 'id') {
                    // ID column - render as clickable button
                    const idVal = getVal(r, col.key);
                    const mobileid = getVal(r, 'MOBILEID');
                    txt = `<button class="id-btn" onclick="showHistoricalPanel('${idVal}','${mobileid}')">${escapeHtml(idVal)}</button>`;
                } else if (col.key === 'opr_shift') {
                    // Shift column - render as clickable button
                    const shiftVal = getVal(r, col.key);
                    txt = `<button class="id-btn shift-btn" onclick="showShiftUpdateForm(${idx}, '${escapeHtml(String(shiftVal || ''))}')" title="Click to update shift">${escapeHtml(String(shiftVal || ''))}</button>`;
                } else if (col.key === 'prev_hm') {
                    // Previous HM Logout column - render as clickable button
                    const isPrevHmNull = prev_hm_v === null || Number.isNaN(prev_hm_v);
                    const prevHmVal = !isPrevHmNull ? prev_hm_v.toFixed(2) : '';
                    const disabledAttr = isPrevHmNull ? 'disabled' : '';
                    const disabledClass = isPrevHmNull ? 'disabled' : '';
                    const onClickHandler = isPrevHmNull ? '' : `onclick="showPrevHmUpdateForm(${idx}, '${escapeHtml(String(prevHmVal))}')"`;
                    const titleText = isPrevHmNull ? 'Previous HM is not available' : 'Click to update previous HM logout';
                    txt = `<button class="id-btn hm-btn ${disabledClass}" ${onClickHandler} ${disabledAttr} title="${titleText}">${escapeHtml(String(prevHmVal || '-'))}</button>`;
                } else if (col.key === 'hm') {
                    // HM Login column - render as clickable button
                    const isHmNull = hm_v === null || Number.isNaN(hm_v);
                    const hmVal = !isHmNull ? hm_v.toFixed(2) : '';
                    const disabledAttr = isHmNull ? 'disabled' : '';
                    const disabledClass = isHmNull ? 'disabled' : '';
                    const onClickHandler = isHmNull ? '' : `onclick="showHmUpdateForm(${idx}, '${escapeHtml(String(hmVal))}')"`;
                    const titleText = isHmNull ? 'HM Login is not available' : 'Click to update HM login';
                    txt = `<button class="id-btn hm-btn ${disabledClass}" ${onClickHandler} ${disabledAttr} title="${titleText}">${escapeHtml(String(hmVal || '-'))}</button>`;
                } else if (col.key === 'next_hm') {
                    // HM Logout column - render as clickable button
                    const isNextHmNull = next_hm_v === null || Number.isNaN(next_hm_v);
                    const nextHmVal = !isNextHmNull ? next_hm_v.toFixed(2) : '';
                    const disabledAttr = isNextHmNull ? 'disabled' : '';
                    const disabledClass = isNextHmNull ? 'disabled' : '';
                    const onClickHandler = isNextHmNull ? '' : `onclick="showNextHmUpdateForm(${idx}, '${escapeHtml(String(nextHmVal))}')"`;
                    const titleText = isNextHmNull ? 'HM Logout is not available' : 'Click to update HM logout';
                    txt = `<button class="id-btn hm-btn ${disabledClass}" ${onClickHandler} ${disabledAttr} title="${titleText}">${escapeHtml(String(nextHmVal || '-'))}</button>`;
                } else if (col.key === 'TOTAL_HM') {
                    // Total HM column - color code based on value
                    txt = total_hm_val === null ? '' : String(total_hm_val.toFixed(2));
                    if (total_hm_val === null) { /* no class */ }
                    else if (total_hm_val > 12 || total_hm_val <= 0) { classes.push('cell-bad'); }
                    else { classes.push('cell-good'); }
                } else if (col.key === 'HM_LONCAT') {
                    // HM jump column - color code based on jump amount
                    txt = hm_loncat_val === null ? '' : String(hm_loncat_val.toFixed(2));
                    if (hm_loncat_val === null) { }
                    else if (Math.abs(hm_loncat_val) < 1e-9) { classes.push('cell-good'); }
                    else if (hm_loncat_val > 0 && hm_loncat_val < 0.4) { classes.push('cell-warn'); }
                    else if (hm_loncat_val > 0.4) { classes.push('cell-bad'); }
                    else if (hm_loncat_val < 0) { classes.push('cell-bad'); }
                } else if (col.key === 'lgn_pattern') {
                    // Pattern column - good if logout-login-logout
                    const v = patternVal;
                    txt = v;
                    if (v.toLowerCase() === 'logout-login-logout') { classes.push('cell-good'); }
                    else { classes.push('cell-bad'); }
                } else if (col.key === 'problem') {
                    // Problem column - combine all bad statuses into comma-separated buttons
                    const problems = [];
                    
                    // Check each problem field and collect bad ones
                    if (flagEq('is_logout', 'belum logout')) {
                        problems.push('belum logout');
                    }
                    if (flagEq('is_salah_shift', 'salah shift')) {
                        problems.push('salah shift');
                    }
                    if (flagEq('is_ftw', 'tidak ftw')) {
                        problems.push('tidak ftw');
                    }
                    if (flagEq('is_loncat', 'hm loncat')) {
                        problems.push('hm loncat');
                    }
                    if (flagEq('is_sama', 'hm logout = login')) {
                        problems.push('hm sama');
                    }
                    
                    // Display problems as comma-separated button-like elements
                    if (problems.length > 0) {
                        txt = problems.map(p => `<span class="problem-badge">${escapeHtml(p)}</span>`).join(', ');
                    } else {
                        txt = '';
                    }
                } else {
                    // Default: display value as-is
                    const v = getVal(r, col.key);
                    if (col.key === 'reporttime' || col.key === 'next_reporttime') {
                        // Format datetime columns
                        txt = v ? formatDateTimeDisplay(String(v)) : '';
                    } else {
                        // Display as string
                        txt = v === null || typeof v === 'undefined' ? '' : String(v);
                    }
                }

                // Combine CSS classes
                if (classes.length === 0) classes.push('');
                const classAttr = classes.filter(Boolean).join(' ');
                return `<td class="${classAttr}">${txt}</td>`;
            });
            
            return `<tr>${cells.join('')}</tr>`;
        }).join('');

        // Build complete table HTML
        tableHtml = `<div class="table-container realtime-container" style="will-change:scroll-position;-webkit-overflow-scrolling:touch;max-height:70vh;">`
            + `<table class="trip-table realtime-table realtime-table-modern">${thead}<tbody>${tbody}</tbody></table></div>`;
    }

    // Build complete Step 3 HTML
    container.innerHTML = `
        <div class="wizard-step">
            <div class="step-header">
                <h2>Step 3 of 7 – Realtime HM Validation</h2>
            </div>
            <div class="step-content">
                <div class="validation-controls">
                    <div class="validation-header">
                        <button id="start-validation-btn" class="btn-validation" onclick="startAutoValidation()">
                            <span class="btn-icon">▶</span>
                            Start Auto Validation
                        </button>
                    </div>
                    <div id="validation-progress" class="validation-progress" style="display: none;">
                        <div class="progress-header">
                            <span class="progress-title">Running Validation...</span>
                            <span class="progress-stats" id="progress-stats">0 / 0</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="progress-bar"></div>
                        </div>
                        <div class="progress-list" id="progress-list"></div>
                    </div>
                </div>
                ${tableHtml}
            </div>
            <div class="step-navigation">
                <button class="btn-back" onclick="loadStep(2)">Back</button>
                <button class="btn-next" onclick="alert('Step 4 not implemented yet')">Next</button>
            </div>
        </div>
        <!-- Shift Update Card -->
        <div id="shift-update-card" style="display: none; z-index: 10000;">
            <div class="shift-card-overlay" onclick="closeShiftUpdateForm()"></div>
            <div class="shift-card-content" style="z-index: 10001;">
                <div class="shift-card-header">
                    <h3>Update Shift</h3>
                    <button class="shift-card-close" onclick="closeShiftUpdateForm()">&times;</button>
                </div>
                <div class="shift-card-body">
                    <form id="shift-update-form">
                        <div class="form-group">
                            <label>Current Shift:</label>
                            <div id="shift-current-value" class="shift-display"></div>
                        </div>
                        <div class="form-group">
                            <label for="shift-new-value">New Shift:</label>
                            <select id="shift-new-value" class="form-select" required>
                                <option value="">Select shift...</option>
                                <option value="6">6</option>
                                <option value="7">7</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                            </select>
                        </div>
                        <div class="shift-card-footer">
                            <button type="button" class="btn-cancel" onclick="closeShiftUpdateForm()">Cancel</button>
                            <button type="submit" class="btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <!-- Previous HM Update Card -->
        <div id="prev-hm-update-card" style="display: none; z-index: 10000;">
            <div class="shift-card-overlay" onclick="closePrevHmUpdateForm()"></div>
            <div class="shift-card-content" style="z-index: 10001;">
                <div class="shift-card-header">
                    <h3>Update Previous HM Logout</h3>
                    <button class="shift-card-close" onclick="closePrevHmUpdateForm()">&times;</button>
                </div>
                <div class="shift-card-body">
                    <form id="prev-hm-update-form">
                        <div class="form-group">
                            <label>Current Previous HM Logout:</label>
                            <div id="prev-hm-current-value" class="shift-display"></div>
                        </div>
                        <div class="form-group">
                            <label for="prev-hm-new-value">New Previous HM Logout:</label>
                            <input type="number" id="prev-hm-new-value" class="form-select" step="0.01" min="0" placeholder="Enter HM value" required>
                        </div>
                        <div class="shift-card-footer">
                            <button type="button" class="btn-cancel" onclick="closePrevHmUpdateForm()">Cancel</button>
                            <button type="submit" class="btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <!-- HM Login Update Card -->
        <div id="hm-update-card" style="display: none; z-index: 10000;">
            <div class="shift-card-overlay" onclick="closeHmUpdateForm()"></div>
            <div class="shift-card-content" style="z-index: 10001;">
                <div class="shift-card-header">
                    <h3>Update HM Login</h3>
                    <button class="shift-card-close" onclick="closeHmUpdateForm()">&times;</button>
                </div>
                <div class="shift-card-body">
                    <form id="hm-update-form">
                        <div class="form-group">
                            <label>Current HM Login:</label>
                            <div id="hm-current-value" class="shift-display"></div>
                        </div>
                        <div class="form-group">
                            <label for="hm-new-value">New HM Login:</label>
                            <input type="number" id="hm-new-value" class="form-select" step="0.01" min="0" placeholder="Enter HM value" required>
                        </div>
                        <div class="shift-card-footer">
                            <button type="button" class="btn-cancel" onclick="closeHmUpdateForm()">Cancel</button>
                            <button type="submit" class="btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <!-- HM Logout Update Card -->
        <div id="next-hm-update-card" style="display: none; z-index: 10000;">
            <div class="shift-card-overlay" onclick="closeNextHmUpdateForm()"></div>
            <div class="shift-card-content" style="z-index: 10001;">
                <div class="shift-card-header">
                    <h3>Update HM Logout</h3>
                    <button class="shift-card-close" onclick="closeNextHmUpdateForm()">&times;</button>
                </div>
                <div class="shift-card-body">
                    <form id="next-hm-update-form">
                        <div class="form-group">
                            <label>Current HM Logout:</label>
                            <div id="next-hm-current-value" class="shift-display"></div>
                        </div>
                        <div class="form-group">
                            <label for="next-hm-new-value">New HM Logout:</label>
                            <input type="number" id="next-hm-new-value" class="form-select" step="0.01" min="0" placeholder="Enter HM value" required>
                        </div>
                        <div class="shift-card-footer">
                            <button type="button" class="btn-cancel" onclick="closeNextHmUpdateForm()">Cancel</button>
                            <button type="submit" class="btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Add form submit handlers
    const shiftForm = document.getElementById('shift-update-form');
    if (shiftForm) {
        shiftForm.addEventListener('submit', handleShiftUpdate);
    }
    
    const prevHmForm = document.getElementById('prev-hm-update-form');
    if (prevHmForm) {
        prevHmForm.addEventListener('submit', handlePrevHmUpdate);
    }
    
    const hmForm = document.getElementById('hm-update-form');
    if (hmForm) {
        hmForm.addEventListener('submit', handleHmUpdate);
    }
    
    const nextHmForm = document.getElementById('next-hm-update-form');
    if (nextHmForm) {
        nextHmForm.addEventListener('submit', handleNextHmUpdate);
    }
}

// Show shift update form card
// rowIndex: index of the row in timesheetState.step3 array
// currentShift: current shift value to display
function showShiftUpdateForm(rowIndex, currentShift) {
    const card = document.getElementById('shift-update-card');
    if (!card) return;
    
    // Get row data to check if operator has logged out
    const rows = timesheetState.step3 || [];
    if (rowIndex < 0 || rowIndex >= rows.length) {
        alert('Invalid row data');
        return;
    }
    
    const row = rows[rowIndex];
    const next_reporttime = getVal(row, 'next_reporttime');
    
    // Check if operator has logged out
    const canUpdate = next_reporttime && next_reporttime !== null && next_reporttime !== '';
    
    // Store row index for later use
    card.dataset.rowIndex = rowIndex;
    
    // Set current shift value
    const currentValueEl = document.getElementById('shift-current-value');
    if (currentValueEl) {
        currentValueEl.textContent = currentShift || '(empty)';
    }
    
    // Reset form
    const selectEl = document.getElementById('shift-new-value');
    if (selectEl) {
        selectEl.value = '';
        selectEl.disabled = !canUpdate;
    }
    
    // Disable save button if operator hasn't logged out
    const saveButton = card.querySelector('button[type="submit"]');
    if (saveButton) {
        saveButton.disabled = !canUpdate;
        if (!canUpdate) {
            saveButton.title = 'Cannot update: Operator has not logged out yet';
        }
    }
    
    // Show warning message if cannot update
    let warningMsg = card.querySelector('.shift-warning-message');
    if (!warningMsg) {
        warningMsg = document.createElement('div');
        warningMsg.className = 'shift-warning-message';
        warningMsg.style.cssText = 'padding: 12px; margin: 12px 0; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404;';
        const formBody = card.querySelector('.shift-card-body');
        if (formBody) {
            formBody.insertBefore(warningMsg, formBody.firstChild);
        }
    }
    
    if (!canUpdate) {
        warningMsg.textContent = 'Unable to update shift: The operator has not logged out yet.';
        warningMsg.style.display = 'block';
    } else {
        warningMsg.style.display = 'none';
    }
    
    // Show card
    card.style.display = 'block';
    
    // Add click-outside handler
    setTimeout(() => {
        const overlay = card.querySelector('.shift-card-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeShiftUpdateForm);
        }
    }, 10);
}

// Close shift update form card
function closeShiftUpdateForm() {
    const card = document.getElementById('shift-update-card');
    if (card) {
        // Reset form state
        const selectEl = document.getElementById('shift-new-value');
        if (selectEl) {
            selectEl.disabled = false;
        }
        
        const saveButton = card.querySelector('button[type="submit"]');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.title = '';
        }
        
        const warningMsg = card.querySelector('.shift-warning-message');
        if (warningMsg) {
            warningMsg.style.display = 'none';
        }
        
        card.style.display = 'none';
    }
}

// Handle shift update form submission
function handleShiftUpdate(event) {
    event.preventDefault();
    
    const card = document.getElementById('shift-update-card');
    if (!card) return;
    
    const rowIndex = parseInt(card.dataset.rowIndex);
    const selectEl = document.getElementById('shift-new-value');
    const newShift = selectEl ? selectEl.value : '';
    
    if (!newShift) {
        alert('Please select a shift value');
        return;
    }
    
    // Get row data
    const rows = timesheetState.step3 || [];
    if (rowIndex < 0 || rowIndex >= rows.length) {
        alert('Invalid row data');
        return;
    }
    
    const row = rows[rowIndex];
    
    // Extract all required parameters from row
    const id = getVal(row, 'id');
    const next_id = getVal(row, 'next_id');
    const reporttime = getVal(row, 'reporttime');
    const next_reporttime = getVal(row, 'next_reporttime');
    const mobileid = getVal(row, 'MOBILEID') || getVal(row, 'mobileid');
    const opr_nrp = getVal(row, 'opr_nrp');
    const hm = getVal(row, 'hm');
    const next_hm = getVal(row, 'next_hm');
    const opr_shift = getVal(row, 'opr_shift');
    
    if (!id) {
        alert('Cannot update: missing ID');
        return;
    }
    
    // Check if operator has logged out (next_reporttime must exist)
    if (!next_reporttime || next_reporttime === null || next_reporttime === '') {
        alert('Unable to update shift: The operator has not logged out yet.');
        closeShiftUpdateForm();
        return;
    }
    
    // Update shift via API with all required parameters
    fetch('/api/timesheet/update-shift', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            id: id,
            next_id: next_id,
            reporttime: reporttime,
            next_reporttime: next_reporttime,
            mobileid: mobileid,
            opr_nrp: opr_nrp,
            hm: hm,
            next_hm: next_hm,
            opr_shift: opr_shift,
            new_shift: newShift
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Update local state
            row.opr_shift = newShift;
            // Re-render table to show updated value
            renderStep3();
            // Close form
            closeShiftUpdateForm();
            // Show success notification
            showNotification('Shift updated successfully!', 'success');
        } else {
            alert('Error updating shift: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        alert('Error updating shift: ' + error.message);
    });
}

// Show notification toast message
// message: text to display
// type: 'success' or 'error' (defaults to 'success')
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existing = document.getElementById('shift-notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'shift-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-size: 14px;
        font-weight: 500;
        min-width: 250px;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Show previous HM update form card
// rowIndex: index of the row in timesheetState.step3 array
// currentPrevHm: current previous HM value to display
function showPrevHmUpdateForm(rowIndex, currentPrevHm) {
    const card = document.getElementById('prev-hm-update-card');
    if (!card) return;
    
    // Store row index for later use
    card.dataset.rowIndex = rowIndex;
    
    // Set current previous HM value
    const currentValueEl = document.getElementById('prev-hm-current-value');
    if (currentValueEl) {
        currentValueEl.textContent = currentPrevHm || '(empty)';
    }
    
    // Reset form
    const inputEl = document.getElementById('prev-hm-new-value');
    if (inputEl) {
        inputEl.value = '';
    }
    
    // Show card
    card.style.display = 'block';
    
    // Add click-outside handler
    setTimeout(() => {
        const overlay = card.querySelector('.shift-card-overlay');
        if (overlay) {
            overlay.addEventListener('click', closePrevHmUpdateForm);
        }
    }, 10);
}

// Close previous HM update form card
function closePrevHmUpdateForm() {
    const card = document.getElementById('prev-hm-update-card');
    if (card) {
        card.style.display = 'none';
    }
}

// Handle previous HM update form submission
function handlePrevHmUpdate(event) {
    event.preventDefault();
    
    const card = document.getElementById('prev-hm-update-card');
    if (!card) return;
    
    const rowIndex = parseInt(card.dataset.rowIndex);
    const inputEl = document.getElementById('prev-hm-new-value');
    const newHm = inputEl ? parseFloat(inputEl.value) : null;
    
    if (newHm === null || isNaN(newHm)) {
        alert('Please enter a valid HM value');
        return;
    }
    
    // Get row data
    const rows = timesheetState.step3 || [];
    if (rowIndex < 0 || rowIndex >= rows.length) {
        alert('Invalid row data');
        return;
    }
    
    const row = rows[rowIndex];
    
    // Extract required parameters from row
    const prev_id = getVal(row, 'prev_id') || getVal(row, 'id');
    const opr_nrp = getVal(row, 'opr_nrp');
    const prev_hm = getVal(row, 'prev_hm');
    const opr_shift = getVal(row, 'opr_shift');
    
    if (!prev_id || !opr_nrp) {
        alert('Cannot update: missing required data');
        return;
    }
    
    // Update previous HM via API
    fetch('/api/timesheet/update-prev-hm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            prev_id: prev_id,
            opr_nrp: opr_nrp,
            prev_hm: prev_hm,
            new_hm: newHm,
            opr_shift: opr_shift
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Previous HM Logout updated successfully!', 'success');
            // Close form
            closePrevHmUpdateForm();
            // Reload step 3 to refresh data
            loadStep3();
        } else {
            alert('Error updating previous HM: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        alert('Error updating previous HM: ' + error.message);
    });
}

// Show HM Login update form card
// rowIndex: index of the row in timesheetState.step3 array
// currentHm: current HM value to display
function showHmUpdateForm(rowIndex, currentHm) {
    const card = document.getElementById('hm-update-card');
    if (!card) return;
    
    // Store row index for later use
    card.dataset.rowIndex = rowIndex;
    
    // Set current HM value
    const currentValueEl = document.getElementById('hm-current-value');
    if (currentValueEl) {
        currentValueEl.textContent = currentHm || '(empty)';
    }
    
    // Reset form
    const inputEl = document.getElementById('hm-new-value');
    if (inputEl) {
        inputEl.value = '';
    }
    
    // Show card
    card.style.display = 'block';
    
    // Add click-outside handler
    setTimeout(() => {
        const overlay = card.querySelector('.shift-card-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeHmUpdateForm);
        }
    }, 10);
}

// Close HM Login update form card
function closeHmUpdateForm() {
    const card = document.getElementById('hm-update-card');
    if (card) {
        card.style.display = 'none';
    }
}

// Handle HM Login update form submission
function handleHmUpdate(event) {
    event.preventDefault();
    
    const card = document.getElementById('hm-update-card');
    if (!card) return;
    
    const rowIndex = parseInt(card.dataset.rowIndex);
    const inputEl = document.getElementById('hm-new-value');
    const newHm = inputEl ? parseFloat(inputEl.value) : null;
    
    if (newHm === null || isNaN(newHm)) {
        alert('Please enter a valid HM value');
        return;
    }
    
    // Get row data
    const rows = timesheetState.step3 || [];
    if (rowIndex < 0 || rowIndex >= rows.length) {
        alert('Invalid row data');
        return;
    }
    
    const row = rows[rowIndex];
    
    // Extract required parameters from row
    const id = getVal(row, 'id');
    const opr_nrp = getVal(row, 'opr_nrp');
    const hm = getVal(row, 'hm');
    const opr_shift = getVal(row, 'opr_shift');
    
    if (!id || !opr_nrp) {
        alert('Cannot update: missing required data');
        return;
    }
    
    // Update HM via API
    fetch('/api/timesheet/update-hm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            id: id,
            opr_nrp: opr_nrp,
            hm: hm,
            new_hm: newHm,
            opr_shift: opr_shift
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('HM Login updated successfully!', 'success');
            // Close form
            closeHmUpdateForm();
            // Reload step 3 to refresh data
            loadStep3();
        } else {
            alert('Error updating HM Login: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        alert('Error updating HM Login: ' + error.message);
    });
}

// Show HM Logout update form card
// rowIndex: index of the row in timesheetState.step3 array
// currentNextHm: current HM logout value to display
function showNextHmUpdateForm(rowIndex, currentNextHm) {
    const card = document.getElementById('next-hm-update-card');
    if (!card) return;
    
    // Store row index for later use
    card.dataset.rowIndex = rowIndex;
    
    // Set current HM logout value
    const currentValueEl = document.getElementById('next-hm-current-value');
    if (currentValueEl) {
        currentValueEl.textContent = currentNextHm || '(empty)';
    }
    
    // Reset form
    const inputEl = document.getElementById('next-hm-new-value');
    if (inputEl) {
        inputEl.value = '';
    }
    
    // Show card
    card.style.display = 'block';
    
    // Add click-outside handler
    setTimeout(() => {
        const overlay = card.querySelector('.shift-card-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeNextHmUpdateForm);
        }
    }, 10);
}

// Close HM Logout update form card
function closeNextHmUpdateForm() {
    const card = document.getElementById('next-hm-update-card');
    if (card) {
        card.style.display = 'none';
    }
}

// Handle HM Logout update form submission
function handleNextHmUpdate(event) {
    event.preventDefault();
    
    const card = document.getElementById('next-hm-update-card');
    if (!card) return;
    
    const rowIndex = parseInt(card.dataset.rowIndex);
    const inputEl = document.getElementById('next-hm-new-value');
    const newHm = inputEl ? parseFloat(inputEl.value) : null;
    
    if (newHm === null || isNaN(newHm)) {
        alert('Please enter a valid HM value');
        return;
    }
    
    // Get row data
    const rows = timesheetState.step3 || [];
    if (rowIndex < 0 || rowIndex >= rows.length) {
        alert('Invalid row data');
        return;
    }
    
    const row = rows[rowIndex];
    
    // Extract required parameters from row
    const next_id = getVal(row, 'next_id') || getVal(row, 'id');
    const opr_nrp = getVal(row, 'opr_nrp');
    const next_hm = getVal(row, 'next_hm');
    const opr_shift = getVal(row, 'opr_shift');
    
    if (!next_id || !opr_nrp) {
        alert('Cannot update: missing required data');
        return;
    }
    
    // Update HM Logout via API
    fetch('/api/timesheet/update-next-hm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            next_id: next_id,
            opr_nrp: opr_nrp,
            next_hm: next_hm,
            new_hm: newHm,
            opr_shift: opr_shift
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('HM Logout updated successfully!', 'success');
            // Close form
            closeNextHmUpdateForm();
            // Reload step 3 to refresh data
            loadStep3();
        } else {
            alert('Error updating HM Logout: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        alert('Error updating HM Logout: ' + error.message);
    });
}

// Helper function to get value from row (same as in renderStep3)
function getVal(row, key) {
    if (!row) return null;
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    const lower = key.toLowerCase();
    for (const k of Object.keys(row)) {
        if (k.toLowerCase() === lower) return row[k];
    }
    return null;
}

// ============================================================================
// AUTO VALIDATION CONFIGURATION
// ============================================================================
// Add your validation queries here
// Each query should have: name (process name), query (SQL query string)
const validationQueries = [
    { name: 'Fix Small HM Jump', query: 'EXEC dbo.autofix_hm_001_lompat_kecil' },
    { name: 'Fix Missing Comma', query: 'EXEC dbo.autofix_hm_002_lupa_koma' },
    { name: 'Fix HM Jump on Relogin', query: 'EXEC dbo.autofix_hm_003_loncat_relogin' },
    { name: 'Validate Workshop HM', query: 'EXEC dbo.autofix_hm_004_valid_workshop' },
    { name: 'Fix Backward HM Same as Previous', query: 'EXEC dbo.autofix_hm_005_mundur_sama_prev' },
    { name: 'Fix Same HM on Relogin', query: 'EXEC dbo.autofix_hm_006_sama_relogin' }
];

// Auto validation state
let validationState = {
    isRunning: false,
    currentIndex: 0,
    totalQueries: 0
};

// Start auto validation process
function startAutoValidation() {
    if (validationState.isRunning) {
        alert('Validation is already running!');
        return;
    }
    
    // Show progress UI
    const progressDiv = document.getElementById('validation-progress');
    const progressList = document.getElementById('progress-list');
    const startBtn = document.getElementById('start-validation-btn');
    
    // Use default query count (10) or length of validationQueries array
    const queryCount = validationQueries.length > 0 ? validationQueries.length : 10;
    
    // Show progress section if not already visible
    if (progressDiv.style.display === 'none' || !progressDiv.style.display) {
        progressDiv.style.display = 'block';
    }
    
    // Initialize state
    validationState.isRunning = true;
    validationState.currentIndex = 0;
    validationState.totalQueries = queryCount;
    
    progressList.innerHTML = '';
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="btn-icon">⏸</span> Running...';
    
    // Start running queries
    runNextValidationQuery();
}

// Run next validation query in sequence
async function runNextValidationQuery() {
    const currentIndex = validationState.currentIndex;
    const totalQueries = validationState.totalQueries;
    
    if (currentIndex >= totalQueries) {
        // All queries completed
        finishValidation();
        return;
    }
    
    // Get or create query config
    const queryIndex = currentIndex;
    let queryConfig = validationQueries[queryIndex];
    
    // If no query configured, use placeholder
    if (!queryConfig) {
        queryConfig = {
            name: `Validation Process ${queryIndex + 1}`,
            query: `-- Query ${queryIndex + 1} (to be configured)`
        };
    }
    
    // Update progress UI
    updateProgressUI(queryIndex, totalQueries, queryConfig.name, 'running');
    
    // Simulate query execution (replace with actual API call later)
    try {
        // UNCOMMENT BELOW OK!
        // await executeValidationQuery(queryConfig.query);
        
        // Simulate delay (remove when using real queries)
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        // Mark as completed
        updateProgressUI(queryIndex, totalQueries, queryConfig.name, 'completed');
        
        // Move to next query
        validationState.currentIndex++;
        
        // Run next query after short delay
        setTimeout(() => {
            runNextValidationQuery();
        }, 200);
        
    } catch (error) {
        // Mark as failed
        updateProgressUI(queryIndex, totalQueries, queryConfig.name, 'failed', error.message);
        
        // Continue with next query
        validationState.currentIndex++;
        setTimeout(() => {
            runNextValidationQuery();
        }, 500);
    }
}

// Update progress UI for a specific query
function updateProgressUI(index, total, processName, status, errorMessage = '') {
    const progressStats = document.getElementById('progress-stats');
    const progressBar = document.getElementById('progress-bar');
    const progressList = document.getElementById('progress-list');
    
    // Update stats
    const completed = index + (status === 'completed' || status === 'failed' ? 1 : 0);
    progressStats.textContent = `${completed} / ${total}`;
    
    // Update progress bar
    const percentage = (completed / total) * 100;
    progressBar.style.width = `${percentage}%`;
    
    // Update or add progress item
    let itemId = `progress-item-${index}`;
    let item = document.getElementById(itemId);
    
    if (!item) {
        // Create new progress item
        item = document.createElement('div');
        item.id = itemId;
        item.className = 'progress-item';
        progressList.appendChild(item);
    }
    
    // Update item status
    item.className = `progress-item progress-item-${status}`;
    
    let statusIcon = '';
    let statusText = '';
    if (status === 'running') {
        statusIcon = '⏳';
        statusText = 'Running...';
    } else if (status === 'completed') {
        statusIcon = '✓';
        statusText = 'Completed';
    } else if (status === 'failed') {
        statusIcon = '✗';
        statusText = 'Failed';
    }
    
    item.innerHTML = `
        <span class="progress-item-icon">${statusIcon}</span>
        <span class="progress-item-name">${escapeHtml(processName)}</span>
        <span class="progress-item-status">${statusText}</span>
        ${errorMessage ? `<span class="progress-item-error">${escapeHtml(errorMessage)}</span>` : ''}
    `;
    
    // Scroll to latest item
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Finish validation process
function finishValidation() {
    validationState.isRunning = false;
    
    const startBtn = document.getElementById('start-validation-btn');
    startBtn.disabled = false;
    startBtn.innerHTML = '<span class="btn-icon">▶</span> Start Auto Validation';
    
    // Show completion message
    showNotification('Auto validation completed!', 'success');
    
    // Optionally reload data after validation
    setTimeout(() => {
        loadStep3();
    }, 1000);
}

// Execute validation query (to be implemented with actual API call)
async function executeValidationQuery(query) {
    // UNCOMMENT BELOW OK!
    // const response = await fetch('/api/timesheet/run-validation', {
    //     method: 'POST',
    //     headers: {'Content-Type': 'application/json'},
    //     body: JSON.stringify({ query: query })
    // });
    // const data = await response.json();
    // if (!data.success) throw new Error(data.message || 'Query failed');
    // return data;
    
    // Placeholder - replace with actual implementation
    throw new Error('Query execution not yet implemented');
}

// Make functions globally accessible
window.showShiftUpdateForm = showShiftUpdateForm;
window.closeShiftUpdateForm = closeShiftUpdateForm;
window.showPrevHmUpdateForm = showPrevHmUpdateForm;
window.closePrevHmUpdateForm = closePrevHmUpdateForm;
window.showHmUpdateForm = showHmUpdateForm;
window.closeHmUpdateForm = closeHmUpdateForm;
window.showNextHmUpdateForm = showNextHmUpdateForm;
window.closeNextHmUpdateForm = closeNextHmUpdateForm;
window.showNotification = showNotification;
window.startAutoValidation = startAutoValidation;

