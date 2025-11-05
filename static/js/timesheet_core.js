// ============================================================================
// TIMESHEET CORE - State Management & Initialization
// ============================================================================
// This file manages the global state and initialization of the timesheet wizard
// All other modules depend on timesheetState being defined here

// Global state object - stores all wizard data
// This is shared across all step modules
let timesheetState = {
    step: 1,                          // Current step number (1, 2, 3, etc.)
    selectedDate: '',                 // Selected date from Step 1
    selectedShifts: [],              // Selected shifts from Step 1
    unitType: '3 Shift',             // Unit type (3 Shift or 2 Shift)
    hasFriday: false,                 // Flag if selected date is Friday
    step2: {
        equipmentNumber: '',          // Equipment number from Step 2
        operatorId: '',              // Operator ID (optional)
        trips: [],                    // Array of trip data
        editingTripId: null          // ID of trip being edited (null if none)
    }
};

// Counter for generating unique manual trip IDs
// Used when adding new trips manually
let manualIdCounter = 0;

// Initialize the wizard - called when user clicks "Start"
// This loads Step 1
function initTimesheetWizard() {
    loadStep(1);
}

// Load a specific step
// stepNumber: which step to load (1, 2, or 3)
function loadStep(stepNumber) {
    timesheetState.step = stepNumber;
    // Call the appropriate load function based on step number
    if (stepNumber === 1) loadStep1();
    else if (stepNumber === 2) loadStep2();
    else if (stepNumber === 3) loadStep3();
}

// Go back to previous step
function goBackStep() {
    if (timesheetState.step === 2) loadStep(1);
}

// Cancel wizard - clears session and resets to start screen
function cancelWizard() {
    if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
        fetch('/api/timesheet/clear', { method: 'POST' });
        const container = document.getElementById('timesheet-wizard-container');
        if (container) {
            container.innerHTML = `
                <div class="wizard-start">
                    <h2>Timesheet Validation Wizard</h2>
                    <p>Click "Start" to begin the validation process.</p>
                    <button class="btn-primary" onclick="initTimesheetWizard()">Start</button>
                </div>
            `;
        }
    }
}

// Handle navigation to next step
// Saves current step data before moving forward
function nextStep() {
    if (timesheetState.step === 1) {
        // Save Step 1 data to server
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
        // Save Step 2 data to server
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
            if (data.success) loadStep(3);
            else alert('Error saving step 2: ' + (data.message || 'Unknown error'));
        })
        .catch(error => alert('Error saving step 2: ' + error.message));
    }
}

// Initialize when page loads
// Sets up observer to watch for wizard container changes
document.addEventListener('DOMContentLoaded', function() {
    // Watch for when wizard container becomes empty, then auto-initialize
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
    
    // Disable right-click context menu
    document.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
});

