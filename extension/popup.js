// Interview Copilot - Popup Script

const CONSOLE_URL = 'http://localhost:5173/dashboard/console';

// Elements
const loginView = document.getElementById('loginView');
const setupView = document.getElementById('setupView');
const activeView = document.getElementById('activeView');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('authError');

const userEmailSpan = document.getElementById('userEmail');
const creditsCountSpan = document.getElementById('creditsCount');
const meetingUrlInput = document.getElementById('meetingUrl');
const startBtn = document.getElementById('startBtn');

const sessionTimer = document.getElementById('sessionTimer');
const sessionPlatform = document.getElementById('sessionPlatform');
const openConsoleBtn = document.getElementById('openConsoleBtn');
const cancelBtn = document.getElementById('cancelBtn');
const stopBtn = document.getElementById('stopBtn');

let timerInterval = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await checkSessionStatus();
});

async function checkSessionStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' });

        // Check stored auth
        const stored = await chrome.storage.local.get(['user', 'credits']);

        if (response.active) {
            showActiveView(response);
        } else if (stored.user) {
            showSetupView(stored.user, stored.credits || response.credits);
        } else {
            showLoginView();
        }
    } catch (error) {
        console.error('Error checking session status:', error);
        showLoginView();
    }
}

function showLoginView() {
    loginView.style.display = 'block';
    setupView.style.display = 'none';
    activeView.style.display = 'none';
}

function showSetupView(user, credits) {
    loginView.style.display = 'none';
    setupView.style.display = 'block';
    activeView.style.display = 'none';

    userEmailSpan.textContent = user.email;
    creditsCountSpan.textContent = credits || 10;
}

function showActiveView(sessionData) {
    loginView.style.display = 'none';
    setupView.style.display = 'none';
    activeView.style.display = 'block';

    sessionPlatform.textContent = detectPlatformName(sessionData.meetingUrl || '');
    startTimer(sessionData.sessionTime || 0);
}

function detectPlatformName(url) {
    if (url.includes('meet.google.com')) return 'Google Meet';
    if (url.includes('zoom.us')) return 'Zoom';
    if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
    if (url.includes('webex.com')) return 'Webex';
    return 'Meeting';
}

function startTimer(elapsedSeconds = 0) {
    let totalSeconds = elapsedSeconds;

    const updateDisplay = () => {
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        // Format: show hours only if > 0, otherwise just minutes and seconds
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
            showSetupView(response.user, response.user.credits);
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
            showSetupView(response.user, response.user.credits);
        } else {
            authError.textContent = response.error || 'Signup failed';
        }
    } catch (error) {
        authError.textContent = error.message;
    } finally {
        signupBtn.disabled = false;
    }
});

logoutBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    await chrome.storage.local.remove(['user', 'credits']);
    showLoginView();
});

// Session Handlers
startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const meetingUrl = meetingUrlInput.value || tab?.url || '';

        // Collect interview context from form
        const interviewContext = {
            role: document.getElementById('roleInput')?.value || '',
            experienceLevel: document.getElementById('experienceLevel')?.value || 'mid',
            interviewType: document.getElementById('interviewType')?.value || 'technical',
            techStack: document.getElementById('techStack')?.value || '',
            companyType: document.getElementById('companyType')?.value || 'startup',
            responseStyle: document.querySelector('input[name="responseStyle"]:checked')?.value || 'balanced',
            weakAreas: document.getElementById('weakAreas')?.value || ''
        };

        // Store context locally for quick access
        await chrome.storage.local.set({ interviewContext });

        const response = await chrome.runtime.sendMessage({
            type: 'START_SESSION',
            data: {
                tabId: tab?.id,
                meetingUrl: meetingUrl,
                interviewContext: interviewContext
            }
        });

        if (response.success) {
            showActiveView({ meetingUrl });
        } else {
            alert('Failed to start session: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        startBtn.disabled = false;
    }
});

stopBtn.addEventListener('click', async () => {
    stopBtn.disabled = true;
    stopTimer();

    try {
        await chrome.runtime.sendMessage({ type: 'STOP_SESSION' });

        // Fetch fresh credits from Supabase after session ends
        const creditsResponse = await chrome.runtime.sendMessage({ type: 'GET_CREDITS' });
        const newCredits = creditsResponse.success ? creditsResponse.credits : 0;

        // Update local storage with fresh credits
        await chrome.storage.local.set({ credits: newCredits });

        const stored = await chrome.storage.local.get(['user']);
        showSetupView(stored.user, newCredits);
    } catch (error) {
        console.error('Error stopping session:', error);
    } finally {
        stopBtn.disabled = false;
    }
});

// Cancel Interview Handler - does NOT deduct credits
cancelBtn.addEventListener('click', async () => {
    if (!confirm('Cancel this interview? No credit will be deducted.')) {
        return;
    }

    cancelBtn.disabled = true;
    stopTimer();

    try {
        await chrome.runtime.sendMessage({ type: 'CANCEL_SESSION' });

        // Credits stay the same since cancelled
        const stored = await chrome.storage.local.get(['user', 'credits']);
        showSetupView(stored.user, stored.credits);
    } catch (error) {
        console.error('Error cancelling session:', error);
    } finally {
        cancelBtn.disabled = false;
    }
});

openConsoleBtn.addEventListener('click', () => {
    const url = `${CONSOLE_URL}/`;
    chrome.tabs.create({ url });
});
