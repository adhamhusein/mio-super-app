// ============================================================================
// TIMESHEET MODULAR STRUCTURE
// ============================================================================
// This file has been split into modular components for better organization.
// Load these files in your HTML in the following order:

/*
LOAD ORDER (IMPORTANT - must be in this order):
1. timesheet_core.js      - Core state management and initialization
2. timesheet_utils.js     - Utility functions (date formatting, HTML escaping)
3. timesheet_panel.js     - Historical panel functions
4. timesheet_step_001.js  - Step 1: Date & Shift Selection
5. timesheet_step_002.js  - Step 2: Manual Rotation Inject
6. timesheet_step_003.js  - Step 3: Realtime HM Validation

EXAMPLE HTML:
<script src="/static/js/timesheet_core.js"></script>
<script src="/static/js/timesheet_utils.js"></script>
<script src="/static/js/timesheet_panel.js"></script>
<script src="/static/js/timesheet_step_001.js"></script>
<script src="/static/js/timesheet_step_002.js"></script>
<script src="/static/js/timesheet_step_003.js"></script>
*/

// If you're still using the old timesheet.js file, you can remove it
// and use the modular files above instead.

