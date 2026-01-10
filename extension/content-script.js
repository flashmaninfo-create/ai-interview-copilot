// Interview Copilot - Content Script
// Overlay that matches console dashboard design

(function () {
    // Prevent multiple initializations
    if (window.__interviewCopilotLoaded) {
        console.log('[Content] Already loaded, skipping');
        return;
    }
    window.__interviewCopilotLoaded = true;

    console.log('[Content] Interview Copilot content script loaded');

    let overlay = null;
    let isMinimized = false;
    let isHidden = false;
    let transcriptContainer = null;
    let hintContainer = null;
    let sessionId = null;
    let consoleToken = null;
    let sessionActive = false; // Track if session is active - prevents overlay showing without session

    // Create the overlay matching console dashboard
    function createOverlay() {
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.id = 'interview-copilot-overlay';
        overlay.className = 'ic-overlay';

        overlay.innerHTML = `
      <div class="ic-header">
        <div class="ic-title">
          <span class="ic-status-dot"></span>
          Interview Copilot
        </div>
        <div class="ic-controls">
          <button class="ic-btn ic-btn-icon" id="ic-minimize" title="Minimize">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button class="ic-btn ic-btn-icon" id="ic-hide" title="Hide (Ctrl+Shift+O)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      
      <div class="ic-body">
        <!-- Sidebar with Action Buttons (Left Side) -->
        <div class="ic-sidebar">
          <button class="ic-sidebar-btn" id="ic-help-btn" title="Help Me">
            <span class="ic-sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            </span>
            <span class="ic-sidebar-label">Help</span>
          </button>
          <button class="ic-sidebar-btn ic-btn-answer" id="ic-answer-btn" title="Full Answer">
            <span class="ic-sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6V2H8"/><path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z"/><path d="M2 12h2"/><path d="M9 11v2"/><path d="M15 11v2"/><path d="M20 12h2"/></svg>
            </span>
            <span class="ic-sidebar-label">Answer</span>
          </button>
          <button class="ic-sidebar-btn" id="ic-code-btn" title="Generate Code">
            <span class="ic-sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            </span>
            <span class="ic-sidebar-label">Code</span>
          </button>
          <button class="ic-sidebar-btn" id="ic-explain-btn" title="Explain">
            <span class="ic-sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </span>
            <span class="ic-sidebar-label">Explain</span>
          </button>
          <button class="ic-sidebar-btn" id="ic-screenshot-btn" title="Screenshot">
            <span class="ic-sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </span>
            <span class="ic-sidebar-label">Snap</span>
          </button>
        </div>

        <!-- Main Content Area -->
        <div class="ic-main">
          <!-- Tab Navigation -->
          <div class="ic-tabs">
            <button class="ic-tab ic-tab-active" id="ic-tab-transcript" data-tab="transcript">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              Transcript
            </button>
            <button class="ic-tab" id="ic-tab-ai" data-tab="ai">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              AI Hints
            </button>
          </div>
          
          <div class="ic-content" id="ic-content">
            <!-- Transcript Panel -->
            <div class="ic-panel ic-panel-active" id="ic-panel-transcript">
              <div class="ic-transcript" id="ic-transcript">
                <div class="ic-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  Listening for audio...
                </div>
              </div>
            </div>

            <!-- AI Hints Panel -->
            <div class="ic-panel" id="ic-panel-ai" style="display: none;">
              <div class="ic-hints" id="ic-hints">
                <div class="ic-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                  Click a button to get AI assistance
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ic-footer">
        <div class="ic-prompt-box">
          <input type="text" id="ic-quick-prompt" placeholder="Ask AI anything..." class="ic-prompt-input">
          <button id="ic-send-prompt" class="ic-prompt-btn" title="Send">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <a href="#" id="ic-open-console" class="ic-console-link">
          Open Full Console →
        </a>
      </div>
    `;

        document.body.appendChild(overlay);

        // Prevent host page from capturing overlay events (bubbling phase)
        // Using bubbling phase so child button clicks work first
        overlay.addEventListener('click', (e) => e.stopPropagation());
        overlay.addEventListener('mousedown', (e) => e.stopPropagation());
        overlay.addEventListener('mouseup', (e) => e.stopPropagation());
        overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
        overlay.addEventListener('pointerup', (e) => e.stopPropagation());

        // Get containers
        transcriptContainer = document.getElementById('ic-transcript');
        hintContainer = document.getElementById('ic-hints');

        // Event Listeners - Controls
        document.getElementById('ic-minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMinimize();
        });
        document.getElementById('ic-hide').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHide();
        });
        document.getElementById('ic-open-console').addEventListener('click', openConsole);

        // Event Listeners - Action Buttons
        document.getElementById('ic-help-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            requestAI('help');
        });
        document.getElementById('ic-answer-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            requestAI('answer');
        });
        document.getElementById('ic-code-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            requestAI('code');
        });
        document.getElementById('ic-explain-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            requestAI('explain');
        });
        document.getElementById('ic-screenshot-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            takeScreenshot();
        });

        // Event Listeners - Tab switching
        document.getElementById('ic-tab-transcript').addEventListener('click', (e) => {
            e.stopPropagation();
            switchTab('transcript');
        });
        document.getElementById('ic-tab-ai').addEventListener('click', (e) => {
            e.stopPropagation();
            switchTab('ai');
        });

        // Event Listeners - Quick Prompt
        const promptInput = document.getElementById('ic-quick-prompt');
        const sendPromptBtn = document.getElementById('ic-send-prompt');

        const sendQuickPrompt = () => {
            const prompt = promptInput.value.trim();
            if (prompt) {
                requestAI('custom', prompt);
                promptInput.value = '';
                switchTab('ai'); // Switch to AI hints tab to see response
            }
        };

        promptInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                sendQuickPrompt();
            }
        });

        promptInput.addEventListener('click', (e) => e.stopPropagation());
        promptInput.addEventListener('focus', (e) => e.stopPropagation());

        sendPromptBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sendQuickPrompt();
        });

        // Make draggable
        makeDraggable(overlay);

        console.log('[Content] Overlay created');
    }

    // Tab switching function
    function switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.ic-tab').forEach(tab => {
            tab.classList.remove('ic-tab-active');
        });
        document.getElementById(`ic-tab-${tabName}`).classList.add('ic-tab-active');

        // Update panels
        document.querySelectorAll('.ic-panel').forEach(panel => {
            panel.style.display = 'none';
            panel.classList.remove('ic-panel-active');
        });
        const activePanel = document.getElementById(`ic-panel-${tabName}`);
        activePanel.style.display = 'block';
        activePanel.classList.add('ic-panel-active');
    }

    function toggleMinimize() {
        isMinimized = !isMinimized;
        const body = overlay.querySelector('.ic-body');
        const footer = overlay.querySelector('.ic-footer');

        if (isMinimized) {
            if (body) body.style.display = 'none';
            footer.style.display = 'none';
            overlay.classList.add('ic-minimized');
        } else {
            if (body) body.style.display = 'flex';
            footer.style.display = 'flex';
            overlay.classList.remove('ic-minimized');
        }
    }

    function toggleHide() {
        isHidden = !isHidden;
        overlay.style.display = isHidden ? 'none' : 'flex';
    }

    // Check if overlay DOM is still valid (attached to document)
    function ensureOverlayValid() {
        if (!overlay || !document.contains(overlay)) {
            console.log('[Content] Overlay detached or invalid, recreating...');
            overlay = null;
            transcriptContainer = null;
            hintContainer = null;
            createOverlay();
            return true; // Was recreated
        }
        return false; // Still valid
    }

    function showOverlay() {
        // Ensure overlay is valid before showing
        ensureOverlayValid();

        if (!overlay) createOverlay();
        overlay.style.display = 'flex';
        isHidden = false;

        // Set status dot to green (active)
        const statusDot = overlay.querySelector('.ic-status-dot');
        if (statusDot) statusDot.style.background = '#22c55e'; // Green for active
    }

    function hideOverlay() {
        if (overlay) {
            overlay.style.display = 'none';
            isHidden = true;
        }
    }

    async function requestAI(type, customPrompt = null) {
        // Show loading
        const btn = document.getElementById(`ic-${type === 'hint' ? 'help' : type}-btn`);
        if (btn) {
            btn.disabled = true;
            btn.classList.add('loading');
        }

        // Add loading indicator to hints
        const loadingHint = document.createElement('div');
        loadingHint.className = 'ic-hint ic-loading';
        loadingHint.innerHTML = `<span class="ic-hint-icon">⏳</span><div class="ic-hint-content">Thinking...</div>`;

        const placeholder = hintContainer.querySelector('.ic-placeholder');
        if (placeholder) placeholder.remove();

        hintContainer.insertBefore(loadingHint, hintContainer.firstChild);

        try {
            await chrome.runtime.sendMessage({
                type: 'REQUEST_HINT',
                data: {
                    trigger: 'overlay',
                    requestType: type,
                    customPrompt: customPrompt
                }
            });
        } catch (error) {
            console.error('Error requesting AI:', error);
            loadingHint.innerHTML = `<span class="ic-hint-icon">❌</span><div class="ic-hint-content">Error: ${error.message}</div>`;
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('loading');
            }
            // Remove loading hint after response comes in
            setTimeout(() => {
                if (loadingHint.classList.contains('ic-loading')) {
                    loadingHint.remove();
                }
            }, 5000);
        }
    }

    async function takeScreenshot() {
        const btn = document.getElementById('ic-screenshot-btn');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('loading');
        }

        try {
            await chrome.runtime.sendMessage({
                type: 'TAKE_SCREENSHOT',
                data: { trigger: 'overlay' }
            });
        } catch (error) {
            console.error('Error taking screenshot:', error);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('loading');
            }
        }
    }

    function openConsole(e) {
        e.preventDefault();
        const url = `http://localhost:5173/dashboard/console`;
        window.open(url, '_blank');
    }

    function makeDraggable(element) {
        const header = element.querySelector('.ic-header');
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            element.style.transition = 'none';
            element.style.cursor = 'grabbing';
        });

        // Use capture phase to ensure we get the events
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }, true);

        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                e.stopPropagation();
                isDragging = false;
                element.style.transition = '';
                element.style.cursor = '';
            }
        }, true);
    }

    // Update transcript
    function updateTranscript(data) {
        console.log('[Content] updateTranscript called with:', JSON.stringify(data));

        // Ensure overlay exists
        if (!overlay) {
            console.log('[Content] Overlay not created yet, creating now...');
            createOverlay();
        }

        // Get transcript container (may need to re-fetch after overlay creation)
        if (!transcriptContainer) {
            transcriptContainer = document.getElementById('ic-transcript');
        }

        if (!transcriptContainer) {
            console.error('[Content] Could not find ic-transcript element after creation');
            return;
        }

        // Remove placeholder
        const placeholder = transcriptContainer.querySelector('.ic-placeholder');
        if (placeholder) placeholder.remove();

        // Build display text
        let displayHTML = '';

        if (data.finalizedText) {
            displayHTML += `<span class="ic-final">${escapeHtml(data.finalizedText)}</span>`;
        }

        if (data.interimText) {
            displayHTML += `<span class="ic-interim"> ${escapeHtml(data.interimText)}</span>`;
        }

        // If we have displayText but not the individual components, use it
        if (!displayHTML && data.displayText) {
            displayHTML = `<span class="ic-final">${escapeHtml(data.displayText)}</span>`;
        }

        if (displayHTML) {
            transcriptContainer.innerHTML = displayHTML;
            console.log('[Content] Transcript updated:', displayHTML.substring(0, 100));
        } else {
            console.log('[Content] No text to display - data:', data);
        }

        // Auto-scroll
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    }

    // Track last hint to prevent duplicates
    let lastHintTimestamp = 0;
    let lastHintText = '';

    // Add hint
    function addHint(hint) {
        if (!hintContainer) {
            hintContainer = document.getElementById('ic-hints');
        }
        if (!hintContainer) return;

        // Deduplicate: prevent same hint from being added multiple times
        const hintText = hint.hint || hint.text || '';
        const now = Date.now();

        // Skip if same hint text within 3 seconds
        if (hintText === lastHintText && (now - lastHintTimestamp) < 3000) {
            console.log('[Content] Skipping duplicate hint');
            return;
        }

        lastHintTimestamp = now;
        lastHintText = hintText;

        // Auto-switch to hints tab
        switchTab('ai');

        // Remove placeholder and loading
        const placeholder = hintContainer.querySelector('.ic-placeholder');
        if (placeholder) placeholder.remove();

        const loading = hintContainer.querySelector('.ic-loading');
        if (loading) loading.remove();

        // Choose icon and class based on type
        let iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>';
        let iconClass = '';

        if (hint.type === 'code') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
            iconClass = 'ic-hint-code';
        } else if (hint.type === 'explain') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';
            iconClass = 'ic-hint-explain';
        } else if (hint.type === 'answer') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6V2H8"/><path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z"/></svg>';
            iconClass = 'ic-hint-answer';
        } else if (hint.type === 'error') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            iconClass = 'ic-hint-error';
        }

        const hintEl = document.createElement('div');
        hintEl.className = 'ic-hint';
        hintEl.innerHTML = `
      <span class="ic-hint-icon ${iconClass}">${iconSvg}</span>
      <div class="ic-hint-content">${formatHintContent(hint.hint || hint.text)}</div>
    `;

        hintContainer.insertBefore(hintEl, hintContainer.firstChild);
    }

    function formatHintContent(text) {
        // Check if it looks like code
        if (text.includes('function') || text.includes('const ') || text.includes('class ')) {
            return `<pre class="ic-code">${escapeHtml(text)}</pre>`;
        }
        return escapeHtml(text);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Message handler
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[Content] Message received:', message.type);

        switch (message.type) {
            case 'PING':
                sendResponse({ status: 'ready' });
                break;

            case 'SESSION_STARTED':
                sessionId = message.data?.sessionId;
                sessionActive = true;
                showOverlay();
                sendResponse({ success: true });
                break;

            case 'SESSION_STOPPED':
                sessionActive = false;
                // Hide overlay when session is finished
                hideOverlay();
                console.log('[Content] Session stopped, overlay hidden');
                sendResponse({ success: true });
                break;

            case 'SESSION_PAUSED':
                sessionActive = false;
                // Hide overlay when paused (user will resume later)
                hideOverlay();
                console.log('[Content] Session paused, overlay hidden');
                sendResponse({ success: true });
                break;

            case 'SESSION_RESUMED':
                sessionId = message.data?.sessionId;
                sessionActive = true;
                showOverlay();
                console.log('[Content] Session resumed with data:', message.data);

                // Restore transcript if provided
                if (message.data?.transcriptionText) {
                    updateTranscript({
                        finalizedText: message.data.transcriptionText,
                        interimText: '',
                        displayText: message.data.transcriptionText
                    });
                }
                sendResponse({ success: true });
                break;

            case 'TRANSCRIPTION_STATE':
                ensureOverlayValid(); // Make sure overlay is attached
                updateTranscript(message.data);
                sendResponse({ success: true });
                break;

            case 'HINT_RECEIVED':
                ensureOverlayValid(); // Make sure overlay is attached
                addHint(message.data);
                sendResponse({ success: true });
                break;

            case 'CONSOLE_TOKEN':
                consoleToken = message.data.token;
                sessionId = message.data.sessionId;
                sendResponse({ success: true });
                break;

            case 'TOGGLE_OVERLAY':
                if (overlay) toggleHide();
                else showOverlay();
                sendResponse({ success: true });
                break;

            case 'SHOW_OVERLAY':
                showOverlay();
                sendResponse({ success: true });
                break;
        }

        return true;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+O - Toggle overlay
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyO') {
            e.preventDefault();
            if (overlay) toggleHide();
        }
        // Ctrl+Shift+H - Request hint
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
            e.preventDefault();
            if (overlay && !isHidden) requestAI('hint');
        }
    });

    // FALLBACK: Listen for storage changes (in case direct messages fail)
    // GUARD: Only process if session is active to prevent overlay appearing without session
    chrome.storage.onChanged.addListener((changes, area) => {
        if (!sessionActive) return; // Skip if no active session

        if (area === 'local' && changes.overlayTranscripts) {
            const transcripts = changes.overlayTranscripts.newValue || [];
            if (transcripts.length > 0) {
                const latest = transcripts[transcripts.length - 1];
                console.log('[Content] Fallback: Got transcript from storage:', latest.text?.substring(0, 50));

                // Build finalized text from all transcripts
                const finalizedText = transcripts
                    .filter(t => t.isFinal)
                    .map(t => t.text)
                    .join(' ');

                updateTranscript({
                    finalizedText: finalizedText || latest.finalizedText || '',
                    interimText: latest.isFinal ? '' : latest.text,
                    displayText: finalizedText || latest.text || ''
                });
            }
        }
    });

    // Initial check removed - we no longer auto-show overlay from stored transcripts
    // Overlay only appears when SESSION_STARTED message is received
    // This prevents the overlay from appearing repeatedly on page load

    console.log('[Content] Content script ready');
})();

// ==========================================
// Dashboard Auth Sync Logic
// ==========================================
(function () {
    if (window.location.host.includes('localhost:5173') || window.location.host.includes('interview-copilot.com')) {
        console.log('[Content] Checking for auth token on dashboard domain: ' + window.location.host);

        function checkForAuthToken() {
            let authData = null;
            // Iterate localStorage to find Supabase token
            // Key format: sb-<project-ref>-auth-token
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    try {
                        authData = JSON.parse(localStorage.getItem(key));
                        break;
                    } catch (e) {
                        console.error('[Content] Failed to parse auth token', e);
                    }
                }
            }

            if (authData && authData.user && authData.access_token) {
                // Found it! Send to background
                chrome.runtime.sendMessage({
                    type: 'AUTH_SYNC',
                    user: authData.user,
                    session: authData,
                    token: authData.access_token
                });
            }
        }

        // Poll every 2 seconds to catch login/signup completion
        setInterval(checkForAuthToken, 2000);
        checkForAuthToken();
    }
})();
