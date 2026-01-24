// Xtroone - Content Script
// Overlay that matches console dashboard design

(function () {
    // Prevent multiple initializations
    if (window.__interviewCopilotLoaded) {
        console.log('[Content] Already loaded, skipping');
        return;
    }
    window.__interviewCopilotLoaded = true;

    console.log('[Content] Xtroone content script loaded');

    let overlay = null;
    let isMinimized = false;
    let isHidden = false;
    let transcriptContainer = null;
    let hintContainer = null;
    let sessionId = null;
    let consoleToken = null;
    let sessionActive = false; // Track if session is active - prevents overlay showing without session

    // Screenshot state - module level for accessibility by message handlers
    let screenshots = [];
    let selectedScreenshots = new Set();




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
          Xtroone
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

        </div>

        <!-- Main Content Area -->
        <div class="ic-main">
          <div class="ic-content" id="ic-content">
            <!-- AI Hints Section (Left) -->
            <div class="ic-section ic-section-hints">
              <div class="ic-hints-container" id="ic-hints">
                <div class="ic-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>
                  <div>Select a mode to start</div>
                </div>
              </div>
              
              <!-- Quick Prompt Box (Bottom of Left Column) -->
              <div class="ic-prompt-box">
                <input type="text" id="ic-quick-prompt" placeholder="Ask AI anything..." class="ic-prompt-input">
                <button id="ic-send-prompt" class="ic-prompt-btn" title="Send">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>

            <!-- Transcript Section (Right) -->
            <div class="ic-section ic-section-transcript">
              <div class="ic-transcript-container" id="ic-transcript">
                <div class="ic-placeholder-small">
                  Listening...
                </div>
              </div>
              
              <!-- Console Link (Bottom of Right Column) -->
              <a href="#" id="ic-open-console" class="ic-console-link">
                Open Full Console →
              </a>
            </div>
          </div>
        </div>
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

        // Prevent scroll from propagating to the meeting page
        overlay.addEventListener('wheel', (e) => {
            e.stopPropagation();
            // Find the scrollable container that the mouse is over
            let target = e.target;
            while (target && target !== overlay) {
                if (target.scrollHeight > target.clientHeight) {
                    // This element is scrollable
                    const atTop = target.scrollTop === 0;
                    const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;

                    // Allow scroll if not at boundaries, or if scrolling in valid direction
                    if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
                        return; // Let the scroll happen naturally
                    }
                }
                target = target.parentElement;
            }
            // Prevent default if at boundaries or no scrollable element found
            e.preventDefault();
        }, { passive: false });

        // Also prevent touch scroll propagation for mobile
        overlay.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });

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


        // ----------------------------------------------------
        /* Loading State */
        const style = document.createElement('style');
        style.textContent = `
      .ic-btn.loading {
        opacity: 0.7;
        cursor: wait;
        position: relative;
      }
      .ic-btn.loading svg {
        animation: ic-spin 1s linear infinite;
      }
      @keyframes ic-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
        `;
        document.head.appendChild(style);

        // Screenshot Gallery Popover Logic (hover popover on Snap button)
        // Register this tab as the meeting tab so background knows which window to capture
        if (window.location.hostname === 'meet.google.com' || window.location.hostname === 'teams.microsoft.com') {
            chrome.runtime.sendMessage({ type: 'REGISTER_MEETING_TAB' }).catch(() => { });
            // Also register regarding focus
            window.addEventListener('focus', () => {
                chrome.runtime.sendMessage({ type: 'REGISTER_MEETING_TAB' }).catch(() => { });
            });
        }

        // --- State Variables ---are at module level for accessibility by message handlers
        // ----------------------------------------------------



        // Initialize popover

        // NOTE: Screenshot messages are now handled by the main chrome.runtime.onMessage listener
        // to avoid duplicate processing. See the SCREENSHOT_ADDED case in the main handler.



        // Event Listeners - Quick Prompt
        const promptInput = document.getElementById('ic-quick-prompt');
        const sendPromptBtn = document.getElementById('ic-send-prompt');

        const sendQuickPrompt = () => {
            const prompt = promptInput.value.trim();
            if (prompt) {
                requestAI('custom', prompt);
                promptInput.value = '';
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



    function toggleMinimize() {
        isMinimized = !isMinimized;
        const body = overlay.querySelector('.ic-body');

        if (isMinimized) {
            if (body) body.style.display = 'none';
            overlay.classList.add('ic-minimized');
        } else {
            if (body) body.style.display = 'flex';
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

    async function requestAI(type, customPrompt = null, selectedIds = null) {
        // Auto-include selected screenshots as context if not explicitly provided
        const screenshotContext = selectedIds || (selectedScreenshots.size > 0 ? Array.from(selectedScreenshots) : []);

        // Show loading
        const btn = document.getElementById(`ic-${type === 'hint' ? 'help' : type}-btn`);
        if (btn) {
            btn.disabled = true;
            btn.classList.add('loading');
        }

        // Clear previous content (single response mode)
        if (hintContainer) hintContainer.innerHTML = '';

        // Add loading indicator to hints
        const loadingHint = document.createElement('div');
        loadingHint.className = 'ic-hint ic-loading';
        const contextInfo = screenshotContext.length > 0 ? ` (with ${screenshotContext.length} screenshot${screenshotContext.length > 1 ? 's' : ''})` : '';
        loadingHint.innerHTML = `<span class="ic-hint-icon">⏳</span><div class="ic-hint-content">Thinking${contextInfo}...</div>`;

        hintContainer.appendChild(loadingHint);

        try {
            await chrome.runtime.sendMessage({
                type: 'REQUEST_HINT',
                data: {
                    trigger: 'overlay',
                    requestType: type,
                    customPrompt: customPrompt,
                    selectedScreenshotIds: screenshotContext,
                    // Flag to request concise responses
                    conciseMode: true
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

    // ==========================================
    // DOM Capture & Platform Detection
    // ==========================================

    let html2canvasLoaded = false;
    let screenshotCount = 0;

    // Load html2canvas dynamically
    async function loadHtml2Canvas() {
        if (html2canvasLoaded || typeof html2canvas !== 'undefined') {
            html2canvasLoaded = true;
            return true;
        }

        return new Promise((resolve) => {
            const script = document.createElement('script');
            // Use local bundled html2canvas to bypass CSP restrictions on meeting platforms
            script.src = chrome.runtime.getURL('lib/html2canvas.js');
            script.onload = () => {
                html2canvasLoaded = true;
                console.log('[Content] html2canvas loaded from extension bundle');
                resolve(true);
            };
            script.onerror = (e) => {
                console.error('[Content] Failed to load html2canvas from bundle:', e);
                // Fallback to CDN (may be blocked by CSP)
                const cdnScript = document.createElement('script');
                cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                cdnScript.onload = () => {
                    html2canvasLoaded = true;
                    console.log('[Content] html2canvas loaded from CDN fallback');
                    resolve(true);
                };
                cdnScript.onerror = () => {
                    console.error('[Content] Failed to load html2canvas from CDN as well');
                    resolve(false);
                };
                document.head.appendChild(cdnScript);
            };
            document.head.appendChild(script);
        });
    }

    // Extract visible text from the page (for AI context) - generic extraction, no platform detection
    function extractDOMText() {
        let pageText = '';
        let codeText = '';

        // Extract main page content generically
        const mainContent = document.querySelector('main, article, .content, #content, body');
        if (mainContent) {
            pageText = mainContent.innerText?.substring(0, 10000) || '';
        }

        // Try to find any code editor content generically
        const codeEditor = document.querySelector('.monaco-editor, .CodeMirror, .ace_editor, pre code, code');
        if (codeEditor) {
            codeText = codeEditor.innerText?.substring(0, 5000) || '';
        }

        return {
            pageText: pageText,
            codeText: codeText,
            url: window.location.href,
            title: document.title
        };
    }

    // Capture full viewport using html2canvas - no platform-specific targeting
    async function captureViewport() {
        try {
            const loaded = await loadHtml2Canvas();
            if (!loaded || typeof html2canvas === 'undefined') {
                return { success: false, error: 'html2canvas not available' };
            }

            // Hide our overlay and screenshot strip during capture
            // NUCLEAR: Temporarily remove from DOM
            const wasInDom = overlay && overlay.parentNode;
            if (wasInDom) {
                overlay.remove();
            }



            const strip = document.querySelector('.ic-screenshot-strip');
            if (strip) strip.style.visibility = 'hidden';

            // Always capture full viewport (no platform-specific container targeting)
            const canvas = await html2canvas(document.body, {
                useCORS: true,
                allowTaint: true,
                scale: 1.0, // Reduced from 2x to 1.0 for performance
                logging: false,
                backgroundColor: '#ffffff',
                imageTimeout: 10000,
                removeContainer: true,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight,
                ignoreElements: (el) => {
                    // Ignore our overlay and strip during capture (redundant but safe)
                    return el.classList?.contains('ic-overlay') ||
                        el.classList?.contains('ic-screenshot-strip') ||
                        el.classList?.contains('ic-capture-flash');
                }
            });

            // Show overlay and strip again
            if (wasInDom && overlay) {
                document.body.appendChild(overlay);
                overlay.style.display = 'flex'; // Ensure visible
                overlay.style.visibility = 'visible';
            }



            if (strip) strip.style.visibility = 'visible';

            // Use PNG for better quality (especially text)
            const dataUrl = canvas.toDataURL('image/png');

            return {
                success: true,
                data: dataUrl,
                method: 'dom',
                width: canvas.width,
                height: canvas.height,
                sizeBytes: Math.round((dataUrl.length * 3) / 4)
            };
        } catch (error) {
            // Show overlay and strip again in case of error
            if (overlay) overlay.style.visibility = 'visible';
            const strip = document.querySelector('.ic-screenshot-strip');
            if (strip) strip.style.visibility = 'visible';
            console.error('[Content] DOM capture failed:', error);
            return { success: false, error: error.message };
        }
    }



    // Show visual feedback for screenshot capture
    function showScreenshotFeedback(success) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: ${success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
            z-index: 999999;
            pointer-events: none;
            animation: ic-flash 0.3s ease-out;
        `;

        // Add animation keyframes if not exists
        if (!document.getElementById('ic-flash-style')) {
            const style = document.createElement('style');
            style.id = 'ic-flash-style';
            style.textContent = `
                @keyframes ic-flash {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }

    async function takeScreenshot() {
        console.log('[Content] takeScreenshot() called - button was clicked');



        try {
            console.log('[Content] Taking screenshot...');

            // Extract page text for AI context (generic, no platform detection)
            const domText = extractDOMText();

            // NEW LOGIC: Prefer Native Screen Capture (via Background) for speed
            // Only use DOM capture if explicitly requested or for specific elements
            const preferNative = true; // Default to fast native capture

            if (preferNative) {
                console.log('[Content] Requesting native capture via background (fast mode)...');
                try {
                    const response = await chrome.runtime.sendMessage({
                        type: 'TAKE_SCREENSHOT',
                        data: {
                            trigger: 'overlay',
                            extractedText: domText.pageText,
                            url: domText.url,
                            title: domText.title
                        }
                    });
                    console.log('[Content] TAKE_SCREENSHOT response:', response);
                    if (response?.error) {
                        console.error('[Content] Screenshot failed:', response.error);
                        showScreenshotFeedback(false);
                        return;
                    }
                } catch (msgError) {
                    console.error('[Content] Error sending TAKE_SCREENSHOT message:', msgError);
                    showScreenshotFeedback(false);
                    return;
                }

                // Visual feedback is handled by the 'SCREENSHOT_ADDED' message listener
                // But we show a quick flash here just in case
                showScreenshotFeedback(true);
                return;
            }

            // Try DOM capture with html2canvas (Fallback or if specific element needed)
            const captureResult = await captureViewport();

            if (captureResult.success) {
                console.log('[Content] DOM capture successful, uploading...');

                // Send captured data to background for upload
                const response = await chrome.runtime.sendMessage({
                    type: 'SCREENSHOT_CAPTURED',
                    data: {
                        imageData: captureResult.data,
                        captureMethod: 'dom',
                        width: captureResult.width,
                        height: captureResult.height,
                        sizeBytes: captureResult.sizeBytes,
                        extractedText: domText.pageText,
                        codeText: domText.codeText,
                        url: domText.url,
                        title: domText.title
                    }
                });

                if (response?.success) {
                    // updateScreenshotCount(response.count || screenshotCount + 1); // Removed
                    showScreenshotFeedback(true);
                } else {
                    console.error('[Content] Upload failed:', response?.error);
                    showScreenshotFeedback(false);
                }
            } else {
                // Fallback: Request background to use screen capture
                console.log('[Content] DOM capture failed, requesting fallback...', captureResult.error);

                await chrome.runtime.sendMessage({
                    type: 'TAKE_SCREENSHOT',
                    data: {
                        trigger: 'overlay',
                        fallbackReason: captureResult.error,
                        extractedText: domText.pageText,
                        url: domText.url
                    }
                });

                showScreenshotFeedback(true); // Assume background will handle it
            }

        } catch (error) {
            console.error('[Content] Error taking screenshot:', error);
            showScreenshotFeedback(false);
        } finally {
            // Button UI update removed
        }
    }

    function openConsole(e) {
        e.preventDefault();
        // Use production URL by default, can be made configurable
        const dashboardUrl = window.location.host.includes('localhost')
            ? 'http://localhost:5173'
            : window.location.host.includes('vercel.app')
                ? 'https://ai-interview-copilot-kappa.vercel.app'
                : 'https://xtroone.com';
        const url = `${dashboardUrl}/dashboard/console`;
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
            displayHTML += `<span class="ic-final">${renderMarkdown(data.finalizedText)}</span>`;
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
    let currentStreamCancel = null; // Track current streaming animation

    // Markdown rendering utilities (inline for content script)
    function renderMarkdown(text) {
        if (!text) return '';
        
        // Split by lines to handle chat bubbles correctly
        const lines = text.split(/\r?\n/);
        let htmlLines = [];
        let inCodeBlock = false;
        
        // Process each line
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // Handle code blocks (simple toggle)
            if (line.trim().startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                htmlLines.push(line); // Keep code fences for now, render later or simple regex
                continue;
            }
            
            if (inCodeBlock) {
                htmlLines.push(escapeHtml(line));
                continue;
            }
            
            // Check for Speaker labels
            const userMatch = line.match(/^\*\*You:\*\*\s*(.*)/);
            const interviewerMatch = line.match(/^\*\*Interviewer:\*\*\s*(.*)/);
            
            if (userMatch) {
                const content = escapeHtml(userMatch[1]);
                htmlLines.push(`
                    <div class="ic-transcript-line ic-speaker-user">
                        <span class="ic-label">You</span>
                        <span class="ic-text">${formatInlineMarkdown(content)}</span>
                    </div>
                `);
            } else if (interviewerMatch) {
                const content = escapeHtml(interviewerMatch[1]);
                htmlLines.push(`
                    <div class="ic-transcript-line ic-speaker-interviewer">
                        <span class="ic-label">Interviewer</span>
                        <span class="ic-text">${formatInlineMarkdown(content)}</span>
                    </div>
                `);
            } else {
                // Regular text line
                if (line.trim()) {
                    htmlLines.push(`<div class="ic-transcript-line ic-speaker-generic">${formatInlineMarkdown(escapeHtml(line))}</div>`);
                }
            }
        }
        
        return htmlLines.join('');
    }

    function formatInlineMarkdown(text) {
        if (!text) return '';
        
        // 1. Inline code: `code`
        text = text.replace(/`([^`]+)`/g, '<code class="ic-inline-code">$1</code>');

        // 2. Bold: **text** or __text__
        text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

        // 3. Italic: *text* or _text_
        text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

        return text;
    }

    function formatTime(timestamp) {
        const date = timestamp ? new Date(timestamp) : new Date();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function getModelDisplayName(model, provider) {
        const names = {
            'deepseek-chat': 'DeepSeek',
            'deepseek-coder': 'DeepSeek Coder',
            'gpt-4o': 'GPT-4o',
            'gpt-4o-mini': 'GPT-4o Mini',
            'gpt-3.5-turbo': 'GPT-3.5',
            'claude-3-5-sonnet': 'Claude 3.5'
        };
        return names[model] || model || provider || 'AI';
    }

    function getModeClass(type) {
        const modeMap = {
            'code': 'mode-code',
            'explain': 'mode-explain',
            'help': 'mode-help',
            'answer': 'mode-answer',
            'custom': 'mode-help'
        };
        return modeMap[type] || 'mode-help';
    }

    function getModeLabel(type) {
        const labels = {
            'code': 'Code',
            'explain': 'Explain',
            'help': 'Help',
            'answer': 'Answer',
            'custom': 'Custom'
        };
        return labels[type] || 'Help';
    }

    // Copy to clipboard with visual feedback
    async function copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.innerHTML;
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
            button.classList.add('copied');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('copied');
            }, 2000);
            return true;
        } catch (e) {
            console.error('[Content] Copy failed:', e);
            return false;
        }
    }

    // Add hint with Ntro-style structure
    function addHint(hint) {
        if (!hintContainer) {
            hintContainer = document.getElementById('ic-hints');
        }
        if (!hintContainer) return;

        // Cancel any ongoing streaming
        if (currentStreamCancel) {
            currentStreamCancel();
            currentStreamCancel = null;
        }

        // Deduplicate: prevent same hint from being added multiple times
        const hintText = hint.hint || hint.text || '';
        const now = Date.now();

        if (hintText === lastHintText && (now - lastHintTimestamp) < 3000) {
            console.log('[Content] Skipping duplicate hint');
            return;
        }

        lastHintTimestamp = now;
        lastHintText = hintText;

        // Clear previous content (single response mode)
        hintContainer.innerHTML = '';

        // Get display values
        const modelName = getModelDisplayName(hint.model, hint.provider);
        const timeStr = formatTime(hint.timestamp);
        const modeClass = getModeClass(hint.type);
        const modeLabel = getModeLabel(hint.type);

        // Create the hint element with new structure
        const hintEl = document.createElement('div');
        hintEl.className = 'ic-hint';
        hintEl.innerHTML = `
            <div class="ic-hint-header">
                <div>
                    <span class="ic-hint-model">${modelName}</span>
                    <span class="ic-hint-mode ${modeClass}">${modeLabel}</span>
                </div>
                <span class="ic-hint-time">${timeStr}</span>
            </div>
            <div class="ic-hint-content"></div>
            <div class="ic-hint-footer">
                <button class="ic-action-btn ic-action-copy" data-action="copy">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy
                </button>
                <button class="ic-action-btn ic-action-regenerate" data-action="regenerate">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    Retry
                </button>
            </div>
        `;

        // Get content element for streaming
        const contentEl = hintEl.querySelector('.ic-hint-content');

        // Add to container
        hintContainer.appendChild(hintEl);

        // Stream the text with animation
        if (hintText.length > 50) {
            streamTextToElement(contentEl, hintText);
        } else {
            // Short text - render immediately
            contentEl.innerHTML = renderMarkdown(hintText);
        }

        // Set up action button handlers
        const copyBtn = hintEl.querySelector('.ic-action-copy');
        const regenerateBtn = hintEl.querySelector('.ic-action-regenerate');

        copyBtn.addEventListener('click', () => {
            copyToClipboard(hintText, copyBtn);
        });

        regenerateBtn.addEventListener('click', () => {
            // Re-request the same type
            requestAI(hint.type || 'help');
        });
    }

    // Stream text with typing effect
    function streamTextToElement(element, text, speed = 12) {
        element.classList.add('ic-streaming');
        element.innerHTML = '';

        const words = text.split(' ');
        let wordIndex = 0;

        const interval = setInterval(() => {
            if (wordIndex >= words.length) {
                clearInterval(interval);
                element.classList.remove('ic-streaming');
                element.innerHTML = renderMarkdown(text);
                currentStreamCancel = null;
                return;
            }

            const currentText = words.slice(0, wordIndex + 1).join(' ');
            element.innerHTML = renderMarkdown(currentText);
            wordIndex++;
        }, speed);

        // Return cancel function
        currentStreamCancel = () => {
            clearInterval(interval);
            element.classList.remove('ic-streaming');
            element.innerHTML = renderMarkdown(text);
        };
    }

    function formatHintContent(text) {
        return renderMarkdown(text);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;

    }

    // Keep-alive heartbeat to prevent service worker from sleeping
    let keepAliveInterval = null;

    function startKeepAlive() {
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        console.log('[Content] Starting keep-alive heartbeat');

        // Send heartbeat every 20 seconds (well within 30s idle limit)
        keepAliveInterval = setInterval(() => {
            if (!sessionActive) {
                stopKeepAlive();
                return;
            }
            chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' }).catch(() => {
                // Ignore errors (e.g. if extension updated/reloaded)
            });
        }, 20000);
    }

    function stopKeepAlive() {
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
            console.log('[Content] Stopped keep-alive heartbeat');
        }
    }

    // Message handler
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[Content] Message received:', message.type);

        switch (message.type) {
            case 'PING':
                sendResponse({ status: 'ready' });
                break;

            case 'DEBUG_LOG':
                // Display forwarded debug logs from background/offscreen
                const { message: logMsg, level, source } = message.data;
                const prefix = `[${source || 'Extension'}]`;

                if (level === 'error') {
                    console.error(prefix, logMsg);
                } else if (level === 'warn') {
                    console.warn(prefix, logMsg);
                } else {
                    console.log(prefix, logMsg);
                }
                sendResponse({ success: true });
                break;

            case 'SESSION_STARTED':
                sessionId = message.data?.sessionId;
                sessionActive = true;
                showOverlay();
                startKeepAlive(); // Start heartbeat
                sendResponse({ success: true });
                break;

            case 'SESSION_STOPPED':
                sessionActive = false;
                hideOverlay();
                stopKeepAlive(); // Stop heartbeat
                console.log('[Content] Session stopped, overlay hidden');
                sendResponse({ success: true });
                break;

            case 'SESSION_PAUSED':
                sessionActive = false;
                hideOverlay();
                stopKeepAlive(); // Stop heartbeat
                console.log('[Content] Session paused, overlay hidden');
                sendResponse({ success: true });
                break;

            case 'SESSION_RESUMED':
                sessionId = message.data?.sessionId;
                sessionActive = true;
                showOverlay();
                startKeepAlive(); // Start heartbeat
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

            case 'TAKE_SCREENSHOT_REQUEST':
                console.log('[Content] Received screenshot request from background');
                takeScreenshot();
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

            case 'SCREENSHOT_ADDED':
                // Screenshot captured - update popover
                const newScreenshot = message.data;
                if (newScreenshot && !screenshots.some(s => s.id === newScreenshot.id)) {
                    screenshots.unshift(newScreenshot);
                    // Auto-select for AI assistance by default
                    selectedScreenshots.add(newScreenshot.id);
                    // renderScreenshotPopover(); // Removed
                    showScreenshotFeedback(true);

                    // Show capture flash feedback
                    const flash = document.createElement('div');
                    flash.className = 'ic-capture-flash';
                    document.body.appendChild(flash);
                    setTimeout(() => flash.remove(), 300);
                }
                // updateScreenshotCount(screenshots.length); // Removed
                sendResponse({ success: true });
                break;

            case 'SCREENSHOT_DELETED':
                screenshots = screenshots.filter(s => s.id !== message.data.screenshotId);
                selectedScreenshots.delete(message.data.screenshotId);
                // renderScreenshotPopover(); // Removed
                // updateScreenshotCount(screenshots.length); // Removed
                sendResponse({ success: true });
                break;

            case 'SCREENSHOTS_CLEARED':
                screenshots = [];
                selectedScreenshots.clear();
                // renderScreenshotPopover(); // Removed
                // updateScreenshotCount(0); // Removed
                sendResponse({ success: true });
                break;

            case 'SCREENSHOT_SELECTION_UPDATED':
                if (message.data && message.data.screenshotId) {
                    if (message.data.isSelected) {
                        selectedScreenshots.add(message.data.screenshotId);
                    } else {
                        selectedScreenshots.delete(message.data.screenshotId);
                    }
                    // renderScreenshotPopover(); // Removed
                }
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


            case 'HIDE_OVERLAY_FOR_CAPTURE':
                // NUCLEAR OPTION: Physically remove from DOM
                const liveOverlayEx = document.getElementById('interview-copilot-overlay');
                if (liveOverlayEx) liveOverlayEx.remove();

                if (overlay && overlay.parentNode && (!liveOverlayEx || liveOverlayEx !== overlay)) {
                    overlay.remove();
                }

                // Screenshot popover is a child of overlay (in sidebar), so it's removed automatically.
                // But just in case it's separate:
                // if (screenshotPopover && screenshotPopover.parentNode && (!overlay || !overlay.contains(screenshotPopover.parentNode))) {
                //    screenshotPopover.remove();
                // }

                // Force layout recalc just in case (though remove() is usually immediate)
                const _ = document.body.offsetHeight;

                sendResponse({ success: true });
                break;

            case 'SHOW_OVERLAY_AFTER_CAPTURE':
                // Restore overlay by re-appending.
                // Check if it's already there first
                if (!document.getElementById('interview-copilot-overlay')) {
                    if (overlay) {
                        document.body.appendChild(overlay);
                        // Restore correct display state based on isHidden flag
                        overlay.style.display = isHidden ? 'none' : 'flex';
                        overlay.style.removeProperty('visibility');
                    } else {
                        // If logic requires recreation, ensure it respects isHidden if tracked globally
                        createOverlay();
                        if (overlay && isHidden) {
                            overlay.style.display = 'none';
                        }
                    }
                }

                sendResponse({ success: true });
                break;

            case 'TAKE_DOM_SCREENSHOT':
                console.log('[Content] Received forced DOM screenshot request');
                captureViewport().then(result => {
                    sendResponse({
                        success: result.success,
                        dataUrl: result.data,
                        error: result.error
                    });
                }).catch(err => {
                    sendResponse({ success: false, error: err.message });
                });
                return true; // Keep channel open
        }

        return true;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Skip shortcuts when typing in editable elements
        const isEditable = isEditableElement(e.target);

        // Ctrl+Shift+O - Toggle overlay (works everywhere)
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyO') {
            e.preventDefault();
            if (overlay) toggleHide();
        }
        // Ctrl+Shift+H - Request hint (works everywhere except editors)
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyH' && !isEditable) {
            e.preventDefault();
            if (overlay && !isHidden) requestAI('hint');
        }
        // Ctrl+Shift+S OR Ctrl+Insert - Take screenshot (ntro.io compatibility)
        if ((e.ctrlKey && e.shiftKey && e.code === 'KeyS' && !isEditable) ||
            (e.ctrlKey && e.code === 'Insert' && !isEditable)) {
            e.preventDefault();
            if (sessionActive) takeScreenshot();
        }
    });

    // Helper: Check if element is editable (input, textarea, contenteditable)
    function isEditableElement(element) {
        if (!element) return false;
        const tagName = element.tagName?.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') return true;
        if (element.contentEditable === 'true') return true;
        if (element.classList?.contains('monaco-editor')) return true;
        if (element.classList?.contains('ace_editor')) return true;
        if (element.closest('.monaco-editor, .ace_editor, .CodeMirror')) return true;
        return false;
    }

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
    if (window.location.host.includes('localhost:5173') ||
        window.location.host.includes('127.0.0.1:5173') ||
        window.location.host.includes('xtroone.com') ||
        window.location.host.includes('vercel.app')) {
        console.log('[Content] Checking for auth token on dashboard domain: ' + window.location.host);

        let authPollInterval;
        let authSynced = false; // Flag to prevent repeated syncs

        function checkForAuthToken() {
            if (!chrome.runtime?.id) {
                // Extension context invalidated, stop polling
                if (authPollInterval) clearInterval(authPollInterval);
                return;
            }

            // Already synced, stop polling
            if (authSynced) {
                if (authPollInterval) clearInterval(authPollInterval);
                return;
            }

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
                try {
                    chrome.runtime.sendMessage({
                        type: 'AUTH_SYNC',
                        user: authData.user,
                        session: authData,
                        token: authData.access_token
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            // Suppress errors from context invalidation
                            if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                                if (authPollInterval) clearInterval(authPollInterval);
                            }
                        } else if (response && response.success) {
                            // Successfully synced, stop polling
                            console.log('[Content] Auth synced successfully, stopping poll');
                            authSynced = true;
                            if (authPollInterval) clearInterval(authPollInterval);
                        }
                    });
                } catch (e) {
                    if (e.message.includes('Extension context invalidated')) {
                        if (authPollInterval) clearInterval(authPollInterval);
                    }
                }
            }
        }

        // Poll every 2 seconds to catch login/signup completion
        authPollInterval = setInterval(checkForAuthToken, 2000);
        checkForAuthToken();

        // ALSO listen for AUTH_STATE_CHANGE messages from web app (extensionAuthBridge)
        // This provides real-time auth sync when the web app broadcasts auth changes
        window.addEventListener('message', (event) => {
            // Only accept messages from same origin
            if (event.origin !== window.location.origin) return;

            const message = event.data;

            // Handle AUTH_STATE_CHANGE from web app
            if (message?.type === 'AUTH_STATE_CHANGE') {
                console.log('[Content] Received AUTH_STATE_CHANGE from web app:', message.data);

                if (message.data?.isAuthenticated && message.data?.accessToken) {
                    // Forward to background as AUTH_SYNC
                    chrome.runtime.sendMessage({
                        type: 'AUTH_SYNC',
                        user: {
                            id: message.data.userId,
                            email: message.data.email || 'user@example.com'
                        },
                        token: message.data.accessToken,
                        session: {
                            refresh_token: message.data.refreshToken,
                            expires_at: message.data.expiresAt
                        }
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('[Content] Failed to forward AUTH_SYNC:', chrome.runtime.lastError);
                        } else if (response?.success) {
                            console.log('[Content] AUTH_SYNC forwarded successfully');
                            authSynced = true;
                            if (authPollInterval) clearInterval(authPollInterval);
                        }
                    }).catch(err => {
                        console.error('[Content] Failed to send AUTH_SYNC:', err);
                    });
                }
            }
        });
    }
})();

