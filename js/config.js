// Project Configuration & Shared Security Utilities
// VERSION: MOSJID_CONFIG_V1

// MOSJID_CONFIG will now focus on security utilities and essential paths.
window.MOSJID_CONFIG = {
    // Admin list is now database-driven via 'admin_users' table.
    API_URL: window.location.origin
};

// Global Security Helpers
window.escapeHTML = function(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

console.log('[CONFIG] MOSJID_CONFIG Loaded.');
