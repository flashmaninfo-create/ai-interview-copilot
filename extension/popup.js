// ===== STATE MANAGEMENT =====
const STATE = {
    LOGIN: 'login',
    EMPTY: 'empty',
    FORM: 'form',
    CARDS_LIST: 'cards-list',
    IN_MEETING: 'in-meeting'
};

let currentState = STATE.EMPTY;
let savedMeetings = []; // Array of all saved meetings
let activeMeetingId = null; // Currently active meeting ID
let sessionActive = false;
let sessionStartTime = null;
let timerInterval = null;
let currentKeywords = []; // Keywords for current meeting form

// ===== DOM ELEMENTS =====
const elements = {
    // Views
    loginView: null,
    emptyStateView: null,
    formView: null,
    cardsListView: null,
    inMeetingView: null,

    // Buttons
    createNewBtn: null,
    createNewFromListBtn: null,
    saveBtn: null,
    backBtn: null,
    finishMeetingBtn: null,
    disconnectMeetingBtn: null,
    logoutBtn: null,
    dashboardBtn: null,
    refreshBtn: null,
    useThisPageLink: null,
    openConsoleLinkInMeeting: null,

    // Containers
    cardsContainer: null,

    // Form inputs
    scenarioInput: null,
    meetingUrlInput: null,
    isDesktopCall: null,
    meetingLanguageInput: null,
    translationLanguageInput: null,
    additionalInfoInput: null,
    keywordsInput: null,
    keywordsTags: null,

    // Card elements
    cardTitle: null,
    cardSubtitle: null,
    cardPlatform: null,
    cardLanguage: null,

    // In Meeting elements
    activeMeetingTitle: null,
    activeMeetingSubtitle: null,
    activeMeetingPlatform: null,
    activeMeetingLanguage: null,
    sessionTimer: null,

    // Phase navigation
    phaseItems: null,

    // User info
    userName: null,
    creditsAmount: null,
    planName: null,
    planDetails: null,

    // Auth elements
    authForm: null,
    authFullName: null,
    authEmail: null,
    authPassword: null,
    authConfirmPassword: null,
    authTitle: null,
    authSubtitle: null,
    authSubmitBtn: null,
    authToggleText: null,
    authToggleLink: null,
    fullNameGroup: null,
    confirmPasswordGroup: null,
    passwordHint: null,
    authTerms: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    loadUserInfo();
    loadMeetingsData(); // Load all saved meetings
    attachEventListeners();
});

function initializeElements() {
    // Views
    elements.loginView = document.getElementById('loginView');
    elements.emptyStateView = document.getElementById('emptyStateView');
    elements.formView = document.getElementById('formView');
    elements.cardsListView = document.getElementById('cardsListView');
    elements.inMeetingView = document.getElementById('inMeetingView');

    // Buttons
    elements.createNewBtn = document.getElementById('createNewBtn');
    elements.createNewFromListBtn = document.getElementById('createNewFromListBtn');
    elements.saveBtn = document.getElementById('saveBtn');
    elements.backBtn = document.getElementById('backBtn');
    elements.finishMeetingBtn = document.getElementById('finishMeetingBtn');
    elements.disconnectMeetingBtn = document.getElementById('disconnectMeetingBtn');
    elements.logoutBtn = document.getElementById('logoutBtn');
    elements.dashboardBtn = document.getElementById('dashboardBtn');
    elements.refreshBtn = document.getElementById('refreshBtn');
    elements.useThisPageLink = document.getElementById('useThisPageLink');
    elements.openConsoleLinkInMeeting = document.getElementById('openConsoleLinkInMeeting');

    // Containers
    elements.cardsContainer = document.getElementById('cardsContainer');

    // Form inputs
    elements.scenarioInput = document.getElementById('scenarioInput');
    elements.meetingUrlInput = document.getElementById('meetingUrlInput');
    elements.isDesktopCall = document.getElementById('isDesktopCall');
    elements.meetingLanguageInput = document.getElementById('meetingLanguageInput');
    elements.translationLanguageInput = document.getElementById('translationLanguageInput');
    elements.additionalInfoInput = document.getElementById('additionalInfoInput');
    elements.keywordsInput = document.getElementById('keywordsInput');
    elements.keywordsTags = document.getElementById('keywordsTags');

    // In Meeting elements
    elements.activeMeetingTitle = document.getElementById('activeMeetingTitle');
    elements.activeMeetingSubtitle = document.getElementById('activeMeetingSubtitle');
    elements.activeMeetingPlatform = document.getElementById('activeMeetingPlatform');
    elements.activeMeetingLanguage = document.getElementById('activeMeetingLanguage');
    elements.sessionTimer = document.getElementById('sessionTimer');

    // Phase navigation
    elements.phaseItems = document.querySelectorAll('.phase-item');

    // User info
    elements.userName = document.getElementById('userName');
    elements.creditsAmount = document.getElementById('creditsAmount');
    elements.planName = document.getElementById('planName');
    elements.planDetails = document.getElementById('planDetails');

    // Auth elements
    elements.authForm = document.getElementById('authForm');
    elements.authFullName = document.getElementById('authFullName');
    elements.authEmail = document.getElementById('authEmail');
    elements.authPassword = document.getElementById('authPassword');
    elements.authConfirmPassword = document.getElementById('authConfirmPassword');
    elements.authTitle = document.getElementById('authTitle');
    elements.authSubtitle = document.getElementById('authSubtitle');
    elements.authSubmitBtn = document.getElementById('authSubmitBtn');
    elements.authToggleText = document.getElementById('authToggleText');
    elements.authToggleLink = document.getElementById('authToggleLink');
    elements.fullNameGroup = document.getElementById('fullNameGroup');
    elements.confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    elements.passwordHint = document.getElementById('passwordHint');
    elements.authTerms = document.getElementById('authTerms');
}

// ===== EVENT LISTENERS =====
function attachEventListeners() {
    // Navigation buttons
    elements.createNewBtn?.addEventListener('click', handleCreateNew);
    elements.createNewFromListBtn?.addEventListener('click', handleCreateNew);
    elements.saveBtn?.addEventListener('click', handleSave);
    elements.backBtn?.addEventListener('click', handleBack);
    elements.refreshBtn?.addEventListener('click', handleRefresh);
    elements.useThisPageLink?.addEventListener('click', handleUseThisPage);

    // In Meeting buttons
    elements.finishMeetingBtn?.addEventListener('click', handleFinishMeeting);
    elements.disconnectMeetingBtn?.addEventListener('click', handleDisconnectMeeting);
    elements.openConsoleLinkInMeeting?.addEventListener('click', handleDashboard);

    // Footer buttons
    elements.logoutBtn?.addEventListener('click', handleLogout);
    elements.dashboardBtn?.addEventListener('click', handleDashboard);

    // Upgrade link
    const upgradeLink = document.getElementById('upgradeLink');
    if (upgradeLink) {
        upgradeLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'http://localhost:5173/pricing' });
        });
    }

    // Auth form and toggle
    if (elements.authForm) {
        elements.authForm.addEventListener('submit', handleAuthSubmit);
    }
    if (elements.authToggleLink) {
        elements.authToggleLink.addEventListener('click', handleAuthToggle);
    }

    // Keywords input - add tag on Enter
    if (elements.keywordsInput) {
        elements.keywordsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const keyword = elements.keywordsInput.value.trim();
                if (keyword && !currentKeywords.includes(keyword)) {
                    currentKeywords.push(keyword);
                    renderKeywordTags();
                }
                elements.keywordsInput.value = '';
            }
        });
    }

    // Event delegation for dynamically created card buttons
    if (elements.cardsContainer) {
        elements.cardsContainer.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const meetingId = target.dataset.id;
            if (!meetingId) return;

            if (target.classList.contains('card-start-btn')) {
                startMeetingById(meetingId);
            } else if (target.classList.contains('card-edit-btn')) {
                editMeetingById(meetingId);
            } else if (target.classList.contains('card-delete-btn')) {
                deleteMeetingById(meetingId);
            }
        });
    }
}

// ===== STATE TRANSITIONS =====
function setState(newState) {
    currentState = newState;

    // Hide all views
    if (elements.loginView) elements.loginView.style.display = 'none';
    if (elements.emptyStateView) elements.emptyStateView.style.display = 'none';
    if (elements.formView) elements.formView.style.display = 'none';
    if (elements.cardsListView) elements.cardsListView.style.display = 'none';
    if (elements.inMeetingView) elements.inMeetingView.style.display = 'none';

    // Show appropriate view
    switch (newState) {
        case STATE.LOGIN:
            if (elements.loginView) elements.loginView.style.display = 'block';
            break;
        case STATE.EMPTY:
            if (elements.emptyStateView) elements.emptyStateView.style.display = 'block';
            setActivePhase('before');
            break;
        case STATE.FORM:
            if (elements.formView) elements.formView.style.display = 'block';
            setActivePhase('before');
            break;
        case STATE.CARDS_LIST:
            if (elements.cardsListView) elements.cardsListView.style.display = 'block';
            setActivePhase('before');
            break;
        case STATE.IN_MEETING:
            if (elements.inMeetingView) elements.inMeetingView.style.display = 'block';
            setActivePhase('during');
            break;
    }
}

// Set active phase in navigation
function setActivePhase(phase) {
    if (!elements.phaseItems) return;

    elements.phaseItems.forEach(item => {
        const itemPhase = item.getAttribute('data-phase');
        if (itemPhase === phase) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ===== EVENT HANDLERS =====
function handleCreateNew(e) {
    e.preventDefault();
    clearForm();
    setState(STATE.FORM);
}

async function handleSave(e) {
    e.preventDefault();

    // Validate form
    const scenario = elements.scenarioInput.value;
    const meetingUrl = elements.meetingUrlInput.value;
    const meetingLanguage = elements.meetingLanguageInput.value;

    if (!scenario) {
        showAlert('Please select a scenario', 'warning');
        return;
    }

    if (!meetingUrl) {
        showAlert('Please enter a meeting URL', 'warning');
        return;
    }

    // Check if editing existing meeting
    const editingId = elements.saveBtn.dataset.editingId;

    // Create/update meeting object
    const meeting = {
        id: editingId || Date.now().toString(),
        scenario: scenario,
        meetingUrl: meetingUrl,
        isDesktopCall: elements.isDesktopCall.checked,
        meetingLanguage: meetingLanguage,
        translationLanguage: elements.translationLanguageInput.value,
        additionalInfo: elements.additionalInfoInput?.value || '',
        keywords: [...currentKeywords],
        createdAt: editingId ? savedMeetings.find(m => m.id === editingId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Generate title and subtitle based on scenario
    meeting.title = getScenarioTitle(scenario);
    meeting.subtitle = getMeetingSubtitle(meetingUrl);
    meeting.platform = meeting.isDesktopCall ? 'Desktop' : 'Web Browser';

    if (editingId) {
        // Update existing meeting
        const index = savedMeetings.findIndex(m => m.id === editingId);
        if (index !== -1) {
            savedMeetings[index] = meeting;
        }
        delete elements.saveBtn.dataset.editingId;
    } else {
        // Add new meeting to array
        savedMeetings.push(meeting);
    }

    saveMeetingsData();

    // Reset keywords
    currentKeywords = [];
    renderKeywordTags();

    // Render all cards
    renderMeetingCards();
    setState(STATE.CARDS_LIST);
}

// Render keyword tags in the form
function renderKeywordTags() {
    if (!elements.keywordsTags) return;

    elements.keywordsTags.innerHTML = currentKeywords.map((keyword, index) => `
        <span class="keyword-tag">
            ${keyword}
            <span class="keyword-tag-remove" data-index="${index}">×</span>
        </span>
    `).join('');

    // Add click listeners to remove buttons
    elements.keywordsTags.querySelectorAll('.keyword-tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            currentKeywords.splice(index, 1);
            renderKeywordTags();
        });
    });
}

function handleBack(e) {
    e.preventDefault();

    // Clear editing mode if active
    if (elements.saveBtn.dataset.editingId) {
        delete elements.saveBtn.dataset.editingId;
    }

    // Clear keywords
    currentKeywords = [];
    renderKeywordTags();

    if (savedMeetings.length > 0) {
        // If there are saved meetings, go back to cards list
        renderMeetingCards();
        setState(STATE.CARDS_LIST);
    } else {
        // Otherwise, go to empty state
        setState(STATE.EMPTY);
    }
}

function handleStart(e) {
    e.preventDefault();

    if (!currentMeeting) {
        showAlert('No meeting data available', 'warning');
        return;
    }

    // Update In Meeting view with meeting data
    if (elements.activeMeetingTitle) {
        elements.activeMeetingTitle.textContent = currentMeeting.title || 'Meeting';
    }
    if (elements.activeMeetingSubtitle) {
        elements.activeMeetingSubtitle.textContent = currentMeeting.subtitle || 'No description';
    }
    if (elements.activeMeetingPlatform) {
        elements.activeMeetingPlatform.textContent = currentMeeting.platform || 'Web Browser';
    }
    if (elements.activeMeetingLanguage) {
        elements.activeMeetingLanguage.textContent = capitalizeFirst(currentMeeting.meetingLanguage || 'English');
    }

    // Start session timer
    sessionActive = true;
    sessionStartTime = Date.now();
    startTimer();

    // Transition to In Meeting state
    setState(STATE.IN_MEETING);

    // Send message to background script to start the meeting
    chrome.runtime.sendMessage({
        type: 'START_MEETING',
        meeting: currentMeeting
    }, (response) => {
        if (response && response.success) {
            console.log('Meeting started successfully');
            console.log('Session ID:', response.sessionId);
            console.log('Console Token:', response.consoleToken);

            // Store session info
            if (response.sessionId) {
                chrome.storage.local.set({
                    activeSessionId: response.sessionId,
                    consoleToken: response.consoleToken
                });
            }
        } else {
            console.error('Failed to start meeting');
            alert('Failed to start meeting. Please try again.');
            // Revert state
            sessionActive = false;
            stopTimer();
            setState(STATE.CARD);
        }
    });
}

// Start session timer
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (!sessionActive || !sessionStartTime) return;

        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (elements.sessionTimer) {
            elements.sessionTimer.textContent = timeString;
        }
    }, 1000);
}

// Stop session timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Handle Finish Meeting
function handleFinishMeeting(e) {
    e.preventDefault();

    if (!confirm('Are you sure you want to finish this meeting? This will end the session and deduct credits.')) {
        return;
    }

    // Send finish meeting message
    chrome.runtime.sendMessage({
        type: 'FINISH_MEETING',
        sessionId: currentMeeting?.id
    }, (response) => {
        if (response && response.success) {
            console.log('Meeting finished successfully');
            endMeetingSession();
        } else {
            alert('Failed to finish meeting. Please try again.');
        }
    });
}

// Handle Disconnect Meeting
function handleDisconnectMeeting(e) {
    e.preventDefault();

    if (!confirm('Disconnect from the meeting? You can reconnect later without losing your session.')) {
        return;
    }

    // Send disconnect message
    chrome.runtime.sendMessage({
        type: 'DISCONNECT_MEETING',
        sessionId: currentMeeting?.id
    }, (response) => {
        console.log('Disconnected from meeting');
        endMeetingSession(); // Don't clear meeting data
    });
}

// End meeting session
function endMeetingSession() {
    sessionActive = false;
    stopTimer();

    // Clear active meeting
    activeMeetingId = null;

    // Clear session storage
    chrome.storage.local.remove(['activeSessionId', 'consoleToken']);

    // Reset phase to "Before the Meeting"
    setActivePhase('before');

    // Return to cards list
    renderMeetingCards();
    setState(STATE.CARDS_LIST);
}

// ===== MULTIPLE MEETINGS MANAGEMENT =====

// Render all meeting cards
function renderMeetingCards() {
    if (!elements.cardsContainer) return;

    elements.cardsContainer.innerHTML = '';

    if (savedMeetings.length === 0) {
        setState(STATE.EMPTY);
        return;
    }

    savedMeetings.forEach(meeting => {
        const card = createMeetingCard(meeting);
        elements.cardsContainer.appendChild(card);
    });
}

// Create individual meeting card
function createMeetingCard(meeting) {
    const card = document.createElement('div');
    card.className = 'meeting-card';
    card.dataset.id = meeting.id;

    card.innerHTML = `
        <div class="card-header">
            <div class="card-title">${meeting.title}</div>
            <div class="card-actions">
                <button class="card-action-btn card-edit-btn" data-id="${meeting.id}" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.3333 2.00004C11.5084 1.82494 11.7163 1.68605 11.9451 1.59129C12.1739 1.49653 12.4191 1.44775 12.6667 1.44775C12.9142 1.44775 13.1594 1.49653 13.3882 1.59129C13.617 1.68605 13.8249 1.82494 14 2.00004C14.1751 2.17513 14.314 2.383 14.4088 2.61182C14.5035 2.84064 14.5523 3.08584 14.5523 3.33337C14.5523 3.58091 14.5035 3.82611 14.4088 4.05493C14.314 4.28375 14.1751 4.49162 14 4.66671L5 13.6667L1.33333 14.6667L2.33333 11L11.3333 2.00004Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="card-action-btn card-delete-btn" data-id="${meeting.id}" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4H3.33333H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M5.33333 4V2.66667C5.33333 2.31304 5.47381 1.97391 5.72386 1.72386C5.97391 1.47381 6.31304 1.33333 6.66667 1.33333H9.33333C9.68696 1.33333 10.0261 1.47381 10.2761 1.72386C10.5262 1.97391 10.6667 2.31304 10.6667 2.66667V4M12.6667 4V13.3333C12.6667 13.687 12.5262 14.0261 12.2761 14.2761C12.0261 14.5262 11.687 14.6667 11.3333 14.6667H4.66667C4.31304 14.6667 3.97391 14.5262 3.72386 14.2761C3.47381 14.0261 3.33333 13.687 3.33333 13.3333V4H12.6667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="card-body">
            <div class="card-subtitle">${meeting.subtitle}</div>
            <div class="card-platform">
                <span>${meeting.platform}</span>
                <span>(${capitalizeFirst(meeting.meetingLanguage)})</span>
            </div>
        </div>
        <button class="btn-start card-start-btn" data-id="${meeting.id}">
            <span class="start-icon">X</span>
            <span>Start</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;

    return card;
}


// Set active phase in navigation
function setActivePhase(phaseName) {
    const phaseItems = document.querySelectorAll('.phase-item');
    phaseItems.forEach(item => {
        if (item.dataset.phase === phaseName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Start meeting by ID
function startMeetingById(meetingId) {
    const meeting = savedMeetings.find(m => m.id === meetingId);
    if (!meeting) return;

    activeMeetingId = meetingId;

    // Update In Meeting view with meeting data
    if (elements.activeMeetingTitle) {
        elements.activeMeetingTitle.textContent = meeting.title || 'Meeting';
    }
    if (elements.activeMeetingSubtitle) {
        elements.activeMeetingSubtitle.textContent = meeting.subtitle || 'No description';
    }
    if (elements.activeMeetingPlatform) {
        elements.activeMeetingPlatform.textContent = meeting.platform || 'Web Browser';
    }
    if (elements.activeMeetingLanguage) {
        elements.activeMeetingLanguage.textContent = capitalizeFirst(meeting.meetingLanguage || 'English');
    }

    // Start session timer
    sessionActive = true;
    sessionStartTime = Date.now();
    startTimer();

    // Update phase to "In the Meeting"
    setActivePhase('during');

    // Transition to In Meeting state
    setState(STATE.IN_MEETING);

    // Send message to background script to start the meeting
    chrome.runtime.sendMessage({
        type: 'START_MEETING',
        meeting: meeting
    }, (response) => {
        if (response && response.success) {
            console.log('Meeting started successfully');
            console.log('Session ID:', response.sessionId);
            console.log('Console Token:', response.consoleToken);

            // Store session info
            if (response.sessionId) {
                chrome.storage.local.set({
                    activeSessionId: response.sessionId,
                    consoleToken: response.consoleToken
                });
            }
        } else {
            console.error('Failed to start meeting');
            alert('Failed to start meeting. Please try again.');
            // Revert state and phase
            sessionActive = false;
            stopTimer();
            setActivePhase('before');
            setState(STATE.CARDS_LIST);
        }
    });
}

// Edit meeting by ID
function editMeetingById(meetingId) {
    const meeting = savedMeetings.find(m => m.id === meetingId);
    if (!meeting) return;

    // Populate form with meeting data
    elements.scenarioInput.value = meeting.scenario || '';
    elements.meetingUrlInput.value = meeting.meetingUrl || '';
    elements.isDesktopCall.checked = meeting.isDesktopCall || false;
    elements.meetingLanguageInput.value = meeting.meetingLanguage || 'english';
    elements.translationLanguageInput.value = meeting.translationLanguage || 'none';

    // Load additional info and keywords
    if (elements.additionalInfoInput) {
        elements.additionalInfoInput.value = meeting.additionalInfo || '';
    }
    currentKeywords = meeting.keywords ? [...meeting.keywords] : [];
    renderKeywordTags();

    // Store the ID so we can update instead of create
    elements.saveBtn.dataset.editingId = meetingId;

    setState(STATE.FORM);
}

// Delete meeting by ID
async function deleteMeetingById(meetingId) {
    const confirmed = await showConfirm('Are you sure you want to delete this meeting?');
    if (!confirmed) {
        return;
    }

    savedMeetings = savedMeetings.filter(m => m.id !== meetingId);
    saveMeetingsData();
    renderMeetingCards();

    if (savedMeetings.length === 0) {
        setState(STATE.EMPTY);
    }
}

function handleEdit(e) {
    e.preventDefault();

    if (!currentMeeting) return;

    // Populate form with current meeting data
    elements.scenarioInput.value = currentMeeting.scenario || '';
    elements.meetingUrlInput.value = currentMeeting.meetingUrl || '';
    elements.isDesktopCall.checked = currentMeeting.isDesktopCall || false;
    elements.meetingLanguageInput.value = currentMeeting.meetingLanguage || 'english';
    elements.translationLanguageInput.value = currentMeeting.translationLanguage || 'none';

    setState(STATE.FORM);
}

function handleDelete(e) {
    e.preventDefault();

    if (!confirm('Are you sure you want to delete this meeting?')) {
        return;
    }

    currentMeeting = null;
    clearMeetingData();
    setState(STATE.EMPTY);
}

function handleRefresh(e) {
    e.preventDefault();
    loadMeetingsData();
    loadUserInfo();
    console.log('Popup refreshed');
}

function handleUseThisPage(e) {
    e.preventDefault();

    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            elements.meetingUrlInput.value = tabs[0].url;
        }
    });
}

function handleLogout(e) {
    e.preventDefault();

    // Check if session is active
    if (sessionActive) {
        if (!confirm('You have an active meeting session. Logging out will disconnect you. Continue?')) {
            return;
        }
        // Stop session
        sessionActive = false;
        stopTimer();
    }

    // Clear all user data
    chrome.storage.local.clear(() => {
        // Send message to background to clear session
        chrome.runtime.sendMessage({ type: 'LOGOUT' });

        // Clear local state
        savedMeetings = [];
        activeMeetingId = null;

        // Return to empty state (login view would go here if implemented)
        setState(STATE.EMPTY);

        console.log('Logged out successfully');
    });
}

function handleDashboard(e) {
    e.preventDefault();

    // Open dashboard in new tab
    chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
}

async function handleFinishMeeting(e) {
    e.preventDefault();

    const confirmed = await showConfirm('Are you sure you want to finish this meeting? This will end the session and deduct credits.');
    if (!confirmed) {
        return;
    }

    // Store the meeting ID before clearing it
    const meetingIdToRemove = activeMeetingId;

    // Send message to background to finish meeting
    chrome.runtime.sendMessage({
        type: 'FINISH_MEETING',
        sessionId: activeMeetingId
    }, (response) => {
        if (response && response.success) {
            console.log('Meeting finished successfully');

            // Remove the finished meeting card from saved meetings
            if (meetingIdToRemove) {
                savedMeetings = savedMeetings.filter(m => m.id !== meetingIdToRemove);
                saveMeetingsData();
                console.log('Meeting card removed:', meetingIdToRemove);
            }

            endMeetingSession();
        } else {
            console.error('Failed to finish meeting:', response?.error);
            showAlert('Failed to finish meeting. Please try again.', 'error');
        }
    });
}

async function handleDisconnectMeeting(e) {
    e.preventDefault();

    const confirmed = await showConfirm('Disconnect from this meeting? You can reconnect later without deducting credits.');
    if (!confirmed) {
        return;
    }

    // Send message to background to disconnect
    chrome.runtime.sendMessage({
        type: 'DISCONNECT_MEETING',
        sessionId: activeMeetingId
    }, (response) => {
        console.log('Disconnected from meeting');
        endMeetingSession();
    });
}

// ===== AUTHENTICATION HANDLERS =====
let isLoginMode = true;

// ===== CUSTOM DIALOG SYSTEM =====
function showAlert(message, type = 'info') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('dialogOverlay');
        const icon = document.getElementById('dialogIcon');
        const messageEl = document.getElementById('dialogMessage');
        const actionsEl = document.getElementById('dialogActions');

        // Set icon based on type
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            success: '✓',
            error: '✕'
        };

        icon.textContent = icons[type] || icons.info;
        icon.className = `dialog-icon ${type}`;
        messageEl.textContent = message;

        // Create OK button
        actionsEl.innerHTML = '';
        const okBtn = document.createElement('button');
        okBtn.className = 'dialog-btn dialog-btn-primary';
        okBtn.textContent = 'OK';
        okBtn.onclick = () => {
            overlay.style.display = 'none';
            resolve(true);
        };
        actionsEl.appendChild(okBtn);

        overlay.style.display = 'flex';
        okBtn.focus();
    });
}

function showConfirm(message, type = 'warning') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('dialogOverlay');
        const icon = document.getElementById('dialogIcon');
        const messageEl = document.getElementById('dialogMessage');
        const actionsEl = document.getElementById('dialogActions');

        // Set icon based on type
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            success: '✓',
            error: '✕'
        };

        icon.textContent = icons[type] || icons.warning;
        icon.className = `dialog-icon ${type}`;
        messageEl.textContent = message;

        // Create Cancel and Confirm buttons
        actionsEl.innerHTML = '';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'dialog-btn dialog-btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            overlay.style.display = 'none';
            resolve(false);
        };

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'dialog-btn dialog-btn-primary';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.onclick = () => {
            overlay.style.display = 'none';
            resolve(true);
        };

        actionsEl.appendChild(cancelBtn);
        actionsEl.appendChild(confirmBtn);

        overlay.style.display = 'flex';
        confirmBtn.focus();
    });
}

function handleAuthToggle(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        // Switch to login mode
        elements.authTitle.textContent = 'Welcome Back';
        elements.authSubtitle.textContent = 'Sign in to continue your interview preparation';
        elements.authSubmitBtn.textContent = 'Sign In';
        elements.authToggleText.textContent = "Don't have an account?";
        elements.authToggleLink.textContent = 'Sign Up';

        // Hide signup-only fields
        if (elements.fullNameGroup) elements.fullNameGroup.style.display = 'none';
        if (elements.confirmPasswordGroup) elements.confirmPasswordGroup.style.display = 'none';
        if (elements.passwordHint) elements.passwordHint.style.display = 'none';
        if (elements.authTerms) elements.authTerms.style.display = 'none';
    } else {
        // Switch to signup mode
        elements.authTitle.textContent = 'Create Account';
        elements.authSubtitle.textContent = 'Join to get your AI Interview Copilot';
        elements.authSubmitBtn.textContent = 'Sign Up';
        elements.authToggleText.textContent = 'Already have an account?';
        elements.authToggleLink.textContent = 'Sign In';

        // Show signup-only fields
        if (elements.fullNameGroup) elements.fullNameGroup.style.display = 'flex';
        if (elements.confirmPasswordGroup) elements.confirmPasswordGroup.style.display = 'flex';
        if (elements.passwordHint) elements.passwordHint.style.display = 'block';
        if (elements.authTerms) elements.authTerms.style.display = 'block';
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();

    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;
    const fullName = elements.authFullName?.value.trim() || '';
    const confirmPassword = elements.authConfirmPassword?.value || '';

    // Basic validation
    if (!email || !password) {
        alert('Please fill in all required fields');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    // Signup mode validation
    if (!isLoginMode) {
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
    }

    // Disable button during submission
    elements.authSubmitBtn.disabled = true;
    elements.authSubmitBtn.textContent = isLoginMode ? 'Signing in...' : 'Signing up...';

    // Send to background script
    const messageType = isLoginMode ? 'LOGIN' : 'SIGNUP';
    const authData = { email, password };
    if (!isLoginMode && fullName) {
        authData.fullName = fullName;
    }

    chrome.runtime.sendMessage({
        type: messageType,
        data: authData
    }, (response) => {
        // Re-enable button
        elements.authSubmitBtn.disabled = false;
        elements.authSubmitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';

        if (response && response.success) {
            console.log('Authentication successful', response);

            // Store user data and credits, wait for completion
            const storageData = {};
            if (response.user) {
                storageData.user = response.user;
            }
            if (response.credits !== undefined) {
                storageData.credits = response.credits;
            }

            chrome.storage.local.set(storageData, () => {
                console.log('User data stored successfully:', storageData);

                // Clear form
                elements.authEmail.value = '';
                elements.authPassword.value = '';
                if (elements.authFullName) elements.authFullName.value = '';
                if (elements.authConfirmPassword) elements.authConfirmPassword.value = '';

                // Load user info and meetings after storage is complete
                loadUserInfo();
                loadMeetingsData();
            });
        } else {
            alert(response?.error || 'Authentication failed. Please try again.');
        }
    });
}

// ===== DATA MANAGEMENT =====
function saveMeetingsData() {
    chrome.storage.local.set({ savedMeetings }, () => {
        console.log('Meetings saved:', savedMeetings);
    });
}

function loadMeetingsData() {
    chrome.storage.local.get(['savedMeetings', 'user'], (result) => {
        // Check if user is logged in
        if (!result.user) {
            setState(STATE.LOGIN);
            return;
        }

        savedMeetings = result.savedMeetings || [];

        // Check if there's an active session in background
        chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Could not get session status:', chrome.runtime.lastError.message);
            }

            if (response && response.active) {
                console.log('Active session detected:', response);

                // Session is active - show IN_MEETING state
                sessionActive = true;

                // Try to find the matching meeting from saved meetings by URL
                if (response.meetingUrl && savedMeetings.length > 0) {
                    const matchingMeeting = savedMeetings.find(m =>
                        m.meetingUrl && response.meetingUrl.includes(m.meetingUrl.split('?')[0])
                    );
                    if (matchingMeeting) {
                        activeMeetingId = matchingMeeting.id;
                        console.log('Matched active session to meeting:', activeMeetingId);
                    }
                }

                // If no URL match but only one meeting, assume it's that one
                if (!activeMeetingId && savedMeetings.length === 1) {
                    activeMeetingId = savedMeetings[0].id;
                    console.log('Only one meeting, assuming active:', activeMeetingId);
                }

                // Calculate session start time from elapsed time
                if (response.sessionTime) {
                    sessionStartTime = Date.now() - (response.sessionTime * 1000);
                } else {
                    sessionStartTime = Date.now();
                }

                // Update meeting info display
                const activeMeeting = savedMeetings.find(m => m.id === activeMeetingId);
                if (elements.activeMeetingTitle) {
                    elements.activeMeetingTitle.textContent = activeMeeting?.title || 'Active Interview';
                }
                if (elements.activeMeetingSubtitle) {
                    elements.activeMeetingSubtitle.textContent = activeMeeting?.subtitle || response.meetingUrl || 'Interview in progress';
                }
                if (elements.activeMeetingPlatform) {
                    elements.activeMeetingPlatform.textContent = activeMeeting?.platform || getPlatformFromUrl(response.meetingUrl || '');
                }

                // Start timer display
                startTimer();

                // Update phase to "In the Meeting"
                setActivePhase('during');

                // Show IN_MEETING state
                setState(STATE.IN_MEETING);
                return;
            }

            // No active session - show normal state
            if (savedMeetings.length > 0) {
                renderMeetingCards();
                setState(STATE.CARDS_LIST);
            } else {
                setState(STATE.EMPTY);
            }
        });
    });
}

// Helper to detect platform from URL
function getPlatformFromUrl(url) {
    if (!url) return 'Web Browser';
    try {
        const hostname = new URL(url).hostname;
        if (hostname.includes('meet.google.com')) return 'Google Meet';
        if (hostname.includes('zoom.us')) return 'Zoom';
        if (hostname.includes('teams.microsoft.com')) return 'Microsoft Teams';
        if (hostname.includes('webex.com')) return 'Webex';
        return 'Web Browser';
    } catch {
        return 'Web Browser';
    }
}

function loadUserInfo() {
    // Load user info from storage
    chrome.storage.local.get(['user', 'credits'], (result) => {
        if (result.user) {
            elements.userName.textContent = result.user.name || result.user.email || 'User';
        }

        if (result.credits !== undefined) {
            elements.creditsAmount.textContent = `$${result.credits.toFixed(2)}`;
        }
    });
}

// ===== HELPER FUNCTIONS =====
function clearForm() {
    elements.scenarioInput.value = '';
    elements.meetingUrlInput.value = '';
    elements.isDesktopCall.checked = false;
    elements.meetingLanguageInput.value = 'english';
    elements.translationLanguageInput.value = 'none';
    if (elements.additionalInfoInput) elements.additionalInfoInput.value = '';
    currentKeywords = [];
    renderKeywordTags();
}

function updateCard(meeting) {
    if (!meeting) return;

    elements.cardTitle.textContent = meeting.title || 'Meeting';
    elements.cardSubtitle.textContent = meeting.subtitle || 'No description';
    elements.cardPlatform.textContent = meeting.platform || 'Web Browser';
    elements.cardLanguage.textContent = `(${capitalizeFirst(meeting.meetingLanguage || 'English')})`;
}

function getScenarioTitle(scenario) {
    const titles = {
        'job-interview': 'Job Interview',
        'client-meeting': 'Client Meeting',
        'team-standup': 'Team Standup',
        'presentation': 'Presentation',
        'other': 'Meeting'
    };
    return titles[scenario] || 'Meeting';
}

function getMeetingSubtitle(url) {
    // Try to extract meaningful info from URL
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        if (hostname.includes('meet.google.com')) {
            return 'Google Meet';
        } else if (hostname.includes('zoom.us')) {
            return 'Zoom Meeting';
        } else if (hostname.includes('teams.microsoft.com')) {
            return 'Microsoft Teams';
        } else {
            return hostname;
        }
    } catch (e) {
        return 'Online Meeting';
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== MESSAGE LISTENER =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'CREDITS_UPDATED':
            if (message.credits !== undefined) {
                elements.creditsAmount.textContent = `$${message.credits.toFixed(2)}`;
            }
            break;

        case 'MEETING_ENDED':
            // Clear current meeting when it ends
            endMeetingSession(true);
            break;

        case 'SESSION_STARTED':
            // Session started confirmation
            console.log('Session started:', message.sessionId);
            break;
    }
});
