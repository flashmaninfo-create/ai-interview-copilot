// Interview Copilot - Popup Script

const CONSOLE_URL = 'http://localhost:5173/dashboard/console';

// Elements - Views
const loginView = document.getElementById('loginView');
const connectView = document.getElementById('connectView');
const connectedView = document.getElementById('connectedView');
const activeView = document.getElementById('activeView');

// Login elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const authError = document.getElementById('authError');

// Connect view elements
const userEmailConnect = document.getElementById('userEmailConnect');
const logoutBtnConnect = document.getElementById('logoutBtnConnect');
const meetingUrlConnect = document.getElementById('meetingUrlConnect');
const connectBtn = document.getElementById('connectBtn');
const creditsCountConnect = document.getElementById('creditsCountConnect');

// Connected view elements
const userEmailConnected = document.getElementById('userEmailConnected');
const logoutBtnConnected = document.getElementById('logoutBtnConnected');
const connectedPlatformIcon = document.getElementById('connectedPlatformIcon');
const connectedPlatformName = document.getElementById('connectedPlatformName');
const startBtn = document.getElementById('startBtn');
const disconnectFromConnectedBtn = document.getElementById('disconnectFromConnectedBtn');
const creditsCountConnected = document.getElementById('creditsCountConnected');

// Active view elements
const sessionTimer = document.getElementById('sessionTimer');
const sessionPlatform = document.getElementById('sessionPlatform');
const openConsoleBtn = document.getElementById('openConsoleBtn');
const showOverlayBtn = document.getElementById('showOverlayBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const finishBtn = document.getElementById('finishBtn');

// State
let timerInterval = null;
let connectedMeeting = null; // { tabId, url, platform }

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await checkSessionStatus();

    // Auto-detect meeting URL from current tab
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url && isMeetingUrl(tab.url)) {
            meetingUrlConnect.value = tab.url;
            meetingUrlConnect.placeholder = 'Meeting detected!';
        }
    } catch (e) {
        console.log('Could not auto-detect meeting URL:', e);
    }
});

function isMeetingUrl(url) {
    return url.includes('meet.google.com') ||
        url.includes('zoom.us') ||
        url.includes('teams.microsoft.com') ||
        url.includes('webex.com');
}

async function checkSessionStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });
        const stored = await chrome.storage.local.get(['user', 'credits', 'connectedMeeting']);

        if (response.active) {
            // Session is actively running
            showActiveView(response);
        } else if (stored.connectedMeeting) {
            // Meeting connected but session not started
            connectedMeeting = stored.connectedMeeting;
            showConnectedView(stored.user, stored.credits || response.credits);
        } else if (stored.user) {
            // Logged in but no meeting connected
            showConnectView(stored.user, stored.credits || response.credits);
        } else {
            showLoginView();
        }
    } catch (error) {
        console.error('Error checking session status:', error);
        showLoginView();
    }
}

// View Functions
function showLoginView() {
    loginView.style.display = 'block';
    connectView.style.display = 'none';
    connectedView.style.display = 'none';
    activeView.style.display = 'none';
}

function showConnectView(user, credits) {
    loginView.style.display = 'none';
    connectView.style.display = 'block';
    connectedView.style.display = 'none';
    activeView.style.display = 'none';

    userEmailConnect.textContent = user.email;
    creditsCountConnect.textContent = credits || 0;
}

function showConnectedView(user, credits) {
    loginView.style.display = 'none';
    connectView.style.display = 'none';
    connectedView.style.display = 'block';
    activeView.style.display = 'none';

    userEmailConnected.textContent = user.email;
    creditsCountConnected.textContent = credits || 0;

    // Show meeting platform info
    if (connectedMeeting) {
        const platform = detectPlatformInfo(connectedMeeting.url);
        connectedPlatformIcon.textContent = platform.icon;
        connectedPlatformName.textContent = platform.name;
    }

    // Block start if no credits
    if ((credits || 0) <= 0) {
        startBtn.disabled = true;
        startBtn.textContent = '0 Credits - Please Top Up';
        startBtn.classList.add('bg-slate-700', 'cursor-not-allowed', 'opacity-50');
        startBtn.classList.remove('bg-primary', 'hover:bg-opacity-90');

        // Add a link or message if needed, but changing button text is a good minimal change
    } else {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Session (1 Credit)';
        startBtn.classList.remove('bg-slate-700', 'cursor-not-allowed', 'opacity-50');
        startBtn.classList.add('bg-primary', 'hover:bg-opacity-90');
    }
}

function showActiveView(sessionData) {
    loginView.style.display = 'none';
    connectView.style.display = 'none';
    connectedView.style.display = 'none';
    activeView.style.display = 'block';

    sessionPlatform.textContent = detectPlatformName(sessionData.meetingUrl || connectedMeeting?.url || '');
    startTimer(sessionData.sessionTime || 0);
}

function detectPlatformInfo(url) {
    if (url.includes('meet.google.com')) return { name: 'Google Meet', icon: '📹' };
    if (url.includes('zoom.us')) return { name: 'Zoom', icon: '🎥' };
    if (url.includes('teams.microsoft.com')) return { name: 'Microsoft Teams', icon: '💼' };
    if (url.includes('webex.com')) return { name: 'Webex', icon: '🌐' };
    return { name: 'Meeting', icon: '🎤' };
}

function detectPlatformName(url) {
    return detectPlatformInfo(url).name;
}

function startTimer(elapsedSeconds = 0) {
    let totalSeconds = elapsedSeconds;

    const updateDisplay = () => {
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hours > 0) {
            sessionTimer.textContent = `${hours}h ${mins}m ${secs}s`;
        } else if (mins > 0) {
            sessionTimer.textContent = `${mins}m ${secs}s`;
        } else {
            sessionTimer.textContent = `${secs}s`;
        }
    };

    updateDisplay();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        totalSeconds++;
        updateDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Auth Handlers
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authError.textContent = 'Please enter email and password';
        return;
    }

    loginBtn.disabled = true;
    authError.textContent = '';

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'LOGIN',
            data: { email, password }
        });

        if (response.success) {
            await chrome.storage.local.set({ user: response.user, credits: response.user.credits });
            showConnectView(response.user, response.user.credits);
        } else {
            authError.textContent = response.error || 'Login failed';
        }
    } catch (error) {
        authError.textContent = error.message;
    } finally {
        loginBtn.disabled = false;
    }
});

signupBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authError.textContent = 'Please enter email and password';
        return;
    }

    if (password.length < 6) {
        authError.textContent = 'Password must be at least 6 characters';
        return;
    }

    signupBtn.disabled = true;
    authError.textContent = '';

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'SIGNUP',
            data: { email, password }
        });

        if (response.success) {
            await chrome.storage.local.set({ user: response.user, credits: response.user.credits });
            showConnectView(response.user, response.user.credits);
        } else {
            authError.textContent = response.error || 'Signup failed';
        }
    } catch (error) {
        authError.textContent = error.message;
    } finally {
        signupBtn.disabled = false;
    }
});

// Logout handlers for both views
async function handleLogout() {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    await chrome.storage.local.remove(['user', 'credits', 'connectedMeeting']);
    connectedMeeting = null;
    showLoginView();
}

logoutBtnConnect.addEventListener('click', handleLogout);
logoutBtnConnected.addEventListener('click', handleLogout);

// Connect Meeting Handler
connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const meetingUrl = meetingUrlConnect.value || tab?.url || '';

        if (!meetingUrl) {
            alert('Please enter a meeting URL or open a meeting tab');
            return;
        }

        // Store connected meeting info
        connectedMeeting = {
            tabId: tab?.id,
            url: meetingUrl,
            platform: detectPlatformName(meetingUrl)
        };

        await chrome.storage.local.set({ connectedMeeting });

        const stored = await chrome.storage.local.get(['user', 'credits']);
        showConnectedView(stored.user, stored.credits);

    } catch (error) {
        alert('Error connecting to meeting: ' + error.message);
    } finally {
        connectBtn.disabled = false;
    }
});

// Disconnect from Connected View (before session starts)
disconnectFromConnectedBtn.addEventListener('click', async () => {
    connectedMeeting = null;
    await chrome.storage.local.remove(['connectedMeeting']);

    const stored = await chrome.storage.local.get(['user', 'credits']);
    showConnectView(stored.user, stored.credits);
});

// Start Session Handler
startBtn.addEventListener('click', async () => {
    // Validate required fields for proper LLM context
    const roleInput = document.getElementById('roleInput');
    const techStackInput = document.getElementById('techStack');

    let hasError = false;

    // Clear previous error states
    roleInput.classList.remove('error');
    techStackInput.classList.remove('error');

    if (!roleInput.value.trim()) {
        roleInput.classList.add('error');
        roleInput.focus();
        hasError = true;
    }

    if (!techStackInput.value.trim()) {
        techStackInput.classList.add('error');
        if (!hasError) techStackInput.focus();
        hasError = true;
    }

    if (hasError) {
        alert('Please fill in the required fields (Role and Tech Stack) for better AI assistance.');
        return;
    }

    startBtn.disabled = true;

    try {
        // Collect interview context from form
        const interviewContext = {
            role: roleInput.value || '',
            experienceLevel: document.getElementById('experienceLevel')?.value || 'mid',
            interviewType: document.getElementById('interviewType')?.value || 'technical',
            techStack: techStackInput.value || '',
            companyType: document.getElementById('companyType')?.value || 'startup',
            responseStyle: document.querySelector('input[name="responseStyle"]:checked')?.value || 'balanced',
            weakAreas: document.getElementById('weakAreas')?.value || ''
        };

        // Store context locally for quick access
        await chrome.storage.local.set({ interviewContext });

        const response = await chrome.runtime.sendMessage({
            type: 'START_SESSION',
            data: {
                tabId: connectedMeeting?.tabId,
                meetingUrl: connectedMeeting?.url || '',
                interviewContext: interviewContext
            }
        });

        if (response.success) {
            showActiveView({ meetingUrl: connectedMeeting?.url });
        } else {
            alert('Failed to start session: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        startBtn.disabled = false;
    }
});

// Show Overlay (re-open if closed)
showOverlayBtn.addEventListener('click', async () => {
    try {
        if (connectedMeeting?.tabId) {
            await chrome.tabs.sendMessage(connectedMeeting.tabId, { type: 'SHOW_OVERLAY' });
        } else {
            // Try to find the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_OVERLAY' });
            }
        }
    } catch (error) {
        console.error('Error showing overlay:', error);
        alert('Could not show overlay. Please refresh the meeting page.');
    }
});

// Disconnect Handler (no credit deduction)
disconnectBtn.addEventListener('click', async () => {
    if (!confirm('Disconnect from meeting? No credit will be deducted.')) {
        return;
    }

    disconnectBtn.disabled = true;
    stopTimer();

    try {
        await chrome.runtime.sendMessage({ type: 'CANCEL_SESSION' });

        // Clear connected meeting
        connectedMeeting = null;
        await chrome.storage.local.remove(['connectedMeeting']);

        // Go back to connect view
        const stored = await chrome.storage.local.get(['user', 'credits']);
        showConnectView(stored.user, stored.credits);
    } catch (error) {
        console.error('Error disconnecting:', error);
    } finally {
        disconnectBtn.disabled = false;
    }
});

// Finish Meeting Handler (completes session, deducts credit)
finishBtn.addEventListener('click', async () => {
    if (!confirm('Finish this meeting? One credit will be used.')) {
        return;
    }

    finishBtn.disabled = true;
    stopTimer();

    try {
        await chrome.runtime.sendMessage({ type: 'STOP_SESSION' });

        // Fetch fresh credits from Supabase after session ends
        const creditsResponse = await chrome.runtime.sendMessage({ type: 'GET_CREDITS' });
        const newCredits = creditsResponse.success ? creditsResponse.credits : 0;

        // Update local storage with fresh credits
        await chrome.storage.local.set({ credits: newCredits });

        // Clear connected meeting
        connectedMeeting = null;
        await chrome.storage.local.remove(['connectedMeeting']);

        // Go back to connect view
        const stored = await chrome.storage.local.get(['user']);
        showConnectView(stored.user, newCredits);
    } catch (error) {
        console.error('Error finishing meeting:', error);
    } finally {
        finishBtn.disabled = false;
    }
});

openConsoleBtn.addEventListener('click', () => {
    const url = `${CONSOLE_URL}/`;
    chrome.tabs.create({ url });
});
