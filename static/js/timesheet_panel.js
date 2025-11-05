// ============================================================================
// TIMESHEET PANEL - Historical Login Panel
// ============================================================================
// Functions to show/hide the historical login data panel
// This panel appears when clicking an ID button in Step 3

// Store reference to click-outside handler so we can remove it later
let panelClickOutsideHandler = null;

// Show historical panel with login data for a specific mobile unit
// id: the login ID to highlight
// mobileid: the mobile unit ID to fetch data for
function showHistoricalPanel(id, mobileid) {
    // Find panel element in HTML
    let panel = document.getElementById('historical-panel');
    if (!panel) {
        console.error('Panel element #historical-panel not found in DOM.');
        alert('Panel cannot be shown. Please contact admin.');
        return;
    }
    
    // Set panel HTML structure and show it
    panel.className = 'historical-panel';
    panel.innerHTML = `<div class="panel-header"><span>Historical Login Unit</span><button class="panel-close" onclick="closeHistoricalPanel()">&times;</button></div><div class="panel-content">Loading...</div>`;
    panel.style.display = 'block';
    
    // Add 'open' class after small delay for animation
    setTimeout(() => { panel.classList.add('open'); }, 10);
    
    // Add click-outside handler to close panel when clicking outside
    // Remove any existing handler first
    if (panelClickOutsideHandler) {
        document.removeEventListener('click', panelClickOutsideHandler);
    }
    
    // Create new click handler
    panelClickOutsideHandler = function(event) {
        // Check if click is outside the panel
        if (panel && !panel.contains(event.target)) {
            closeHistoricalPanel();
        }
    };
    
    // Add event listener with small delay to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', panelClickOutsideHandler);
    }, 100);

    // Fetch historical data from server
    fetch(`/api/timesheet/historical-login?mobileid=${encodeURIComponent(mobileid)}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success || !data.rows || !Array.isArray(data.rows)) {
                panel.querySelector('.panel-content').innerHTML = '<div class="empty-message">No historical data found.</div>';
                return;
            }
            
            // Define table columns
            const headers = ['id','opr_nrp','opr_username','status','tanggal','opr_shift','jam','mobileid','lgn_hourmeter','pos_name','reporttime','created_at'];
            const headerLabels = ['ID','NRP','Operator','Status','Tanggal','Shift','Jam','MobileID','HM','Pos','Report Time','Created At'];
            
            // Format datetime values for display
            function formatDT(val) {
                if (!val) return '';
                let d = new Date(val);
                if (isNaN(d.getTime())) return escapeHtml(val);
                const pad = n => n < 10 ? '0'+n : n;
                return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }
            
            // Format tanggal column (Indonesian date format)
            function formatTanggal(val) {
                if (!val) return '';
                let d = new Date(val);
                if (isNaN(d.getTime())) return escapeHtml(val);
                const pad = n => n < 10 ? '0'+n : n;
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return `${pad(d.getDate())} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
            }
            
            // Format HM column to 1 decimal place
            function formatHM(val) {
                if (val === null || val === undefined || val === '') return '';
                const num = parseFloat(val);
                if (isNaN(num)) return escapeHtml(String(val));
                return num.toFixed(1);
            }
            
            // Remove duplicate rows (rows with identical values)
            const seen = new Set();
            const uniqueRows = data.rows.filter(row => {
                const key = Object.values(row).map(v => String(v ?? '')).join('|');
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            
            // Build table rows
            // Get column indices for left-aligned columns (operator and pos)
            const operatorColIndex = headers.indexOf('opr_username');
            const posColIndex = headers.indexOf('pos_name');
            
            const thead = `<thead><tr>${headerLabels.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
            const datetimeCols = ['reporttime','created_at'];
            const tbody = uniqueRows.map(row => {
                // Highlight row if it matches the clicked ID and mobileid
                const highlight = (String(row.id) === String(id) && String(row.mobileid) === String(mobileid)) ? 'highlight-row' : '';
                return `<tr class="${highlight}">${headers.map((k, idx) => {
                    let cellContent = '';
                    let cellStyle = '';
                    
                    // Add left-align style for operator and pos columns
                    if (idx === operatorColIndex || idx === posColIndex) {
                        cellStyle = ' style="text-align: left;"';
                    }
                    
                    if (k === 'id') {
                        cellContent = escapeHtml(row[k] ?? '');
                    } else if (k === 'tanggal') {
                        cellContent = formatTanggal(row[k]);
                    } else if (k === 'lgn_hourmeter') {
                        // Format HM to 1 decimal place
                        cellContent = formatHM(row[k]);
                    } else if (datetimeCols.includes(k)) {
                        cellContent = formatDT(row[k]);
                    } else {
                        cellContent = escapeHtml(row[k] ?? '');
                    }
                    
                    return `<td${cellStyle}>${cellContent}</td>`;
                }).join('')}</tr>`;
            }).join('');
            
            // Insert table into panel
            panel.querySelector('.panel-content').innerHTML = `<table class="historical-table">${thead}<tbody>${tbody}</tbody></table>`;
            
            // Auto-size columns based on content
            const histTable = panel.querySelector('.historical-table');
            if (histTable) {
                setTimeout(() => {
                    const ths = histTable.querySelectorAll('th');
                    ths.forEach((th, i) => {
                        let maxWidth = th.offsetWidth;
                        histTable.querySelectorAll(`td:nth-child(${i+1})`).forEach(td => {
                            // Create temporary span to measure text width
                            const span = document.createElement('span');
                            span.style.visibility = 'hidden';
                            span.style.position = 'absolute';
                            span.style.whiteSpace = 'nowrap';
                            span.style.font = window.getComputedStyle(td).font;
                            span.textContent = td.textContent;
                            document.body.appendChild(span);
                            maxWidth = Math.max(maxWidth, span.offsetWidth + 16);
                            document.body.removeChild(span);
                        });
                        th.style.width = maxWidth + 'px';
                        histTable.querySelectorAll(`td:nth-child(${i+1})`).forEach(td => {
                            td.style.width = maxWidth + 'px';
                        });
                    });
                    // Set panel width based on table width (between 320px and 90% of screen)
                    const tableWidth = histTable.scrollWidth;
                    const clamped = Math.max(320, Math.min(tableWidth + 32, window.innerWidth * 0.9));
                    panel.style.width = clamped + 'px';
                }, 10);
            }
        });
}

// Close the historical panel
function closeHistoricalPanel() {
    const panel = document.getElementById('historical-panel');
    if (panel) {
        panel.classList.remove('open');
        // Hide panel after animation completes (300ms)
        setTimeout(() => { panel.style.display = 'none'; }, 300);
    }
    
    // Remove click-outside handler when panel is closed
    if (panelClickOutsideHandler) {
        document.removeEventListener('click', panelClickOutsideHandler);
        panelClickOutsideHandler = null;
    }
}

// Make functions globally accessible for onclick handlers
window.showHistoricalPanel = showHistoricalPanel;
window.closeHistoricalPanel = closeHistoricalPanel;

