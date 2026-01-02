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
          <button class="ic-btn ic-btn-icon" id="ic-minimize" title="Minimize">−</button>
          <button class="ic-btn ic-btn-icon" id="ic-hide" title="Hide (Ctrl+Shift+O)">×</button>
        </div>
      </div>
      
      <div class="ic-body">
        <!-- Sidebar with Action Buttons (Left Side) -->
        <div class="ic-sidebar">
          <button class="ic-sidebar-btn" id="ic-help-btn" title="Help Me">
            <span class="ic-sidebar-icon">💡</span>
            <span class="ic-sidebar-label">Help</span>
          </button>
          <button class="ic-sidebar-btn" id="ic-code-btn" title="Generate Code">
            <span class="ic-sidebar-icon">💻</span>
            <span class="ic-sidebar-label">Code</span>
          </button>
          <button class="ic-sidebar-btn" id="ic-explain-btn" title="Explain">
            <span class="ic-sidebar-icon">📖</span>
            <span class="ic-sidebar-label">Explain</span>
          </button>
          <button class="ic-sidebar-btn" id="ic-screenshot-btn" title="Screenshot">
            <span class="ic-sidebar-icon">📸</span>
            <span class="ic-sidebar-label">Snap</span>
          </button>
        </div>

        <!-- Main Content Area -->
        <div class="ic-main">
          <!-- Tab Navigation -->
          <div class="ic-tabs">
            <button class="ic-tab ic-tab-active" id="ic-tab-transcript" data-tab="transcript">
              📝 Transcript
            </button>
            <button class="ic-tab" id="ic-tab-ai" data-tab="ai">
              🤖 AI Hints
            </button>
          </div>
          
          <div class="ic-content" id="ic-content">
            <!-- Transcript Panel -->
            <div class="ic-panel ic-panel-active" id="ic-panel-transcript">
              <div class="ic-transcript" id="ic-transcript">
                <div class="ic-placeholder">🎤 Listening for audio...</div>
              </div>
            </div>

            <!-- AI Hints Panel -->
            <div class="ic-panel" id="ic-panel-ai" style="display: none;">
              <div class="ic-hints" id="ic-hints">
                <div class="ic-placeholder">Click a button to get AI assistance</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ic-footer">
        <div class="ic-prompt-box">
          <input type="text" id="ic-quick-prompt" placeholder="Ask AI anything..." class="ic-prompt-input">
          <button id="ic-send-prompt" class="ic-prompt-btn" title="Send">➤</button>
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
            requestAI('hint');
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

    function showOverlay() {
        if (!overlay) createOverlay();
        overlay.style.display = 'flex';
        isHidden = false;
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
        console.log('[Content] updateTranscript called with:', data);

        if (!transcriptContainer) {
            console.error('[Content] transcriptContainer is null!');
            // Try to get it again
            transcriptContainer = document.getElementById('ic-transcript');
            if (!transcriptContainer) {
                console.error('[Content] Could not find ic-transcript element');
                return;
            }
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

        if (displayHTML) {
            transcriptContainer.innerHTML = displayHTML;
            console.log('[Content] Transcript updated:', displayHTML.substring(0, 100));
        } else {
            console.log('[Content] No text to display - data had no finalizedText or interimText');
        }

        // Auto-scroll
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    }

    // Add hint
    function addHint(hint) {
        if (!hintContainer) return;

        // Remove placeholder and loading
        const placeholder = hintContainer.querySelector('.ic-placeholder');
        if (placeholder) placeholder.remove();

        const loading = hintContainer.querySelector('.ic-loading');
        if (loading) loading.remove();

        const icon = hint.type === 'code' ? '💻' : hint.type === 'explain' ? '📖' : '💡';

        const hintEl = document.createElement('div');
        hintEl.className = 'ic-hint';
        hintEl.innerHTML = `
      <span class="ic-hint-icon">${icon}</span>
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
                showOverlay();
                sendResponse({ success: true });
                break;

            case 'SESSION_STOPPED':
                // Keep overlay visible but update status
                if (overlay) {
                    const statusDot = overlay.querySelector('.ic-status-dot');
                    if (statusDot) statusDot.style.background = '#94a3b8';
                    const liveBadge = overlay.querySelector('.ic-live-badge');
                    if (liveBadge) liveBadge.textContent = '● ENDED';
                }
                break;

            case 'TRANSCRIPTION_STATE':
                updateTranscript(message.data);
                sendResponse({ success: true });
                break;

            case 'HINT_RECEIVED':
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

    console.log('[Content] Content script ready');
})();
