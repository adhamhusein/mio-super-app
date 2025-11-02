// Dashboard JavaScript for feature switching and sidebar toggle

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const menuItems = document.querySelectorAll('.menu-item');
    const contentArea = document.getElementById('contentArea');
    
    // Sidebar toggle functionality
    let sidebarExpanded = true;
    
    sidebarToggle.addEventListener('click', function() {
        sidebarExpanded = !sidebarExpanded;
        if (sidebarExpanded) {
            sidebar.classList.add('expanded');
            sidebar.classList.remove('collapsed');
        } else {
            sidebar.classList.add('collapsed');
            sidebar.classList.remove('expanded');
        }
    });
    
    // Feature switching functionality
    menuItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all menu items
            menuItems.forEach(function(menuItem) {
                menuItem.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get feature name from data attribute
            const featureName = this.getAttribute('data-feature');
            
            // Load feature content
            loadFeature(featureName);
        });
    });
    
    // Load feature content
    function loadFeature(featureName) {
        const featureContent = document.getElementById('featureContent');
        const template = document.getElementById(featureName + '-template');
        
        if (template) {
            featureContent.innerHTML = template.innerHTML;
            
            // Initialize timesheet wizard if timesheet feature is loaded
            if (featureName === 'timesheet' && typeof initTimesheetWizard === 'function') {
                setTimeout(initTimesheetWizard, 100);
            }
        } else {
            featureContent.innerHTML = `
                <div class="feature-header">
                    <h2>${featureName.charAt(0).toUpperCase() + featureName.slice(1)}</h2>
                </div>
                <div class="feature-body">
                    <p>Feature content for ${featureName} will be displayed here.</p>
                </div>
            `;
        }
    }
    
    // Load default feature on page load if no feature is selected
    const activeItem = document.querySelector('.menu-item.active');
    if (activeItem) {
        const defaultFeature = activeItem.getAttribute('data-feature');
        loadFeature(defaultFeature);
    }
    
    // Ensure sidebar starts expanded
    sidebar.classList.add('expanded');
});

