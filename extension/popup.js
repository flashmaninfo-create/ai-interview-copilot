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

// ===== DASHBOARD URL CONFIGURATION =====
const DASHBOARD_URLS = {
    PRODUCTION: 'https://xtroone.com',
    DEV: 'https://ai-interview-copilot-kappa.vercel.app',
    LOCAL: 'http://localhost:5173'
};

// Default to local for development, can be changed via settings
let DASHBOARD_URL = DASHBOARD_URLS.LOCAL;

// Helper function to get dashboard URL (can be extended to read from storage)
function getDashboardUrl() {
    return DASHBOARD_URL;
}

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
    console.log('Logout button found:', elements.logoutBtn);
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

    // Dynamic Fields
    elements.roleInput = document.getElementById('roleInput');
    elements.companyInput = document.getElementById('companyInput');
    elements.experienceInput = document.getElementById('experienceInput');
    elements.interviewTypeInput = document.getElementById('interviewTypeInput');
    elements.techStackInput = document.getElementById('techStackInput');
    elements.jdInput = document.getElementById('jdInput');

    elements.hrRoleInput = document.getElementById('hrRoleInput');
    elements.hrCompanyInput = document.getElementById('hrCompanyInput');
    elements.hrRecruiterInput = document.getElementById('hrRecruiterInput');
    elements.hrCultureInput = document.getElementById('hrCultureInput');

    elements.teamProjectInput = document.getElementById('teamProjectInput');
    elements.teamRoleInput = document.getElementById('teamRoleInput');
    elements.teamUpdateInput = document.getElementById('teamUpdateInput');

    elements.clientNameInput = document.getElementById('clientNameInput');
    elements.clientContextInput = document.getElementById('clientContextInput');

    elements.consultingClientInput = document.getElementById('consultingClientInput');
    elements.consultingTopicInput = document.getElementById('consultingTopicInput');
    elements.consultingProblemInput = document.getElementById('consultingProblemInput');

    elements.casualTopicInput = document.getElementById('casualTopicInput');
    elements.casualParticipantsInput = document.getElementById('casualParticipantsInput');

    elements.assessmentPlatformInput = document.getElementById('assessmentPlatformInput');
    elements.assessmentLanguageInput = document.getElementById('assessmentLanguageInput');
    elements.assessmentTypeInput = document.getElementById('assessmentTypeInput');

    // Keywords
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
    elements.loginBtn = document.getElementById('loginBtn');
    elements.signupBtn = document.getElementById('signupBtn');
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
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout event listener attached successfully');
    } else {
        console.error('Logout button not found during event listener attachment');
    }
    elements.dashboardBtn?.addEventListener('click', handleDashboard);

    // Upgrade link
    const upgradeLink = document.getElementById('upgradeLink');
    if (upgradeLink) {
        upgradeLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: `${getDashboardUrl()}/pricing` });
        });
    }

    // Auth buttons (External Links)
    elements.loginBtn?.addEventListener('click', () => {
        chrome.tabs.create({ url: `${getDashboardUrl()}/login` });
    });

    elements.signupBtn?.addEventListener('click', () => {
        chrome.tabs.create({ url: `${getDashboardUrl()}/signup` });
    });

    // Scenario change
    if (elements.scenarioInput) {
        elements.scenarioInput.addEventListener('change', updateScenarioFields);
        // Initialize fields based on default
        updateScenarioFields();
    }

    // Auto-save draft
    Object.values(elements).forEach(el => {
        if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) {
            el.addEventListener('input', saveDraft);
            el.addEventListener('change', saveDraft);
        }
    });

    // Keywords input
    if (elements.keywordsInput) {
        elements.keywordsInput.addEventListener('keydown', handleKeywordInput);
    }

    // Keywords tags (delegation for delete)
    if (elements.keywordsTags) {
        elements.keywordsTags.addEventListener('click', handleKeywordDelete);
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
            } else if (target.classList.contains('card-resume-btn')) {
                resumeMeetingById(meetingId);
            } else if (target.classList.contains('card-edit-btn')) {
                editMeetingById(meetingId);
            } else if (target.classList.contains('card-delete-btn')) {
                deleteMeetingById(meetingId);
            }
        });
    }

    // Fallback: Ensure logout button has event listener (direct DOM query)
    setTimeout(() => {
        const logoutBtnDirect = document.getElementById('logoutBtn');
        if (logoutBtnDirect && !logoutBtnDirect.onclick) {
            console.log('Attaching fallback logout listener via direct DOM query');
            logoutBtnDirect.addEventListener('click', handleLogout);
        }
    }, 100);
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

    // Check for draft
    chrome.storage.local.get(['meetingDraft'], (result) => {
        if (result.meetingDraft) {
            restoreDraft(result.meetingDraft);
        } else {
            clearForm();
        }
        setState(STATE.FORM);
    });
}

// Toggle fields based on scenario
function updateScenarioFields() {
    const scenario = elements.scenarioInput?.value || 'job-interview';
    const scenarios = ['job-interview', 'hr-interview', 'team-meeting', 'client-meeting', 'consulting', 'casual-conversation', 'online-assessment'];

    // Hide all first
    scenarios.forEach(type => {
        const el = document.getElementById(`scenarioFields-${type}`);
        if (el) el.style.display = 'none';
    });

    // Show target
    const targetEl = document.getElementById(`scenarioFields-${scenario}`);
    if (targetEl) targetEl.style.display = 'block';
}

async function handleSave(e) {
    e.preventDefault();

    // Clear previous errors
    clearAllErrors();

    // Validate form
    const scenario = elements.scenarioInput.value;
    const meetingUrl = elements.meetingUrlInput.value;
    const meetingLanguage = elements.meetingLanguageInput.value;

    let valid = true;

    if (!scenario) {
        validateField(elements.scenarioInput, 'Scenario is required');
        valid = false;
    }

    if (!meetingUrl) {
        validateField(elements.meetingUrlInput, 'Meeting URL is required');
        valid = false;
    }

    // Mandatory fields validation
    if (scenario === 'job-interview') {
        if (!elements.roleInput.value.trim()) {
            validateField(elements.roleInput, 'Field is necessary');
            valid = false;
        }
        if (!elements.companyInput.value.trim()) {
            validateField(elements.companyInput, 'Field is necessary');
            valid = false;
        }
    } else if (scenario === 'hr-interview') {
        if (!elements.hrRoleInput.value.trim()) {
            validateField(elements.hrRoleInput, 'Field is necessary');
            valid = false;
        }
        if (!elements.hrCompanyInput.value.trim()) {
            validateField(elements.hrCompanyInput, 'Field is necessary');
            valid = false;
        }
    }

    if (!valid) return;

    // Gather context based on scenario
    let interviewContext = {};

    if (scenario === 'job-interview') {
        interviewContext = {
            role: elements.roleInput?.value || '',
            companyName: elements.companyInput?.value || '',
            experienceLevel: elements.experienceInput?.value || 'senior',
            interviewType: elements.interviewTypeInput?.value || 'technical',
            techStack: elements.techStackInput?.value || '',
            jobDescription: elements.jdInput?.value || ''
        };
    } else if (scenario === 'hr-interview') {
        interviewContext = {
            role: elements.hrRoleInput?.value || '',
            companyName: elements.hrCompanyInput?.value || '',
            recruiterName: elements.hrRecruiterInput?.value || '',
            cultureValues: elements.hrCultureInput?.value || '',
            interviewType: 'hr'
        };
    } else if (scenario === 'team-meeting') {
        interviewContext = {
            teamName: elements.teamProjectInput?.value || '',
            role: elements.teamRoleInput?.value || '',
            updates: elements.teamUpdateInput?.value || ''
        };
    } else if (scenario === 'client-meeting') {
        interviewContext = {
            clientName: elements.clientNameInput?.value || '',
            goal: elements.clientContextInput?.value || '',
            role: 'Participant'
        };
    } else if (scenario === 'consulting') {
        interviewContext = {
            clientName: elements.consultingClientInput?.value || '',
            topic: elements.consultingTopicInput?.value || '',
            problemStatement: elements.consultingProblemInput?.value || ''
        };
    } else if (scenario === 'casual-conversation') {
        interviewContext = {
            topic: elements.casualTopicInput?.value || '',
            participants: elements.casualParticipantsInput?.value || ''
        };
    } else if (scenario === 'online-assessment') {
        interviewContext = {
            platform: elements.assessmentPlatformInput?.value || '',
            language: elements.assessmentLanguageInput?.value || '',
            type: elements.assessmentTypeInput?.value || 'algo'
        };
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
        translationLanguage: elements.translationLanguageInput?.value || 'none',

        // Context
        interviewContext: interviewContext,

        // Backward compatibility
        additionalInfo: JSON.stringify(interviewContext),
        // Backward compatibility
        additionalInfo: JSON.stringify(interviewContext),
        keywords: currentKeywords,

        createdAt: editingId ? savedMeetings.find(m => m.id === editingId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Generate title and subtitle based on scenario
    meeting.title = getScenarioTitle(scenario);

    if (scenario === 'job-interview' && interviewContext.companyName) {
        meeting.title = `Interview with ${interviewContext.companyName}`;
    } else if (scenario === 'hr-interview' && interviewContext.companyName) {
        meeting.title = `HR Interview at ${interviewContext.companyName}`;
    } else if (scenario === 'team-meeting' && interviewContext.teamName) {
        meeting.title = `Team Meeting: ${interviewContext.teamName}`;
    } else if (scenario === 'client-meeting' && interviewContext.clientName) {
        meeting.title = `Meeting with ${interviewContext.clientName}`;
    } else if (scenario === 'consulting' && interviewContext.clientName) {
        meeting.title = `Consulting: ${interviewContext.clientName}`;
    } else if (scenario === 'casual-conversation' && interviewContext.topic) {
        meeting.title = `Casual: ${interviewContext.topic}`;
    } else if (scenario === 'online-assessment' && interviewContext.platform) {
        meeting.title = `Assessment: ${interviewContext.platform}`;
    }

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

    // Clear draft
    chrome.storage.local.remove('meetingDraft');

    // Render all cards
    renderMeetingCards();
    setState(STATE.CARDS_LIST);
}

function handleBack(e) {
    e.preventDefault();

    // Clear editing mode if active
    // Clear editing mode if active
    if (elements.saveBtn.dataset.editingId) {
        delete elements.saveBtn.dataset.editingId;
    }

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

// Duplicate handlers removed - see below

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
    card.className = 'meeting-card' + (meeting.paused ? ' paused' : '');
    card.dataset.id = meeting.id;

    // Determine button based on paused state
    const isPaused = meeting.paused || meeting.status === 'paused';
    const buttonClass = isPaused ? 'btn-resume card-resume-btn' : 'btn-start card-start-btn';
    const buttonText = isPaused ? 'Resume' : 'Start';
    const buttonIcon = isPaused ? '▶' : 'X';

    // Format elapsed time if paused
    let pausedInfo = '';
    if (isPaused && meeting.elapsedTime) {
        const mins = Math.floor(meeting.elapsedTime / 60000);
        const secs = Math.floor((meeting.elapsedTime % 60000) / 1000);
        pausedInfo = `<span class="paused-time">Paused at ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</span>`;
    }

    card.innerHTML = `
        <div class="card-header">
            <div class="card-title">
                ${meeting.title}
                ${isPaused ? '<span class="paused-badge">PAUSED</span>' : ''}
            </div>
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
                ${pausedInfo}
            </div>
        </div>
        <button class="${buttonClass}" data-id="${meeting.id}">
            <span class="start-icon">${buttonIcon}</span>
            <span>${buttonText}</span>
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

// Resume a paused meeting by ID
function resumeMeetingById(meetingId) {
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

    // Resume session timer from where it was paused
    sessionActive = true;
    // Adjust start time to account for elapsed time before pause
    const elapsedTime = meeting.elapsedTime || 0;
    sessionStartTime = Date.now() - elapsedTime;
    startTimer();

    // Update phase to "In the Meeting"
    setActivePhase('during');

    // Transition to In Meeting state
    setState(STATE.IN_MEETING);

    // Send message to background script to resume the meeting
    chrome.runtime.sendMessage({
        type: 'RESUME_MEETING',
        sessionId: meeting.sessionId, // The DB session ID
        meetingId: meetingId,
        meeting: meeting
    }, (response) => {
        if (response && response.success) {
            console.log('Meeting resumed successfully');
            console.log('Session ID:', response.sessionId);
            console.log('Elapsed Time:', response.elapsedTime);

            // Update meeting to remove paused state
            const index = savedMeetings.findIndex(m => m.id === meetingId);
            if (index !== -1) {
                savedMeetings[index].paused = false;
                savedMeetings[index].status = 'active';
                delete savedMeetings[index].elapsedTime;
                saveMeetingsData();
            }

            // Store session info
            if (response.sessionId) {
                chrome.storage.local.set({
                    activeSessionId: response.sessionId,
                    consoleToken: response.consoleToken
                });
            }
        } else {
            console.error('Failed to resume meeting:', response?.error);
            showAlert('Failed to resume meeting: ' + (response?.error || 'Unknown error'), 'error');
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
    elements.scenarioInput.value = meeting.scenario || 'job-interview';
    updateScenarioFields();

    const ctx = meeting.interviewContext || {};

    // Dynamic fields
    // Job
    if (elements.roleInput) elements.roleInput.value = ctx.role || '';
    if (elements.companyInput) elements.companyInput.value = ctx.companyName || '';
    if (elements.experienceInput) elements.experienceInput.value = ctx.experienceLevel || 'senior';
    if (elements.interviewTypeInput) elements.interviewTypeInput.value = ctx.interviewType || 'technical';
    if (elements.techStackInput) elements.techStackInput.value = ctx.techStack || '';
    if (elements.jdInput) elements.jdInput.value = ctx.jobDescription || '';

    // HR
    if (elements.hrRoleInput) elements.hrRoleInput.value = ctx.role || '';
    if (elements.hrCompanyInput) elements.hrCompanyInput.value = ctx.companyName || '';
    if (elements.hrRecruiterInput) elements.hrRecruiterInput.value = ctx.recruiterName || '';
    if (elements.hrCultureInput) elements.hrCultureInput.value = ctx.cultureValues || '';

    // Team
    if (elements.teamProjectInput) elements.teamProjectInput.value = ctx.teamName || '';
    if (elements.teamRoleInput) elements.teamRoleInput.value = ctx.role || '';
    if (elements.teamUpdateInput) elements.teamUpdateInput.value = ctx.updates || '';

    // Client
    if (elements.clientNameInput) elements.clientNameInput.value = ctx.clientName || '';
    if (elements.clientContextInput) elements.clientContextInput.value = ctx.goal || '';

    // Consulting
    if (elements.consultingClientInput) elements.consultingClientInput.value = ctx.clientName || '';
    if (elements.consultingTopicInput) elements.consultingTopicInput.value = ctx.topic || '';
    if (elements.consultingProblemInput) elements.consultingProblemInput.value = ctx.problemStatement || '';

    // Casual
    if (elements.casualTopicInput) elements.casualTopicInput.value = ctx.topic || '';
    if (elements.casualParticipantsInput) elements.casualParticipantsInput.value = ctx.participants || '';

    // Assessment
    if (elements.assessmentPlatformInput) elements.assessmentPlatformInput.value = ctx.platform || '';
    if (elements.assessmentLanguageInput) elements.assessmentLanguageInput.value = ctx.language || '';
    if (elements.assessmentTypeInput) elements.assessmentTypeInput.value = ctx.type || 'algo';


    elements.meetingUrlInput.value = meeting.meetingUrl || '';
    elements.isDesktopCall.checked = meeting.isDesktopCall || false;
    elements.meetingLanguageInput.value = meeting.meetingLanguage || 'english';

    elements.translationLanguageInput.value = meeting.translationLanguage || 'none';

    // Keywords
    currentKeywords = meeting.keywords || [];
    renderKeywords();

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

async function handleDelete(e) {
    e.preventDefault();

    const confirmed = await showConfirm('Are you sure you want to delete this meeting?');
    if (!confirmed) {
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

async function handleLogout(e) {
    console.log('Logout button clicked');
    e.preventDefault();

    // Check if session is active
    if (sessionActive) {
        const confirmed = await showConfirm('You have an active meeting session. Logging out will disconnect you. Continue?');
        if (!confirmed) {
            return;
        }
        // Stop session
        sessionActive = false;
        stopTimer();
    }

    // Clear all user data
    chrome.storage.local.clear(() => {
        // Send message to background to clear session
        chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
            // Clear local state
            savedMeetings = [];
            activeMeetingId = null;

            console.log('Logged out successfully');
            
            // Reload the popup to show logged-out state
            window.location.reload();
        });
    });
}

function handleDashboard(e) {
    e.preventDefault();

    // Open dashboard in new tab
    chrome.tabs.create({ url: `${getDashboardUrl()}/dashboard` });
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

    const confirmed = await showConfirm('Disconnect from this meeting?');
    if (!confirmed) {
        return;
    }

    // Store meeting ID and calculate elapsed time before disconnect
    const meetingId = activeMeetingId;
    const elapsedTime = sessionStartTime ? Date.now() - sessionStartTime : 0;

    // Send message to background to pause (not cancel) the meeting
    chrome.runtime.sendMessage({
        type: 'DISCONNECT_MEETING',
        sessionId: activeMeetingId
    }, (response) => {
        console.log('Meeting paused:', response);

        // Mark the meeting as paused in savedMeetings
        if (meetingId && response?.success) {
            const index = savedMeetings.findIndex(m => m.id === meetingId);
            if (index !== -1) {
                savedMeetings[index].paused = true;
                savedMeetings[index].status = 'paused';
                savedMeetings[index].elapsedTime = response.elapsedTime || elapsedTime;
                savedMeetings[index].sessionId = response.sessionId; // Store DB session ID for resume
                saveMeetingsData();
                console.log('Meeting marked as paused:', meetingId);
            }
        }

        endMeetingSession(); // Updates UI to show card list
    });
}

// Duplicate handleLogout removed

function handleDashboard(e) {
    if (e) e.preventDefault();
    // Redirect to console page
    chrome.tabs.create({ url: 'http://localhost:5173/dashboard/console' });
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
        elements.authSubtitle.textContent = 'Join to get your AI Xtroone';
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

                // Send message to show overlay (in case user closed it)
                chrome.runtime.sendMessage({
                    type: 'SHOW_OVERLAY_ON_TAB',
                    tabId: response.tabId
                });

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

            // Request fresh credits in background
            chrome.runtime.sendMessage({ type: 'GET_CREDITS' }, (response) => {
                if (response && response.success !== undefined) {
                    // Note: response.credits might be 0, which is falsy, check undefined
                    const amount = response.credits || 0;
                    elements.creditsAmount.textContent = `$${amount.toFixed(2)}`;
                }
            });
        }

        if (result.credits !== undefined) {
            elements.creditsAmount.textContent = `$${result.credits.toFixed(2)}`;
        }
    });
}

// ===== HELPER FUNCTIONS =====
function validateField(input, message) {
    if (!input) return;
    clearError(input);
    input.classList.add('input-error');

    // Create error message
    const msg = document.createElement('div');
    msg.className = 'error-message';
    msg.textContent = message;

    // Insert after input
    input.parentNode.appendChild(msg);

    // Add listener to clear on input
    input.addEventListener('input', () => clearError(input), { once: true });
}

function clearError(input) {
    if (!input) return;
    input.classList.remove('input-error');
    const parent = input.parentNode;
    if (parent) {
        const msg = parent.querySelector('.error-message');
        if (msg) msg.remove();
    }
}

function clearAllErrors() {
    const inputs = document.querySelectorAll('.input-error');
    inputs.forEach(clearError);
}

function saveDraft() {
    // Only save if we are in form view and NOT editing (or editing is fine?)
    // User asked for "filled and closed without saving" - usually implies new.
    // If editingId is present, we might NOT want to overwrite "draft" or maybe we do?
    // Let's safe draft regardless.

    // Gather all values
    const draft = {};
    if (elements.scenarioInput) draft.scenario = elements.scenarioInput.value;
    if (elements.meetingUrlInput) draft.meetingUrl = elements.meetingUrlInput.value;
    if (elements.isDesktopCall) draft.isDesktopCall = elements.isDesktopCall.checked;
    if (elements.meetingLanguageInput) draft.meetingLanguage = elements.meetingLanguageInput.value;
    if (elements.translationLanguageInput) draft.translationLanguage = elements.translationLanguageInput.value;

    // Dynamic
    if (elements.roleInput) draft.role = elements.roleInput.value;
    if (elements.companyInput) draft.company = elements.companyInput.value;
    if (elements.experienceInput) draft.experience = elements.experienceInput.value;
    if (elements.interviewTypeInput) draft.interviewType = elements.interviewTypeInput.value;
    if (elements.techStackInput) draft.techStack = elements.techStackInput.value;
    if (elements.jdInput) draft.jd = elements.jdInput.value;

    if (elements.hrRoleInput) draft.hrRole = elements.hrRoleInput.value;
    if (elements.hrCompanyInput) draft.hrCompany = elements.hrCompanyInput.value;
    if (elements.hrRecruiterInput) draft.hrRecruiter = elements.hrRecruiterInput.value;
    if (elements.hrCultureInput) draft.hrCulture = elements.hrCultureInput.value;

    if (elements.teamProjectInput) draft.teamProject = elements.teamProjectInput.value;
    if (elements.teamRoleInput) draft.teamRole = elements.teamRoleInput.value;
    if (elements.teamUpdateInput) draft.teamUpdate = elements.teamUpdateInput.value;

    if (elements.clientNameInput) draft.clientName = elements.clientNameInput.value;
    if (elements.clientContextInput) draft.clientContext = elements.clientContextInput.value;

    if (elements.consultingClientInput) draft.consultingClient = elements.consultingClientInput.value;
    if (elements.consultingTopicInput) draft.consultingTopic = elements.consultingTopicInput.value;
    if (elements.consultingProblemInput) draft.consultingProblem = elements.consultingProblemInput.value;

    if (elements.casualTopicInput) draft.casualTopic = elements.casualTopicInput.value;
    if (elements.casualParticipantsInput) draft.casualParticipants = elements.casualParticipantsInput.value;

    if (elements.assessmentPlatformInput) draft.assessmentPlatform = elements.assessmentPlatformInput.value;
    if (elements.assessmentLanguageInput) draft.assessmentLanguage = elements.assessmentLanguageInput.value;
    if (elements.assessmentTypeInput) draft.assessmentType = elements.assessmentTypeInput.value;

    // Keywords
    draft.keywords = currentKeywords;

    chrome.storage.local.set({ meetingDraft: draft });
}

function restoreDraft(draft) {
    if (!draft) return;

    if (draft.scenario && elements.scenarioInput) {
        elements.scenarioInput.value = draft.scenario;
        updateScenarioFields();
    }

    if (draft.meetingUrl && elements.meetingUrlInput) elements.meetingUrlInput.value = draft.meetingUrl;
    if (draft.isDesktopCall !== undefined && elements.isDesktopCall) elements.isDesktopCall.checked = draft.isDesktopCall;
    if (draft.meetingLanguage && elements.meetingLanguageInput) elements.meetingLanguageInput.value = draft.meetingLanguage;
    if (draft.translationLanguage && elements.translationLanguageInput) elements.translationLanguageInput.value = draft.translationLanguage;

    if (draft.role && elements.roleInput) elements.roleInput.value = draft.role;
    if (draft.company && elements.companyInput) elements.companyInput.value = draft.company;
    if (draft.experience && elements.experienceInput) elements.experienceInput.value = draft.experience;
    if (draft.interviewType && elements.interviewTypeInput) elements.interviewTypeInput.value = draft.interviewType;
    if (draft.techStack && elements.techStackInput) elements.techStackInput.value = draft.techStack;
    if (draft.jd && elements.jdInput) elements.jdInput.value = draft.jd;

    if (draft.hrRole && elements.hrRoleInput) elements.hrRoleInput.value = draft.hrRole;
    if (draft.hrCompany && elements.hrCompanyInput) elements.hrCompanyInput.value = draft.hrCompany;
    if (draft.hrRecruiter && elements.hrRecruiterInput) elements.hrRecruiterInput.value = draft.hrRecruiter;
    if (draft.hrCulture && elements.hrCultureInput) elements.hrCultureInput.value = draft.hrCulture;

    if (draft.teamProject && elements.teamProjectInput) elements.teamProjectInput.value = draft.teamProject;
    if (draft.teamRole && elements.teamRoleInput) elements.teamRoleInput.value = draft.teamRole;
    if (draft.teamUpdate && elements.teamUpdateInput) elements.teamUpdateInput.value = draft.teamUpdate;

    if (draft.clientName && elements.clientNameInput) elements.clientNameInput.value = draft.clientName;
    if (draft.clientContext && elements.clientContextInput) elements.clientContextInput.value = draft.clientContext;

    if (draft.consultingClient && elements.consultingClientInput) elements.consultingClientInput.value = draft.consultingClient;
    if (draft.consultingTopic && elements.consultingTopicInput) elements.consultingTopicInput.value = draft.consultingTopic;
    if (draft.consultingProblem && elements.consultingProblemInput) elements.consultingProblemInput.value = draft.consultingProblem;

    if (draft.casualTopic && elements.casualTopicInput) elements.casualTopicInput.value = draft.casualTopic;
    if (draft.casualParticipants && elements.casualParticipantsInput) elements.casualParticipantsInput.value = draft.casualParticipants;

    if (draft.assessmentPlatform && elements.assessmentPlatformInput) elements.assessmentPlatformInput.value = draft.assessmentPlatform;
    if (draft.assessmentLanguage && elements.assessmentLanguageInput) elements.assessmentLanguageInput.value = draft.assessmentLanguage;
    if (draft.assessmentType && elements.assessmentTypeInput) elements.assessmentTypeInput.value = draft.assessmentType;

    // Keywords
    if (draft.keywords) {
        currentKeywords = draft.keywords;
        renderKeywords();
    }
}

function clearForm() {
    chrome.storage.local.remove('meetingDraft');

    elements.scenarioInput.value = 'job-interview';
    updateScenarioFields();

    elements.meetingUrlInput.value = '';
    elements.isDesktopCall.checked = false;
    elements.meetingLanguageInput.value = 'english';
    elements.translationLanguageInput.value = 'none';

    // Job
    if (elements.roleInput) elements.roleInput.value = '';
    if (elements.companyInput) elements.companyInput.value = '';
    if (elements.experienceInput) elements.experienceInput.value = 'senior';
    if (elements.interviewTypeInput) elements.interviewTypeInput.value = 'technical';
    if (elements.techStackInput) elements.techStackInput.value = '';
    if (elements.jdInput) elements.jdInput.value = '';

    // HR
    if (elements.hrRoleInput) elements.hrRoleInput.value = '';
    if (elements.hrCompanyInput) elements.hrCompanyInput.value = '';
    if (elements.hrRecruiterInput) elements.hrRecruiterInput.value = '';
    if (elements.hrCultureInput) elements.hrCultureInput.value = '';

    // Team
    if (elements.teamProjectInput) elements.teamProjectInput.value = '';
    if (elements.teamRoleInput) elements.teamRoleInput.value = '';
    if (elements.teamUpdateInput) elements.teamUpdateInput.value = '';

    // Client
    if (elements.clientNameInput) elements.clientNameInput.value = '';
    if (elements.clientContextInput) elements.clientContextInput.value = '';

    // Consulting
    if (elements.consultingClientInput) elements.consultingClientInput.value = '';
    if (elements.consultingTopicInput) elements.consultingTopicInput.value = '';
    if (elements.consultingProblemInput) elements.consultingProblemInput.value = '';

    // Casual
    if (elements.casualTopicInput) elements.casualTopicInput.value = '';
    if (elements.casualParticipantsInput) elements.casualParticipantsInput.value = '';

    // Assessment
    if (elements.assessmentPlatformInput) elements.assessmentPlatformInput.value = '';
    if (elements.assessmentLanguageInput) elements.assessmentLanguageInput.value = '';
    if (elements.assessmentTypeInput) elements.assessmentTypeInput.value = 'algo';

    // Keywords
    currentKeywords = [];
    renderKeywords();
    if (elements.keywordsInput) elements.keywordsInput.value = '';
}

// ===== KEYWORD FUNCTIONS =====
function handleKeywordInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission

        const value = e.target.value.trim();
        if (value && !currentKeywords.includes(value)) {
            currentKeywords.push(value);
            renderKeywords();
            e.target.value = '';
            
            // Save draft
            saveDraft();
        } else if (currentKeywords.includes(value)) {
            // Optional: highlight existing tag or show feedback
            e.target.value = '';
        }
    }
}

function handleKeywordDelete(e) {
    if (e.target.closest('.remove-tag-btn')) {
        const tag = e.target.closest('.keyword-tag');
        if (tag) {
            const keyword = tag.dataset.keyword;
            currentKeywords = currentKeywords.filter(k => k !== keyword);
            renderKeywords();
            
            // Save draft
            saveDraft();
        }
    }
}

function renderKeywords() {
    if (!elements.keywordsTags) return;

    elements.keywordsTags.innerHTML = '';
    
    currentKeywords.forEach(keyword => {
        const tag = document.createElement('div');
        tag.className = 'keyword-tag';
        tag.dataset.keyword = keyword;
        tag.innerHTML = `
            <span>${keyword}</span>
            <button class="remove-tag-btn">×</button>
        `;
        elements.keywordsTags.appendChild(tag);
    });
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
        'hr-interview': 'HR Interview',
        'team-meeting': 'Team Meeting',
        'client-meeting': 'Client Meeting',
        'consulting': 'Consulting',
        'casual-conversation': 'Casual Conversation',
        'online-assessment': 'Online Assessment'
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
