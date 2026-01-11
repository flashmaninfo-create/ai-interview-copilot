// Dashboard URL Configuration
// This file provides helper functions to get the correct dashboard URL
// based on the environment or user preference

const DASHBOARD_URLS = {
    PRODUCTION: 'https://xtroone.com',
    DEV: 'https://ai-interview-copilot-kappa.vercel.app',
    LOCAL: 'http://localhost:5173'
};

// List of all valid dashboard domains
const VALID_DASHBOARD_DOMAINS = [
    'localhost:5173',
    '127.0.0.1:5173',
    'xtroone.com',
    'ai-interview-copilot-kappa.vercel.app'
];

/**
 * Get the dashboard URL based on stored preference or default to production
 * @returns {Promise<string>} The dashboard URL
 */
async function getDashboardUrl() {
    try {
        const result = await chrome.storage.local.get(['dashboardUrl']);
        if (result.dashboardUrl) {
            return result.dashboardUrl;
        }
    } catch (error) {
        console.error('[Config] Error getting dashboard URL:', error);
    }
    
    // Default to production
    return DASHBOARD_URLS.PRODUCTION;
}

/**
 * Set the dashboard URL preference
 * @param {string} url - The dashboard URL to use
 */
async function setDashboardUrl(url) {
    await chrome.storage.local.set({ dashboardUrl: url });
}

/**
 * Check if a URL is a valid dashboard domain
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL is a dashboard domain
 */
function isDashboardDomain(url) {
    if (!url) return false;
    return VALID_DASHBOARD_DOMAINS.some(domain => url.includes(domain));
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DASHBOARD_URLS,
        VALID_DASHBOARD_DOMAINS,
        getDashboardUrl,
        setDashboardUrl,
        isDashboardDomain
    };
}
