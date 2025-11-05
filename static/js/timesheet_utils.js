// ============================================================================
// TIMESHEET UTILITIES - Helper Functions
// ============================================================================
// Common utility functions used across all steps

// Convert datetime string to HTML5 datetime-local input format
// Input: "2024-01-15T10:30:00" or ISO string
// Output: "2024-01-15T10:30" (for datetime-local input)
function formatDateTimeLocal(dateTimeStr) {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Convert datetime string to human-readable display format
// Input: "2024-01-15T10:30:00"
// Output: "2024-01-15 10:30"
function formatDateTimeDisplay(dateTimeStr) {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Convert Date object to database format string
// Input: Date object
// Output: "2024-01-15T10:30:00"
function formatDateTimeForDB(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// Escape HTML special characters to prevent XSS attacks
// Input: "<script>alert('xss')</script>"
// Output: "&lt;script&gt;alert('xss')&lt;/script&gt;"
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add one minute to a datetime string
// Used when adding new trips - sets time 1 minute after reference trip
function addOneMinute(dateTimeStr) {
    if (!dateTimeStr) {
        return formatDateTimeForDB(new Date());
    }
    const date = new Date(dateTimeStr);
    date.setMinutes(date.getMinutes() + 1);
    return formatDateTimeForDB(date);
}

