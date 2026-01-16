// Background Service Worker - Main Orchestrator
import { StateManager } from './lib/state-manager.js';
import { AudioCaptureManager } from './lib/audio-capture.js';
import { ScreenCaptureManager } from './lib/screen-capture.js';
import { AIService } from './lib/ai-service.js';
import { ConsoleSync } from './lib/console-sync.js';
import { supabaseREST, setTokens } from './lib/supabase-config.js';
import { TranscriptionManager } from './lib/transcription-manager.js';
import { InterviewContextManager } from './lib/interview-context-manager.js';
import { ReportGenerator } from './lib/report-generator.js';

class BackgroundService {
  constructor() {
    this.state = new StateManager();
    this.audioManager = new AudioCaptureManager();
    this.screenManager = new ScreenCaptureManager();
    this.aiService = new AIService();
    this.consoleSync = new ConsoleSync();

    // Single source of truth for transcription state (append-only, no flicker)
    this.transcriptionManager = new TranscriptionManager();

    // Rolling interview context for instant AI responses
    this.interviewContext = new InterviewContextManager();
    this.aiService.setContextManager(this.interviewContext);
    
    this.reportGenerator = new ReportGenerator();

    this.sessionActive = false;
    this.tabId = null;
    this.transcriptionBuffer = [];
    this.screenshotQueue = [];

    this.init();
  }

  async init() {
    // Load saved state
    await this.state.load();

    // Setup message listeners
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      // Wrap in async IIFE to handle errors properly
      (async () => {
        try {
          await this.handleMessage(msg, sender, sendResponse);
        } catch (error) {
          console.error('[Background] Unhandled error in message handler:', error);
          sendResponse({ success: false, error: error.message || 'Unknown error' });
        }
      })();
      return true; // Keep channel open for async response
    });

    // Setup command listeners (keyboard shortcuts)
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });

    // Monitor tab closures (cleanup if meeting tab is closed)
    chrome.tabs.onRemoved.addListener((tabId) => {
      if (this.sessionActive && this.tabId === tabId) {
        console.log('[Background] Meeting tab closed, pausing session');
        this.pauseSession();
      }
    });

    // Restore active session if any
    if (this.state.data.activeSession) {
      console.log('[Background] Auto-resuming session from state');
      this.resumeSession({ sessionId: this.state.data.activeSession.id });
    }

    // Ensure Deepgram key is available
    chrome.storage.local.get(['deepgram_api_key'], (result) => {
      if (!result.deepgram_api_key) {
        // Set default if missing (TEMPORARY: In prod should force user to set it)
        chrome.storage.local.set({ deepgram_api_key: '5e2e3945f5f5e171dbdc62bb3d06cd3f6a088266' });
      }
    });

    // Listen for remote console commands (Supabase)
    this.consoleSync.onMessage((msg) => {
      console.log('[Background] Received remote console command:', msg.type, 'Data:', JSON.stringify(msg.data));

      switch (msg.type) {
        case 'REQUEST_HINT':
          console.log('[Background] Processing REQUEST_HINT from console, requestType:', msg.data?.requestType);
          this.requestHint({ ...msg.data, trigger: msg.data?.trigger || 'manual' });
          break;
        case 'TAKE_SCREENSHOT':
          this.takeScreenshot({ trigger: 'manual' });
          break;
        case 'CLEAR_SCREENSHOTS':
          // Clear screenshots and notify overlay (triggered from console)
          this.clearScreenshots(() => { });
          break;
      }
    });
  }

  async handleMessage(msg, sender, sendResponse) {
    // Filter out frequent messages if needed, but logging everything strictly for now
    if (msg.type !== 'GET_SESSION_STATUS' && msg.type !== 'KEEP_ALIVE') {
      console.log('[Background] Message received:', msg.type);
    }

    switch (msg.type) {
      case 'DEBUG_LOG':
        // Forward offscreen logs to the active tab so user can see them in overlay console
        if (msg.data) {
          const logPrefix = msg.data.source ? `[${msg.data.source}]` : '[Debug]';
          console.log(`${logPrefix} ${msg.data.message}`);

          if (this.tabId) { // If we have a target tab
            chrome.tabs.sendMessage(this.tabId, {
              type: 'DEBUG_LOG',
              data: msg.data
            }).catch(() => { }); // Ignore if tab closed or no listener
          }
        }
        sendResponse({ success: true });
        break;

      case 'LOGIN':
        await this.handleLogin(msg.data, sendResponse);
        break;

      case 'SIGNUP':
        await this.handleSignup(msg.data, sendResponse);
        break;

      case 'LOGOUT':
        await this.handleLogout(sendResponse);
        break;

      case 'START_MEETING':
        // Map START_MEETING from popup to START_SESSION
        // Extract meeting data and format for startSession
        const meetingData = msg.meeting || msg.data || {};

        // Get active tab for the meeting
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const sessionData = {
          tabId: activeTab?.id,
          meetingUrl: meetingData.meetingUrl || activeTab?.url,
          interviewContext: {
            ...meetingData.interviewContext, // Spread original context to keep isLiveCoding, etc.
            role: meetingData.title || meetingData.scenario || 'Interview',
            type: meetingData.scenario === 'job-interview' ? 'technical' : 'mixed',
            scenario: meetingData.scenario,
            language: meetingData.meetingLanguage,
            platform: meetingData.platform
          }
        };

        await this.startSession(sessionData, sendResponse);
        break;

      case 'FINISH_MEETING':
        // Finish meeting = stop session (deducts credits)
        await this.stopSession(sendResponse);
        break;

      case 'DISCONNECT_MEETING':
        // Disconnect = pause session (can be resumed)
        // Note: sessionId is at root level of msg, not in msg.data
        await this.pauseSession(msg, sendResponse);
        break;

      case 'RESUME_MEETING':
        // Resume a paused meeting
        // Note: sessionId is at root level of msg, not in msg.data
        await this.resumeSession(msg, sendResponse);
        break;

      case 'START_SESSION':
        await this.startSession(msg.data, sendResponse);
        break;

      case 'STOP_SESSION':
        await this.stopSession(sendResponse);
        break;

      case 'CANCEL_SESSION':
        await this.cancelSession(sendResponse);
        break;

      case 'REQUEST_HINT':
        await this.requestHint(msg.data, sendResponse);
        break;

      case 'TAKE_SCREENSHOT':
        await this.takeScreenshot(msg.data, sendResponse);
        break;

      case 'SCREENSHOT_CAPTURED':
        // Handle DOM capture from content script (new flow)
        await this.handleScreenshotCaptured(msg.data, sendResponse);
        break;

      case 'DELETE_SCREENSHOT':
        await this.deleteScreenshot(msg.data, sendResponse);
        break;

      case 'CLEAR_SCREENSHOTS':
        await this.clearScreenshots(sendResponse);
        break;

      case 'TOGGLE_MODE':
        await this.toggleMode(msg.data, sendResponse);
        break;

      case 'GET_SESSION_STATUS':
        sendResponse({
          active: this.sessionActive,
          sessionId: this.state.data.activeSession?.id || null,
          tabId: this.tabId,
          mode: this.state.data.settings.mode,
          credits: this.state.data.credits,
          sessionTime: this.getSessionTime(),
          meetingUrl: this.state.data.activeSession?.url || ''
        });
        break;

      case 'AUTH_SYNC':
        await this.handleAuthSync(msg, sendResponse);
        break;

      case 'SHOW_OVERLAY_ON_TAB':
      case 'SHOW_OVERLAY':
        // Show overlay on the specified tab or active session tab
        const overlayTabId = msg.tabId || this.tabId;
        if (overlayTabId && this.sessionActive) {
          chrome.tabs.sendMessage(overlayTabId, { type: 'SHOW_OVERLAY' }).catch(() => { });
        }
        sendResponse({ success: true });
        break;

      case 'KEEP_ALIVE':
        // Just return success to keep the service worker alive
        sendResponse({ success: true });
        break;



      case 'UPDATE_SETTINGS':
        await this.updateSettings(msg.data, sendResponse);
        break;

      case 'CONSOLE_CONNECT':
        await this.connectConsole(msg.data, sender, sendResponse);
        break;

      case 'SAVE_FEEDBACK':
        await this.handleSaveFeedback(msg.data, sendResponse);
        break;

      case 'DOWNLOAD_REPORT':
        await this.handleDownloadReport(msg.data, sendResponse);
        break;

      case 'GET_CREDITS':
        // Fetch fresh credits from Supabase
        try {
          const creditsResult = await supabaseREST.getCredits();
          if (creditsResult.success) {
            this.state.data.credits = creditsResult.balance;
            await chrome.storage.local.set({ credits: creditsResult.balance });
            sendResponse({ success: true, credits: creditsResult.balance });
          } else {
            sendResponse({ success: false, credits: this.state.data.credits, error: creditsResult.error });
          }
        } catch (error) {
          sendResponse({ success: false, credits: this.state.data.credits, error: error.message });
        }
        break;

      case 'TRANSCRIPTION_RESULT':
        // Handle transcription from offscreen document (Deepgram)
        if (msg.data && msg.data.text) {
          this.onTranscription({
            text: msg.data.text,
            confidence: msg.data.confidence || 0.95,
            isFinal: msg.data.isFinal
          });
        }
        sendResponse({ success: true });
        break;

      // Screen capture control (for live coding fallback)
      case 'START_SCREEN_SHARE':
        await this.startScreenShare(sendResponse);
        break;

      case 'STOP_SCREEN_SHARE':
        await this.stopScreenShare(sendResponse);
        break;

      case 'GET_SESSION_SCREENSHOTS':
        if (this.sessionActive && this.state.data.activeSession?.id) {
          const { data: screenshots, error } = await supabaseREST.rpc('get_session_screenshots', {
            p_session_id: this.state.data.activeSession.id
          });
          sendResponse({ success: !error, screenshots: screenshots || [], error: error?.message });
        } else {
          sendResponse({ success: false, screenshots: [] });
        }
        break;

      case 'DELETE_SCREENSHOT':
        await this.deleteScreenshot(msg.data, sendResponse);
        break;

      case 'CLEAR_SCREENSHOTS':
        await this.clearScreenshots(sendResponse);
        break;

      case 'SCREEN_SHARE_ENDED':
        // User stopped screen sharing via browser UI
        console.log('[Background] Screen share ended by user');
        this.isScreenSharing = false;
        // Notify console
        await this.consoleSync.send({
          type: 'SCREEN_SHARE_STATUS',
          data: { active: false, reason: msg.data?.reason || 'user_stopped' }
        });
        sendResponse({ success: true });
        break;

      // Screenshot backend sync
      case 'UPLOAD_SCREENSHOT':
        await this.uploadScreenshot(msg.data, sendResponse);
        break;

      case 'GET_SCREENSHOTS':
        await this.getSessionScreenshots(sendResponse);
        break;

      case 'CLEAR_SCREENSHOTS':
        await this.clearScreenshots(sendResponse);
        break;

      case 'UPDATE_SCREENSHOT':
        await this.updateScreenshotMetadata(msg.data, sendResponse);
        break;

      case 'DELETE_SCREENSHOT':
        await this.deleteScreenshot(msg.data, sendResponse);
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  // Supabase authentication handlers
  async handleLogin(data, sendResponse) {
    try {
      const { email, password } = data;

      if (!email || !password) {
        sendResponse({ success: false, error: 'Email and password required' });
        return;
      }

      console.log('[Background] Attempting Supabase login for:', email);

      // Use real Supabase authentication
      const result = await supabaseREST.signIn(email, password);

      if (!result.success) {
        sendResponse({ success: false, error: result.error });
        return;
      }

      // Fetch real credits from Supabase
      let credits = 0;
      try {
        const creditsResult = await supabaseREST.getCredits();
        if (creditsResult.success) {
          credits = creditsResult.balance;
        }
        console.log('[Background] Fetched credits:', credits);
      } catch (creditsError) {
        console.error('[Background] Failed to fetch credits:', creditsError);
      }

      const user = {
        id: result.user?.id,
        email: result.user?.email || email,
        credits: credits,
        plan: 'free'
      };

      if (!user.id) {
        throw new Error('No user ID returned from Supabase');
      }

      this.state.data.user = user;
      this.state.data.credits = user.credits;
      await this.state.save();

      console.log('[Background] Supabase login successful:', user.email);

      sendResponse({
        success: true,
        user: user,
        token: result.token
      });

    } catch (error) {
      console.error('[Background] Login error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSignup(data, sendResponse) {
    try {
      const { email, password } = data;

      if (!email || !password) {
        sendResponse({ success: false, error: 'Email and password required' });
        return;
      }

      console.log('[Background] Attempting Supabase signup for:', email);

      // Use real Supabase authentication
      const result = await supabaseREST.signUp(email, password);

      if (!result.success) {
        sendResponse({ success: false, error: result.error });
        return;
      }

      // Fetch real credits from Supabase (new users should have initial credits from signup trigger)
      let credits = 0;
      try {
        const creditsResult = await supabaseREST.getCredits();
        if (creditsResult.success) {
          credits = creditsResult.balance;
        }
        console.log('[Background] Fetched credits for new user:', credits);
      } catch (creditsError) {
        console.error('[Background] Failed to fetch credits:', creditsError);
      }

      const user = {
        id: result.user?.id || `user_${Date.now()}`,
        email: result.user?.email || email,
        credits: credits,
        plan: 'free'
      };

      this.state.data.user = user;
      this.state.data.credits = user.credits;
      await this.state.save();

      console.log('[Background] Supabase signup successful:', user.email);

      sendResponse({
        success: true,
        user: user,
        token: result.token
      });

    } catch (error) {
      console.error('[Background] Signup error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleLogout(sendResponse) {
    try {
      console.log('[Background] Handling logout');
      
      // Stop any active session
      if (this.sessionActive) {
        await this.stopSession(() => { });
      }

      // Clear user data
      this.state.data.user = null;
      await this.state.save();

      // Send CLEAR_AUTH message to all dashboard tabs to clear localStorage
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && (tab.url.includes('localhost:5173') || 
                        tab.url.includes('127.0.0.1:5173') ||
                        tab.url.includes('xtroone.com') || 
                        tab.url.includes('vercel.app'))) {
          try {
            await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_AUTH' });
            console.log('[Background] Sent CLEAR_AUTH to tab:', tab.id);
          } catch (error) {
            // Tab might not have content script, ignore
            console.log('[Background] Could not send CLEAR_AUTH to tab:', tab.id);
          }
        }
      }

      // Set flag to ignore AUTH_SYNC for 5 seconds to prevent immediate re-authentication
      this.ignoreAuthSync = true;
      setTimeout(() => {
        this.ignoreAuthSync = false;
        console.log('[Background] Re-enabled AUTH_SYNC processing');
      }, 5000);

      console.log('[Background] Logout completed, AUTH_SYNC ignored for 5 seconds');
      sendResponse({ success: true });

    } catch (error) {
      console.error('[Background] Logout error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleCommand(command) {
    console.log('[Background] Command:', command);

    switch (command) {
      case 'trigger-help':
        await this.requestHint({ trigger: 'keyboard' });
        break;
      case 'take-screenshot':
        await this.takeScreenshot({ trigger: 'keyboard' });
        break;
      case 'toggle-overlay':
        await this.toggleOverlay();
        break;
    }
  }

  async startSession(data, sendResponse) {
    try {
      // Get the tab ID from the request or current active tab
      let tabId = data?.tabId;

      if (!tabId) {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!currentTab) {
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }
        tabId = currentTab.id;
      }

      const meetingUrl = data?.meetingUrl;

      this.tabId = tabId;

      console.log('[Background] Starting session for tab:', tabId, 'URL:', meetingUrl);

      // CRITICAL: Block if no credits (Server-side enforcement)
      if ((this.state.data.credits || 0) <= 0) {
        console.warn('[Background] Blocked session start due to 0 credits');
        sendResponse({ success: false, error: 'Insufficient credits. Please top up your account.' });
        return;
      }

      // Clear any previous session's transcripts from storage
      await chrome.storage.local.set({ overlayTranscripts: [], lastTranscriptTime: 0 });
      console.log('[Background] Cleared previous transcripts from storage');

      this.sessionActive = true;

      // Initialize interview context for this session
      this.interviewContext.setMeta(data?.interviewContext || {});
      this.interviewContext.clear(); // Clear any previous session context

      // Pre-warm AI config for instant button responses
      this.aiService.warmup();

      // Initialize session state will be done after DB creation attempt to ensure ID consistency
      // Old initialization removed from here to avoid overwriting IDs


      await this.state.save();

      // Start real audio capture with Deepgram (NO mock fallback - expose real errors)
      try {
        await this.audioManager.startCapture(tabId);
        console.log('[Background] Real audio capture started');
      } catch (error) {
        console.error('[Background] Real audio capture failed:', error.message);
        // Show error in overlay instead of silently using mock data
        setTimeout(() => {
          this.sendToOverlay({
            type: 'TRANSCRIPTION_STATE',
            data: {
              finalizedText: '',
              interimText: '',
              displayText: '⚠️ Audio capture failed: ' + error.message + '. Please ensure you have granted permissions.'
            }
          });
        }, 1000);
        // Do NOT start mock transcription - let user see the real error
      }

      // Connect console sync
      const consoleToken = this.generateConsoleToken();
      this.state.data.consoleToken = consoleToken;
      await this.state.save();

      // DATABASE SYNC: Create session in Supabase if user is logged in
      const sessionId = crypto.randomUUID(); // Use UUID for DB compatibility
      let dbSessionCreated = false;

      try {
        // DATABASE SYNC: Create session in Supabase if user is logged in
        if (this.state.data.user && this.state.data.user.id) {
          console.log('[Background] Creating DB session for user:', this.state.data.user.id);

          const { data: inserted, error } = await supabaseREST.insert('interview_sessions', {
            id: sessionId,
            user_id: this.state.data.user.id,
            role: data?.interviewContext?.role || 'Software Engineer',
            type: (data?.interviewContext?.type || 'technical').toLowerCase(),
            difficulty: 'medium',
            status: 'active',
            console_token: consoleToken,
            started_at: new Date().toISOString(),
            context: data?.interviewContext // Store full context
            // initial_credits: 0 // removed if not in schema
          });

          if (error) throw new Error(error.message || 'DB Insert Failed');
          console.log('[Background] DB Session created 200 OK');
          dbSessionCreated = true;
        } else {
          console.warn('[Background] Skipping DB creation - No user ID');
        }
      } catch (dbError) {
        console.error('[Background] Failed to create DB session:', dbError);
      }

      // ALWAYS update local state (overlay still works even if DB fails)
      this.state.data.activeSession = {
        id: sessionId,
        tabId: tabId,
        startTime: Date.now(),
        url: meetingUrl || 'unknown',
        platform: this.detectPlatform(meetingUrl || ''),
        interviewContext: data?.interviewContext || {}
      };
      await this.state.save();

      // ONLY send sync messages if DB session was created successfully
      if (dbSessionCreated) {
        try {
          await this.consoleSync.connect(consoleToken, sessionId);
          // Send heartbeat
          await this.consoleSync.send({
            type: 'SESSION_ACTIVE',
            data: { sessionId, timestamp: Date.now(), interviewContext: data?.interviewContext || {} }
          });
        } catch (syncErr) { console.error('[Background] Console Sync Connect Error:', syncErr); }
      } else {
        console.log('[Background] Skipping sync - DB session not created');
      }

      // Notify content script (Overlay)
      await this.notifyContentScript(tabId);

      // Send token to overlay
      setTimeout(() => {
        this.sendToOverlay({
          type: 'CONSOLE_TOKEN',
          data: { token: consoleToken, sessionId }
        });

        // Auto-start screen share if Live Coding is enabled
        // Check from stored session context (more reliable than closure)
        const sessionContext = this.state.data.activeSession?.interviewContext || {};
        const isLiveCoding = sessionContext.isLiveCoding === true;

        console.log('[Background] Session context for screen share check:', {
          scenario: sessionContext.scenario,
          isLiveCoding: sessionContext.isLiveCoding,
          willPrompt: isLiveCoding
        });

        if (isLiveCoding) {
          console.log('[Background] Live Coding mode detected - prompting for screen share...');
          // Delay slightly to let overlay load first
          setTimeout(async () => {
            try {
              await this.startScreenShare();
              console.log('[Background] Screen share started for Live Coding mode');
            } catch (err) {
              console.log('[Background] Screen share prompt may have been dismissed:', err.message);
            }
          }, 1000);
        }
      }, 500);

      sendResponse({
        success: true,
        sessionId: this.state.data.activeSession.id,
        consoleToken: consoleToken
      });

    } catch (error) {
      console.error('[Background] Start session error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Removed: injectOverlayWithRetry - content-script.js now handles overlay creation
  // This eliminates race conditions between overlay-manager.js and content-script.js

  async notifyContentScript(tabId) {
    // Content script is auto-injected via manifest.json for meeting platforms
    // But we need to manually inject for other URLs (like YouTube, testing pages, etc.)
    console.log('[Background] Notifying content script on tab:', tabId);

    // Try to send message first
    let contentScriptReady = false;
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      contentScriptReady = true;
      console.log('[Background] Content script already loaded');
    } catch (err) {
      console.log('[Background] Content script not loaded, will inject manually');
    }

    // If content script not ready, inject it manually
    if (!contentScriptReady) {
      try {
        // Inject CSS first
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content-styles.css']
        });
        console.log('[Background] Content styles injected');

        // Then inject the script
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['lib/html2canvas.js', 'content-script.js']
        });
        console.log('[Background] Content script injected manually');

        // Wait longer for initialization (increased from 500ms to 1000ms)
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('[Background] Failed to inject content script:', error.message);
        return;
      }
    }

    // Send the session started message with retry logic
    await this.sendSessionStartedWithRetry(tabId, 3);
  }

  // Get elapsed session time in seconds
  getSessionTime() {
    if (!this.sessionActive || !this.state.data.activeSession?.startTime) {
      return 0;
    }
    return Math.floor((Date.now() - this.state.data.activeSession.startTime) / 1000);
  }

  // Helper function to send SESSION_STARTED with retries
  async sendSessionStartedWithRetry(tabId, maxRetries = 3) {
    const sessionData = {
      sessionId: this.state.data.activeSession?.id,
      showOverlay: true
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'SESSION_STARTED',
          data: sessionData
        });
        console.log('[Background] Content script notified successfully on attempt', attempt);
        return true;
      } catch (err) {
        console.log(`[Background] SESSION_STARTED attempt ${attempt}/${maxRetries} failed:`, err.message);
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff: 500ms, 1000ms, 2000ms)
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
    console.error('[Background] Failed to notify content script after', maxRetries, 'attempts');
    return false;
  }

  // Removed: directInjectOverlay - content-script.js now handles overlay creation
  // This eliminates race conditions between overlay-manager.js and content-script.js

  // Real audio capture using offscreen document and Deepgram
  async startRealAudioCapture(tabId) {
    console.log('[Background] Starting real audio capture for tab:', tabId);

    // Create offscreen document if it doesn't exist
    await this.createOffscreenDocument();

    // Get tab capture stream ID using tabCapture.getMediaStreamId
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(id);
        }
      });
    });

    console.log('[Background] Got stream ID:', streamId);

    // Send stream ID to offscreen document to start capture
    const response = await chrome.runtime.sendMessage({
      type: 'START_AUDIO_CAPTURE',
      streamId: streamId
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to start audio capture');
    }

    console.log('[Background] Audio capture started successfully');
  }

  async createOffscreenDocument() {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
      console.log('[Background] Offscreen document already exists');
      return;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Capturing tab audio for transcription'
    });

    console.log('[Background] Offscreen document created');
  }

  async stopRealAudioCapture() {
    try {
      await chrome.runtime.sendMessage({ type: 'STOP_AUDIO_CAPTURE' });

      // Close offscreen document
      await chrome.offscreen.closeDocument();
      console.log('[Background] Audio capture stopped and offscreen document closed');
    } catch (error) {
      console.log('[Background] Error stopping audio capture:', error.message);
    }
  }

  // Start screen capture for Online Assessment flow
  async startScreenCapture(data, sendResponse) {
    try {
      console.log('[Background] Starting screen capture for Online Assessment');

      // Create offscreen document if not exists
      await this.createOffscreenDocument();

      // Send to offscreen document to start screen capture
      // The offscreen document will use getDisplayMedia to prompt the user
      const response = await chrome.runtime.sendMessage({
        type: 'START_SCREEN_CAPTURE'
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to start screen capture');
      }

      // Store the screen sharing state
      this.screenSharingActive = true;
      await chrome.storage.local.set({ screenSharingActive: true });

      console.log('[Background] Screen capture started successfully');
      sendResponse({ success: true });

    } catch (error) {
      console.error('[Background] Screen capture error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  startMockTranscription() {
    console.log('[Background] Starting mock transcription mode');

    // Notify overlay that we're in mock mode
    setTimeout(() => {
      this.broadcastToExtensionPages({
        type: 'TRANSCRIPTION_STATUS',
        data: { mode: 'mock', message: 'Using demo transcription' }
      });
    }, 2000);

    // Generate mock transcription for testing
    const mockTexts = [
      "Tell me about your experience with JavaScript.",
      "How would you handle state management in a large React application?",
      "Can you explain the difference between let, const, and var?",
      "Describe a challenging bug you've debugged recently.",
      "What are your thoughts on TypeScript?",
      "How do you approach code reviews?",
      "Tell me about a project you're proud of."
    ];

    // Send first transcription after 3 seconds so user sees it working
    setTimeout(() => {
      if (this.sessionActive) {
        const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
        this.onTranscription({
          text: randomText,
          confidence: 0.95,
          isFinal: true
        });
      }
    }, 3000);

    // Then continue every 8 seconds
    this.mockTranscriptionInterval = setInterval(() => {
      if (!this.sessionActive) {
        clearInterval(this.mockTranscriptionInterval);
        return;
      }

      const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
      this.onTranscription({
        text: randomText,
        confidence: 0.95,
        isFinal: true
      });
    }, 8000);
  }

  async stopSession(sendResponse) {
    try {
      // Stop mock transcription
      if (this.mockTranscriptionInterval) {
        clearInterval(this.mockTranscriptionInterval);
        this.mockTranscriptionInterval = null;
      }

      // Stop real audio capture
      await this.stopRealAudioCapture();

      // DATABASE SYNC: Complete session in Supabase (this deducts 1 credit atomically)
      let newCredits = this.state.data.credits;
      try {
        if (this.state.data.activeSession && this.state.data.activeSession.id) {
          const result = await supabaseREST.completeSession(this.state.data.activeSession.id);

          if (result.success) {
            console.log('[Background] DB Session completed, credit deducted. New balance:', result.new_balance);
            newCredits = result.new_balance;
            this.state.data.credits = newCredits;

            // Update stored credits
            await chrome.storage.local.set({ credits: newCredits });
          } else {
            console.error('[Background] Failed to complete session via RPC:', result.error || result.message);
            // Fallback: try direct update (won't deduct credits properly but at least marks complete)
            await supabaseREST.update('interview_sessions',
              { status: 'completed', ended_at: new Date().toISOString() },
              { id: this.state.data.activeSession.id }
            );
          }
        }
      } catch (dbError) {
        console.error('[Background] Failed to end DB session:', dbError);
      }

      // Stop old audio capture (if ever used)
      try {
        await this.audioManager.stopCapture();
      } catch (e) {
        // Ignore if audio manager not initialized
      }

      // Save session history
      if (this.state.data.activeSession) {
        this.state.data.sessionHistory.unshift({
          ...this.state.data.activeSession,
          endTime: Date.now(),
          transcripts: this.transcriptionBuffer.slice(),
          screenshots: this.screenshotQueue.slice()
        });

        // Keep only last 10 sessions
        this.state.data.sessionHistory = this.state.data.sessionHistory.slice(0, 10);
      }

      // Clear session data
      this.sessionActive = false;
      this.state.data.activeSession = null;
      this.transcriptionBuffer = [];
      this.screenshotQueue = [];

      // Clear TranscriptionManager state (single source of truth cleanup)
      this.transcriptionManager.clear();

      // Clear InterviewContextManager (rolling context window cleanup)
      this.interviewContext.clear();

      // Cancel any pending console debounce timer
      if (this.consoleTranscriptTimeout) {
        clearTimeout(this.consoleTranscriptTimeout);
        this.consoleTranscriptTimeout = null;
      }

      await this.state.save();

      // Disconnect console
      await this.consoleSync.disconnect();

      // Notify content script
      if (this.tabId) {
        chrome.tabs.sendMessage(this.tabId, { type: 'SESSION_STOPPED' });
      }

      sendResponse({ success: true });

    } catch (error) {
      console.error('[Background] Stop session error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Cancel session without deducting credits
  async cancelSession(sendResponse) {
    try {
      // Stop mock transcription
      if (this.mockTranscriptionInterval) {
        clearInterval(this.mockTranscriptionInterval);
        this.mockTranscriptionInterval = null;
      }

      // Stop real audio capture
      await this.stopRealAudioCapture();

      // DATABASE SYNC: Mark session as cancelled (NO credit deduction)
      try {
        if (this.state.data.activeSession && this.state.data.activeSession.id) {
          await supabaseREST.update('interview_sessions',
            { status: 'cancelled', ended_at: new Date().toISOString() },
            { id: this.state.data.activeSession.id }
          );
          console.log('[Background] DB Session marked cancelled (no credit deducted)');
        }
      } catch (dbError) {
        console.error('[Background] Failed to cancel DB session:', dbError);
      }

      // Clear session data
      this.sessionActive = false;
      this.state.data.activeSession = null;
      this.transcriptionBuffer = [];
      this.screenshotQueue = [];

      // Clear TranscriptionManager state
      this.transcriptionManager.clear();

      // Clear InterviewContextManager
      this.interviewContext.clear();

      // Cancel any pending console debounce timer
      if (this.consoleTranscriptTimeout) {
        clearTimeout(this.consoleTranscriptTimeout);
        this.consoleTranscriptTimeout = null;
      }

      await this.state.save();

      // Disconnect console
      await this.consoleSync.disconnect();

      // Notify content script
      if (this.tabId) {
        chrome.tabs.sendMessage(this.tabId, { type: 'SESSION_STOPPED' });
      }

      sendResponse({ success: true, cancelled: true });

    } catch (error) {
      console.error('[Background] Cancel session error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Pause session - saves state for later resume (no credit deduction)
  async pauseSession(data, sendResponse) {
    console.log('[Background] pauseSession called, data:', data);

    try {
      // 1. Stop capturing first
      if (this.mockTranscriptionInterval) {
        clearInterval(this.mockTranscriptionInterval);
        this.mockTranscriptionInterval = null;
      }

      try {
        await this.stopRealAudioCapture();
      } catch (audioError) {
        console.log('[Background] Audio stop error (non-fatal):', audioError.message);
      }

      // 2. Hide overlay immediately (User Feedback)
      console.log('[Background] Sending SESSION_PAUSED to tab:', this.tabId);
      if (this.tabId) {
        chrome.tabs.sendMessage(this.tabId, { type: 'SESSION_PAUSED' }).catch(err => {
          console.log('[Background] Failed to send SESSION_PAUSED (non-fatal):', err.message);
        });
      }

      // 3. Capture partial state needed for resume BEFORE clearing it
      const elapsedTime = this.state.data.activeSession?.startTime
        ? Date.now() - this.state.data.activeSession.startTime
        : 0;
      const sessionId = this.state.data.activeSession?.id;
      const activeSessionData = this.state.data.activeSession;

      // 4. Mark session as inactive in memory IMMEDIATELY to prevent "zombie" state
      this.sessionActive = false;
      this.state.data.activeSession = null;
      this.transcriptionBuffer = [];
      this.screenshotQueue = [];

      // 5. Try to save paused state (Best Effort)
      if (sessionId && activeSessionData) {
        const pausedState = {
          elapsed_time: elapsedTime,
          interview_context: activeSessionData.interviewContext || {},
          meeting_data: {
            url: activeSessionData.url,
            platform: activeSessionData.platform,
            tabId: this.tabId
          },
          transcription_text: this.transcriptionManager?.getText() || '',
          paused_at: Date.now()
        };

        const savedSessionInfo = {
          id: sessionId,
          url: activeSessionData.url,
          interviewContext: activeSessionData.interviewContext,
          consoleToken: this.state.data.consoleToken,
          elapsedTime: elapsedTime
        };

        // DB Sync
        try {
          const result = await supabaseREST.rpc('pause_session', {
            p_session_id: sessionId,
            p_state: pausedState
          });
          if (!result?.success) {
            await supabaseREST.update('interview_sessions',
              { status: 'paused', paused_at: new Date().toISOString(), paused_state: pausedState },
              { id: sessionId }
            );
          }
        } catch (dbError) {
          console.error('[Background] DB pause error (non-fatal):', dbError);
        }

        // Local Storage Sync (Resume Data)
        try {
          await chrome.storage.local.set({
            pausedSession: savedSessionInfo,
            pausedSessionId: sessionId
          });
        } catch (storageError) {
          console.error('[Background] Failed to save resume data (non-fatal):', storageError);
        }
      }

      // 6. Persist cleared state (Critical)
      await this.state.save();

      // 7. Cleanup console
      if (this.consoleTranscriptTimeout) {
        clearTimeout(this.consoleTranscriptTimeout);
        this.consoleTranscriptTimeout = null;
      }

      try {
        await this.consoleSync.disconnect();
      } catch (e) { /* ignore */ }

      console.log('[Background] Pause session complete');
      if (sendResponse) {
        sendResponse({
          success: true,
          paused: true,
          sessionId: sessionId,
          elapsedTime: elapsedTime
        });
      }

    } catch (error) {
      console.error('[Background] Pause session CRITICAL error:', error);
      // Even if critical error, ensure we are marked inactive
      this.sessionActive = false;
      this.state.data.activeSession = null;
      await this.state.save().catch(() => { });

      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    }
  }

  // Resume a paused session - restores state and reconnects
  async resumeSession(data, sendResponse) {
    try {
      const sessionId = data?.sessionId;

      if (!sessionId) {
        if (sendResponse) sendResponse({ success: false, error: 'No session ID provided' });
        return;
      }

      console.log('[Background] Resuming session:', sessionId);

      // Get active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab) {
        if (sendResponse) sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      this.tabId = activeTab.id;

      // CRITICAL: Check if we are on a restricted page (like chrome://extensions)
      if (activeTab.url.startsWith('chrome:') || activeTab.url.startsWith('edge:') || activeTab.url.startsWith('about:') || activeTab.url.startsWith('file:') || activeTab.url.startsWith('chrome-extension:')) {
        console.warn('[Background] Resume attempted on restricted URL:', activeTab.url);

        // Try to find the original meeting tab if we know the URL
        const savedUrl = this.state.data.activeSession?.url || data?.meetingUrl;
        if (savedUrl && savedUrl !== 'unknown') {
          console.log('[Background] Searching for original meeting tab:', savedUrl);
          const matchedTabs = await chrome.tabs.query({});
          // Simple fuzzy match or exact match
          const found = matchedTabs.find(t => t.url.includes(savedUrl) || (savedUrl.includes(t.url) && t.url.length > 20));

          if (found) {
            console.log('[Background] Found original tab:', found.id);
            this.tabId = found.id;
            // Ideally we shouldn't switch focus, just attach to it
          } else {
            console.warn('[Background] Original tab not found. Aborting capture resume (Session stays active in background)');
            // We resume state but NOT capture/overlay
            // But valid resume means setting this.sessionActive = true
          }
        }
      }

      // Fetch session from database
      let sessionData = null;
      let pausedState = null;
      let consoleToken = null;

      try {
        const result = await supabaseREST.rpc('resume_session', {
          p_session_id: sessionId
        });

        if (result.success) {
          pausedState = result.paused_state;
          consoleToken = result.console_token;
          console.log('[Background] Session resumed via RPC, paused_state:', pausedState);
        } else {
          // If RPC fails, try fetching directly
          const sessions = await supabaseREST.select('interview_sessions', `id=eq.${sessionId}`);
          if (sessions && sessions.length > 0) {
            sessionData = sessions[0];
            pausedState = sessionData.paused_state;
            consoleToken = sessionData.console_token;

            // Update status to active
            await supabaseREST.update('interview_sessions',
              { status: 'active', updated_at: new Date().toISOString() },
              { id: sessionId }
            );
          }
        }
      } catch (dbError) {
        console.error('[Background] Failed to resume from DB:', dbError);
        // Try to get from local storage
        const stored = await chrome.storage.local.get(['pausedSession']);
        if (stored.pausedSession && stored.pausedSession.id === sessionId) {
          pausedState = {
            elapsed_time: stored.pausedSession.elapsedTime,
            interview_context: stored.pausedSession.interviewContext
          };
          consoleToken = stored.pausedSession.consoleToken;
        }
      }

      // Calculate new start time based on elapsed time at pause
      const elapsedTime = pausedState?.elapsed_time || 0;
      const adjustedStartTime = Date.now() - elapsedTime;

      // Restore session state
      this.sessionActive = true;
      this.state.data.activeSession = {
        id: sessionId,
        tabId: this.tabId,
        startTime: adjustedStartTime, // Adjusted so timer continues from where it was
        url: pausedState?.meeting_data?.url || data?.meetingUrl || activeTab.url,
        platform: pausedState?.meeting_data?.platform || this.detectPlatform(activeTab.url),
        interviewContext: pausedState?.interview_context || data?.interviewContext || {},
        resumed: true,
        resumedAt: Date.now()
      };

      // Restore interview context
      if (pausedState?.interview_context) {
        this.interviewContext.setMeta(pausedState.interview_context);
      }

      // Pre-warm AI config
      this.aiService.warmup();

      this.state.data.consoleToken = consoleToken;
      await this.state.save();

      // Reconnect console sync
      if (consoleToken) {
        await this.consoleSync.connect(consoleToken, sessionId);

        // Send heartbeat
        await this.consoleSync.send({
          type: 'SESSION_ACTIVE',
          data: {
            sessionId: sessionId,
            timestamp: Date.now(),
            resumed: true,
            interviewContext: pausedState?.interview_context || {}
          }
        });
      }

      // Start audio capture
      // Start audio capture ONLY if we have a valid, non-restricted tabId
      const isRestricted = (url) => url && (url.startsWith('chrome:') || url.startsWith('edge:') || url.startsWith('about:') || url.startsWith('file:') || url.startsWith('chrome-extension:'));

      let targetTab = null;
      try {
        targetTab = await chrome.tabs.get(this.tabId);
      } catch (e) { /* ignore */ }

      if (targetTab && !isRestricted(targetTab.url)) {
        try {
          await this.startRealAudioCapture(this.tabId);
          console.log('[Background] Real audio capture resumed');
        } catch (error) {
          console.error('[Background] Audio capture failed on resume:', error.message);
        }

        // Notify content script to show overlay with resumed state
        await this.notifyContentScriptResume(this.tabId, {
          sessionId: sessionId,
          elapsedTime: elapsedTime,
          transcriptionText: pausedState?.transcription_text || ''
        });
      } else {
        console.log('[Background] Skipping capture/overlay resume - Target tab is restricted or missing');
      }

      // Clear paused session from storage
      await chrome.storage.local.remove(['pausedSession', 'pausedSessionId']);

      if (sendResponse) {
        sendResponse({
          success: true,
          resumed: true,
          sessionId: sessionId,
          consoleToken: consoleToken,
          elapsedTime: elapsedTime
        });
      }

    } catch (error) {
      console.error('[Background] Resume session error:', error);
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  }

  // Helper to notify content script about resumed session
  async notifyContentScriptResume(tabId, data) {
    // Try to send message first
    let contentScriptReady = false;
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      contentScriptReady = true;
    } catch (err) {
      console.log('[Background] Content script not loaded for resume, will inject');
    }

    // Inject if needed
    if (!contentScriptReady) {
      try {
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content-styles.css']
        });
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-script.js']
        });
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('[Background] Failed to inject for resume:', error.message);
        return;
      }
    }

    // Send resume message
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SESSION_RESUMED',
        data: data
      });
      console.log('[Background] Content script notified of resume');
    } catch (err) {
      console.error('[Background] Failed to send resume message:', err.message);
    }
  }

  async requestHint(data, sendResponse) {
    if (!this.sessionActive) {
      if (sendResponse) sendResponse({ error: 'No active session' });
      return;
    }

    // Debounce: Prevent multiple requests within 2 seconds
    const now = Date.now();
    if (this.lastHintRequestTime && now - this.lastHintRequestTime < 2000) {
      console.log('[Background] Debouncing hint request - too soon after last request');
      if (sendResponse) sendResponse({ error: 'Please wait before requesting another hint' });
      return;
    }
    this.lastHintRequestTime = now;

    // Prevent concurrent requests
    if (this.hintRequestPending) {
      console.log('[Background] Hint request already pending');
      if (sendResponse) sendResponse({ error: 'Request already in progress' });
      return;
    }
    this.hintRequestPending = true;

    try {
      // CAPTURE SCREEN CONTEXT IF AVAILABLE
      // If screen sharing is active (e.g. during live coding), capture the current frame
      // to provide visual context to the AI (Code/Explain/Answer)
      let screenContext = null;

      if (this.isScreenSharing) {
        console.log('[Background] Screen share active, capturing frame for AI context...');
        try {
          // Ask offscreen document to capture a frame from the stream
          const frameResult = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREEN_FRAME' });

          if (frameResult && frameResult.success && frameResult.data) {
            console.log('[Background] Captured screen frame for context');
            screenContext = {
              data: frameResult.data,
              width: frameResult.width,
              height: frameResult.height,
              timestamp: Date.now()
            };
          }
        } catch (err) {
          console.error('[Background] Failed to capture screen frame:', err);
        }
      }
      // Fetch fresh credits from Supabase before checking
      try {
        const creditsResult = await supabaseREST.getCredits();
        if (creditsResult.success) {
          this.state.data.credits = creditsResult.balance;
          console.log('[Background] Fresh credits from DB:', creditsResult.balance);
        } else {
          console.warn('[Background] Could not fetch credits, using cached:', this.state.data.credits);
        }
      } catch (creditError) {
        console.warn('[Background] Credit fetch error, using cached:', creditError.message);
      }

      // Check credits (now using potentially refreshed value)
      if (this.state.data.credits <= 0) {
        throw new Error('No credits remaining');
      }

      // If screen sharing is active, capture a screenshot first
      let currentScreenshot = null;
      if (this.screenSharingActive) {
        try {
          console.log('[Background] Capturing screenshot from screen share...');
          const screenshotResponse = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
          if (screenshotResponse?.success && screenshotResponse.screenshot) {
            currentScreenshot = screenshotResponse.screenshot;
            console.log('[Background] Screenshot captured, size:', Math.round(currentScreenshot.length / 1024), 'KB');
          }
        } catch (screenshotError) {
          console.warn('[Background] Could not capture screenshot:', screenshotError.message);
        }
      }

      // Prepare context
      const context = {
        transcripts: this.transcriptionBuffer.slice(-10), // Last 10 transcripts
        screenshots: currentScreenshot ? [currentScreenshot] : this.screenshotQueue.slice(),
        currentScreenshot: currentScreenshot, // Pass as separate field for AI
        language: this.state.data.settings.language,
        verbosity: this.state.data.settings.verbosity,
        userProfile: this.state.data.userProfile,
        requestType: data.requestType || 'hint',
        customPrompt: data.customPrompt || null,
        interviewContext: this.state.data.activeSession?.interviewContext || {},
        selectedScreenshotIds: data.selectedScreenshotIds || [],
        screenFrame: screenContext ? screenContext.data : null // Add captured frame to context
      };

      // Show loading state
      await this.updateOverlay({ loading: true, message: 'Thinking...' });
      await this.consoleSync.send({ type: 'HINT_LOADING' });

      // Request from AI service
      const response = await this.aiService.getHint(context);

      // Decrement credits
      this.state.data.credits--;
      await this.state.save();

      // Update overlay with response and type
      await this.updateOverlay({ loading: false, hint: response.hint, type: response.type });

      // Send to console
      await this.consoleSync.send({
        type: 'HINT_RECEIVED',
        data: response
      });

      if (sendResponse) {
        sendResponse({ success: true, hint: response.hint, credits: this.state.data.credits });
      }

    } catch (error) {
      console.error('[Background] Request hint error:', error);
      await this.updateOverlay({ loading: false, error: error.message });
      await this.consoleSync.send({ type: 'HINT_ERROR', error: error.message });

      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    } finally {
      // Clear pending flag so next request can proceed
      this.hintRequestPending = false;
    }
  }

  async notifyContentScript(tabId) {
    // Content script is auto-injected via manifest.json for meeting platforms
    // But we need to manually inject for other URLs (like YouTube, testing pages, etc.)
    console.log('[Background] Notifying content script on tab:', tabId);

    // Try to send message first
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      console.log('[Background] Content script already active');
    } catch (err) {
      console.log('[Background] Content script not responding, injecting...');
      try {
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content-styles.css']
        });
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['lib/html2canvas.js', 'content-script.js']
        });
        // Give it a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.error('[Background] Injection failed:', e);
      }
    }

    // Now send the start message
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'SESSION_STARTED',
        data: {
          sessionId: this.state.data.activeSession.id
        }
      });
    } catch (e) {
      console.error('[Background] Failed to send START message:', e);
    }
  }

  // Handle screenshot captured by content script
  async handleScreenshotCaptured(data, sendResponse) {
    console.log('[Background] Received screenshot from content script');

    try {
      if (!data.imageData) throw new Error('No image data received');

      const sessionId = this.state.data.activeSession?.id;
      if (!sessionId) throw new Error('No active session');

      // Save to Supabase with correct parameter signature
      const result = await supabaseREST.rpc('add_session_screenshot', {
        p_session_id: sessionId,
        p_image_url: data.imageData,
        p_capture_method: data.captureMethod || 'dom',
        p_platform_detected: data.platform || null,
        p_element_selector: data.elementSelector || null,
        p_width: data.width || null,
        p_height: data.height || null,
        p_size_bytes: data.sizeBytes || null,
        p_extracted_text: data.extractedText || '',
        p_code_text: data.codeText || '',
        p_metadata: {
          url: data.url,
          title: data.title
        }
      });

      if (result?.error) throw new Error(result.error);

      console.log('[Background] Screenshot saved to DB:', result?.screenshot_id);

      const screenshotData = {
        id: result?.screenshot_id,
        image_url: data.imageData,
        display_order: result?.display_order,
        capture_method: data.captureMethod || 'dom'
      };

      // Notify console (LiveConsolePage) via Supabase sync
      await this.consoleSync.send({
        type: 'SCREENSHOT_ADDED',
        data: screenshotData
      });

      // Notify content script (overlay) directly
      if (this.tabId) {
        try {
          await chrome.tabs.sendMessage(this.tabId, {
            type: 'SCREENSHOT_ADDED',
            data: screenshotData
          });
        } catch (e) {
          console.log('[Background] Content script not available for screenshot notification');
        }
      }

      if (sendResponse) sendResponse({ success: true, screenshot_id: result?.screenshot_id });
    } catch (err) {
      console.error('[Background] Failed to save screenshot:', err);
      if (sendResponse) sendResponse({ success: false, error: err.message });
    }
  }

  async takeScreenshot(data, sendResponse) {
    if (!this.sessionActive) {
      if (sendResponse) sendResponse({ success: false, error: 'No active session' });
      return;
    }

    try {
      let dataUrl;
      let captureMethod = 'native';

      // Check if Live Coding mode is enabled or if existing screen share
      const sessionContext = this.state.data.activeSession?.interviewContext || {};
      const isLiveCodingMode = sessionContext.isLiveCoding === true;

      // UNIFIED LOGIC: Always try to capture the meeting tab first (most reliable)
      // Screen share is only used as fallback if meeting tab capture fails
      if (this.tabId) {
        console.log('[Background] Taking screenshot via captureVisibleTab on meeting tab:', this.tabId);

        try {
          // Get meeting tab info
          const meetingTab = await chrome.tabs.get(this.tabId);
          const meetingWindowId = meetingTab.windowId;

          // HIDE OVERLAY on meeting tab before capture
          try {
            await chrome.tabs.sendMessage(this.tabId, { type: 'HIDE_OVERLAY_FOR_CAPTURE' });
            await new Promise(resolve => setTimeout(resolve, 150));
          } catch (e) {
            console.log('[Background] Could not hide overlay on meeting tab');
          }

          // Capture the meeting tab's window
          dataUrl = await chrome.tabs.captureVisibleTab(meetingWindowId, { format: 'png' });
          captureMethod = 'native';

          // SHOW OVERLAY after capture
          try {
            await chrome.tabs.sendMessage(this.tabId, { type: 'SHOW_OVERLAY_AFTER_CAPTURE' });
          } catch (e) {
            console.log('[Background] Could not show overlay on meeting tab');
          }

          console.log('[Background] Meeting tab captured successfully');
        } catch (tabErr) {
          console.error('[Background] Failed to capture meeting tab:', tabErr.message);

          // Fallback to screen share if available
          if (this.isScreenSharing) {
            console.log('[Background] Falling back to screen frame capture...');
            try {
              const frameResult = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREEN_FRAME' });
              if (frameResult?.success && frameResult.data) {
                dataUrl = frameResult.data;
                captureMethod = 'screen';
                console.log('[Background] Screen frame captured as fallback:', frameResult.width, 'x', frameResult.height);
              }
            } catch (screenErr) {
              console.error('[Background] Screen frame fallback also failed:', screenErr.message);
            }
          }
        }
      }
      // No meeting tab available - try screen share only
      else if (this.isScreenSharing) {
        console.log('[Background] No meeting tab, using screen frame capture...');

        const frameResult = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREEN_FRAME' });

        if (frameResult && frameResult.success && frameResult.data) {
          dataUrl = frameResult.data;
          captureMethod = 'screen';
          console.log('[Background] Screen frame captured:', frameResult.width, 'x', frameResult.height);
        } else {
          throw new Error('Screen frame capture failed: ' + (frameResult?.error || 'Unknown error'));
        }
      } else {
        // No tab and no screen share
        if (sendResponse) sendResponse({ success: false, error: 'No tab or screen share available for capture.' });
        return;
      }

      if (!dataUrl) {
        throw new Error('Screenshot capture returned empty result');
      }

      console.log('[Background] Screenshot captured (' + captureMethod + '), size:', dataUrl.length);

      // Get tab info for metadata (may not exist if using screen capture without tab)
      let tabUrl = '';
      let tabTitle = '';
      try {
        if (this.tabId) {
          const tab = await chrome.tabs.get(this.tabId);
          tabUrl = tab.url;
          tabTitle = tab.title;
        }
      } catch (e) {
        // Tab may not exist
      }

      // Save to Supabase
      const sessionId = this.state.data.activeSession?.id;
      if (sessionId) {
        const result = await supabaseREST.rpc('add_session_screenshot', {
          p_session_id: sessionId,
          p_image_url: dataUrl,
          p_capture_method: captureMethod,
          p_platform_detected: this.state.data.activeSession?.platform || null,
          p_element_selector: null,
          p_width: null,
          p_height: null,
          p_size_bytes: Math.round((dataUrl.length * 3) / 4),
          p_extracted_text: data?.extractedText || '',
          p_code_text: '',
          p_metadata: {
            url: data?.url || tabUrl,
            title: data?.title || tabTitle
          }
        });

        if (result?.error) {
          console.error('[Background] Failed to save screenshot:', result.error);
        } else {
          console.log('[Background] Screenshot saved to DB:', result?.screenshot_id);

          const screenshotData = {
            id: result?.screenshot_id,
            image_url: dataUrl,
            display_order: result?.display_order,
            capture_method: captureMethod
          };

          // Notify console
          await this.consoleSync.send({ type: 'SCREENSHOT_ADDED', data: screenshotData });

          // Notify overlay
          if (this.tabId) {
            try {
              await chrome.tabs.sendMessage(this.tabId, { type: 'SCREENSHOT_ADDED', data: screenshotData });
            } catch (e) {
              console.log('[Background] Content script not available for screenshot notification');
            }
          }
        }
      }

      if (sendResponse) sendResponse({ success: true, dataUrl });
    } catch (err) {
      console.error('[Background] Native screenshot failed:', err.message);
      if (sendResponse) sendResponse({ success: false, error: err.message });
    }
  }

  async deleteScreenshot(data, sendResponse) {
    const screenshotId = data?.screenshotId;
    if (!screenshotId) {
      if (sendResponse) sendResponse({ success: false, error: 'No screenshot ID provided' });
      return;
    }

    console.log('[Background] Deleting screenshot:', screenshotId);

    try {
      // Delete from Supabase
      const { error } = await supabaseREST.rpc('delete_session_screenshot', {
        p_screenshot_id: screenshotId
      });

      if (error) {
        console.error('[Background] Failed to delete screenshot from DB:', error);
      }

      // Notify overlay
      if (this.tabId) {
        try {
          await chrome.tabs.sendMessage(this.tabId, {
            type: 'SCREENSHOT_DELETED',
            data: { screenshotId }
          });
        } catch (e) {
          console.log('[Background] Could not notify overlay about deletion');
        }
      }

      // Notify console
      await this.consoleSync.send({
        type: 'SCREENSHOT_DELETED',
        data: { screenshotId }
      });

      if (sendResponse) sendResponse({ success: true });
    } catch (err) {
      console.error('[Background] Delete screenshot error:', err);
      if (sendResponse) sendResponse({ success: false, error: err.message });
    }
  }

  async clearScreenshots(sendResponse) {
    const sessionId = this.state.data.activeSession?.id;
    if (!sessionId) {
      if (sendResponse) sendResponse({ success: false, error: 'No active session' });
      return;
    }

    console.log('[Background] Clearing all screenshots for session:', sessionId);

    try {
      // Clear from Supabase
      const { error } = await supabaseREST.rpc('clear_session_screenshots', {
        p_session_id: sessionId
      });

      if (error) {
        console.error('[Background] Failed to clear screenshots from DB:', error);
      }

      // Notify overlay
      if (this.tabId) {
        try {
          await chrome.tabs.sendMessage(this.tabId, { type: 'SCREENSHOTS_CLEARED' });
        } catch (e) {
          console.log('[Background] Could not notify overlay about clear');
        }
      }

      // Notify console
      await this.consoleSync.send({ type: 'SCREENSHOTS_CLEARED' });

      if (sendResponse) sendResponse({ success: true });
    } catch (err) {
      console.error('[Background] Clear screenshots error:', err);
      if (sendResponse) sendResponse({ success: false, error: err.message });
    }
  }

  async toggleMode(data, sendResponse) {
    this.state.data.settings.mode = data.mode;
    await this.state.save();

    // Notify content script
    if (this.tabId) {
      chrome.tabs.sendMessage(this.tabId, {
        type: 'MODE_CHANGED',
        mode: data.mode
      });
    }

    sendResponse({ success: true, mode: data.mode });
  }

  async updateSettings(data, sendResponse) {
    this.state.data.settings = { ...this.state.data.settings, ...data };
    await this.state.save();
    sendResponse({ success: true });
  }

  async connectConsole(data, sender, sendResponse) {
    try {
      const safeData = data || {};
      const token = safeData.token || this.generateConsoleToken();
      this.state.data.consoleToken = token;

      await this.state.save();

      if (this.sessionActive) {
        await this.consoleSync.connect(token, this.state.data.activeSession.id);
      }

      sendResponse({ success: true, token });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  onTranscription(transcript) {
    console.log('[Background] Transcription:', transcript.text, 'isFinal:', transcript.isFinal);

    // Process through TranscriptionManager (single source of truth, append-only)
    const state = this.transcriptionManager.processResult(
      transcript.text,
      transcript.isFinal,
      transcript.confidence
    );

    // Store entry for buffer (for AI context)
    const transcriptEntry = {
      id: Date.now(),
      text: transcript.text,
      timestamp: Date.now(),
      confidence: transcript.confidence,
      isFinal: transcript.isFinal
    };
    this.transcriptionBuffer.push(transcriptEntry);

    // Feed to InterviewContextManager for rolling 90-second context window
    this.interviewContext.addTranscript(
      transcript.text,
      Date.now(),
      transcript.isFinal
    );

    // Auto-trigger in auto mode (only on final results)
    if (transcript.isFinal && this.state.data.settings.mode === 'auto') {
      this.checkAutoTrigger(transcript.text);
    }

    // OVERLAY: Send full transcription state IMMEDIATELY (no debounce for smooth display)
    // Use this.tabId (set at session start) as primary, fallback to activeSession.tabId
    const tabId = this.tabId || this.state.data.activeSession?.tabId;
    console.log('[Background] Sending transcription to tab:', tabId);

    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'TRANSCRIPTION_STATE',
        data: {
          finalizedText: state.finalizedText,
          interimText: state.interimText,
          displayText: state.displayText,
          isFinal: transcript.isFinal,
          hasInterim: state.hasInterim
        }
      }).catch(err => {
        console.log('[Background] Could not send transcription state to content script:', err.message);
      });
    } else {
      console.warn('[Background] No tabId available for overlay - cannot send transcription');
    }

    // NOTE: Overlay is now a direct DOM element in content-script.js (not an iframe)
    // The chrome.tabs.sendMessage above is the correct way to communicate with it

    // CONSOLE: Send finalized text only, with shorter debounce (500ms instead of 1500ms)
    // This provides smoother console updates while still being efficient
    if (transcript.isFinal) {
      // Clear existing timer and set new one
      if (this.consoleTranscriptTimeout) {
        clearTimeout(this.consoleTranscriptTimeout);
      }

      this.consoleTranscriptTimeout = setTimeout(() => {
        this.consoleSync.send({
          type: 'TRANSCRIPTION_STATE',
          data: {
            finalizedText: state.finalizedText,
            interimText: '',
            text: transcript.text,
            confidence: transcript.confidence,
            isFinal: true
          }
        });
      }, 200); // 200ms debounce for console (reduced from 500ms)
    }

    // Save to storage for fallback polling
    this.saveTranscriptToStorage({
      ...transcriptEntry,
      finalizedText: state.finalizedText,
      interimText: state.interimText
    });
  }

  // Save transcript to chrome.storage.local as fallback delivery mechanism
  // Primary delivery is via postMessage through content script to overlay iframe
  async saveTranscriptToStorage(transcriptEntry) {
    try {
      const { overlayTranscripts = [] } = await chrome.storage.local.get('overlayTranscripts');

      // Add new transcript
      overlayTranscripts.push(transcriptEntry);

      // Keep only last 50 transcripts
      const trimmed = overlayTranscripts.slice(-50);

      await chrome.storage.local.set({
        overlayTranscripts: trimmed,
        lastTranscriptTime: Date.now()
      });

      console.log('[Background] Saved transcript to storage, total:', trimmed.length);
    } catch (error) {
      console.error('[Background] Error saving transcript to storage:', error);
    }
  }

  // Broadcast a message to all extension pages (overlay, popup, etc.)
  async broadcastToExtensionPages(message) {
    try {
      // Get all extension views/contexts
      const views = chrome.extension?.getViews ? chrome.extension.getViews() : [];

      // Send to all views using runtime messaging
      // This will reach any extension page with a message listener
      chrome.runtime.sendMessage(message).catch(err => {
        // This error is expected if no listeners are registered
        console.log('[Background] No extension listeners for broadcast:', err.message);
      });

      console.log('[Background] Broadcast message:', message.type);
    } catch (error) {
      console.log('[Background] Broadcast error:', error.message);
    }
  }

  async sendToOverlay(message) {
    if (!this.tabId) {
      console.log('[Background] sendToOverlay: No tabId');
      return;
    }

    try {
      // Send directly to content script (overlay is a direct DOM element, not iframe)
      await chrome.tabs.sendMessage(this.tabId, message);
      console.log('[Background] Sent to overlay:', message.type);
    } catch (error) {
      console.log('[Background] Could not send to overlay:', error.message);
    }
  }

  checkAutoTrigger(text) {
    // Detect question patterns
    const questionPatterns = [
      /can you/i,
      /how would you/i,
      /tell me about/i,
      /what is/i,
      /explain/i,
      /describe/i,
      /why do you/i
    ];

    const isQuestion = questionPatterns.some(pattern => pattern.test(text));

    if (isQuestion && !this.recentlyTriggered()) {
      this.requestHint({ trigger: 'auto', text });
    }
  }

  recentlyTriggered() {
    // Prevent triggering more than once per 30 seconds
    const lastTrigger = this.state.data.lastAutoTrigger || 0;
    return Date.now() - lastTrigger < 30000;
  }

  // NOTE: chrome.tabCapture.capture is not available in MV3 service workers
  // Audio capture would require an offscreen document approach in production
  // For demo/testing, we use mock transcription instead

  async injectOverlay(tabId) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['overlay.js']
    });
  }

  async updateOverlay(data) {
    // For hints, send HINT_RECEIVED message
    if (data.hint) {
      await this.sendToOverlay({
        type: 'HINT_RECEIVED',
        data: { hint: data.hint, type: data.type || 'help' }
      });
    } else if (data.error) {
      await this.sendToOverlay({
        type: 'HINT_RECEIVED',
        data: { hint: data.error, type: 'error' }
      });
    }
    // Loading states are handled by the overlay itself
  }

  async toggleOverlay() {
    if (this.tabId) {
      chrome.tabs.sendMessage(this.tabId, {
        type: 'TOGGLE_OVERLAY'
      });
    }
  }

  detectPlatform(url) {
    if (url.includes('meet.google.com')) return 'Google Meet';
    if (url.includes('zoom.us')) return 'Zoom';
    if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
    if (url.includes('webex.com')) return 'WebEx';
    if (url.includes('slack.com')) return 'Slack';
    if (url.includes('discord.com')) return 'Discord';
    return 'Web';
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateConsoleToken() {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  getSessionTime() {
    if (!this.state.data.activeSession) return 0;
    return Math.floor((Date.now() - this.state.data.activeSession.startTime) / 1000);
  }

  async handleAuthSync(msg, sendResponse) {
    try {
      console.log('[Background] Received AUTH_SYNC', msg.user?.id);

      // Ignore AUTH_SYNC if we just logged out
      if (this.ignoreAuthSync) {
        console.log('[Background] Ignoring AUTH_SYNC due to recent logout');
        sendResponse({ success: false, ignored: true });
        return;
      }

      if (msg.user && msg.token) {
        const updates = {
          user: msg.user,
          supabase_access_token: msg.token,
          supabase_refresh_token: msg.session?.refresh_token || null,
          supabase_token_expires: msg.session?.expires_at || null,
          isAuthenticated: true
        };

        await chrome.storage.local.set(updates);

        // Immediately update in-memory tokens in supabase-config.js
        setTokens(msg.token, msg.session?.refresh_token, msg.session?.expires_at);

        // Update local state if needed
        this.state.data.user = msg.user;

        // Fetch credits immediately to ensure UI is up to date
        try {
          const creditsResult = await supabaseREST.getCredits();
          if (creditsResult.success) {
            this.state.data.credits = creditsResult.balance;
            await chrome.storage.local.set({ credits: creditsResult.balance });
            console.log('[Background] Credits fetched on auth sync:', creditsResult.balance);
          }
        } catch (err) {
          console.error('[Background] Failed to fetch credits on auth sync:', err);
        }

        console.log('[Background] Auth synced and stored');
        sendResponse({ success: true });
      } else {
        console.warn('[Background] Invalid auth sync data');
        sendResponse({ success: false, error: 'Invalid auth data' });
      }
    } catch (e) {
      console.error('[Background] Auth sync error:', e);
      sendResponse({ success: false, error: e.message });
    }
  }

  // NOTE: Full pauseSession() and resumeSession() 

  // ==========================================
  // Screen Share Control (for live coding fallback)
  // ==========================================

  async startScreenShare(streamId = null, sendResponse) {
    try {
      // Focus the meeting tab first so the dialog appears on the correct window
      if (this.tabId) {
        try {
          const tab = await chrome.tabs.get(this.tabId);
          // Focus the window containing the meeting tab
          await chrome.windows.update(tab.windowId, { focused: true });
          // Activate the meeting tab
          await chrome.tabs.update(this.tabId, { active: true });
          console.log('[Background] Focused meeting tab before screen share dialog');
          // Small delay to ensure tab is active
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.log('[Background] Could not focus meeting tab:', e.message);
        }
      }

      // Ensure offscreen document exists
      await this.createOffscreenDocument();

      // Request screen capture from offscreen (pass streamId if available)
      const result = await chrome.runtime.sendMessage({
        type: 'START_SCREEN_CAPTURE',
        streamId: streamId
      });

      if (result.success) {
        this.isScreenSharing = true;
        console.log('[Background] Screen share started:', result.width, 'x', result.height);

        // Notify console
        await this.consoleSync.send({
          type: 'SCREEN_SHARE_STATUS',
          data: { active: true, width: result.width, height: result.height }
        });
      }

      if (sendResponse) sendResponse(result);
    } catch (error) {
      console.error('[Background] Start screen share error:', error);
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  }

  async stopScreenShare(sendResponse) {
    try {
      await chrome.runtime.sendMessage({ type: 'STOP_SCREEN_CAPTURE' });
      this.isScreenSharing = false;
      console.log('[Background] Screen share stopped');

      if (sendResponse) sendResponse({ success: true });
    } catch (error) {
      console.error('[Background] Stop screen share error:', error);
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  }

  // ==========================================
  // Screenshot Backend Sync (Supabase)
  // ==========================================

  async uploadScreenshot(data, sendResponse) {
    if (!this.sessionActive || !this.state.data.activeSession?.id) {
      if (sendResponse) sendResponse({ success: false, error: 'No active session' });
      return;
    }

    try {
      const sessionId = this.state.data.activeSession.id;
      const { imageData, captureMethod, platform, elementSelector, width, height, sizeBytes } = data;

      // Call Supabase RPC to add screenshot
      const result = await supabaseREST.rpc('add_session_screenshot', {
        p_session_id: sessionId,
        p_image_url: imageData,
        p_capture_method: captureMethod || 'dom',
        p_platform_detected: platform || null,
        p_element_selector: elementSelector || null,
        p_width: width || null,
        p_height: height || null,
        p_size_bytes: sizeBytes || null
      });

      if (result?.success) {
        console.log('[Background] Screenshot uploaded:', result.screenshot_id);

        const screenshotData = {
          id: result.screenshot_id,
          image_url: imageData, // The base64 data URL or uploaded URL
          display_order: result.display_order,
          capture_method: captureMethod
        };

        // Notify console of new screenshot
        await this.consoleSync.send({
          type: 'SCREENSHOT_ADDED',
          data: screenshotData
        });

        // Notify content script (overlay) of new screenshot
        if (this.tabId) {
          try {
            await chrome.tabs.sendMessage(this.tabId, {
              type: 'SCREENSHOT_ADDED',
              data: screenshotData
            });
          } catch (e) {
            console.log('[Background] Content script not available for screenshot notification');
          }
        }
      }

      if (sendResponse) sendResponse(result);
    } catch (error) {
      console.error('[Background] Upload screenshot error:', error);
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  }

  async getSessionScreenshots(sendResponse) {
    if (!this.sessionActive || !this.state.data.activeSession?.id) {
      if (sendResponse) sendResponse({ success: false, error: 'No active session', screenshots: [] });
      return;
    }

    try {
      const sessionId = this.state.data.activeSession.id;
      const result = await supabaseREST.rpc('get_session_screenshots', {
        p_session_id: sessionId
      });

      if (sendResponse) sendResponse(result);
    } catch (error) {
      console.error('[Background] Get screenshots error:', error);
      if (sendResponse) sendResponse({ success: false, error: error.message, screenshots: [] });
    }
  }

  async clearScreenshots(sendResponse) {
    if (!this.sessionActive || !this.state.data.activeSession?.id) {
      if (sendResponse) sendResponse({ success: false, error: 'No active session' });
      return;
    }

    try {
      const sessionId = this.state.data.activeSession.id;
      const result = await supabaseREST.rpc('clear_session_screenshots', {
        p_session_id: sessionId
      });

      if (result?.success) {
        console.log('[Background] Screenshots cleared:', result.deleted_count);

        // Notify console
        await this.consoleSync.send({
          type: 'SCREENSHOTS_CLEARED',
          data: { deletedCount: result.deleted_count }
        });

        // Notify content script (overlay)
        if (this.tabId) {
          try {
            await chrome.tabs.sendMessage(this.tabId, {
              type: 'SCREENSHOTS_CLEARED',
              data: { deletedCount: result.deleted_count }
            });
          } catch (e) {
            console.log('[Background] Content script not available for clear notification');
          }
        }
      }

      if (sendResponse) sendResponse(result);
    } catch (error) {
      console.error('[Background] Clear screenshots error:', error);
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  }

  async updateScreenshotMetadata(data, sendResponse) {
    try {
      const { screenshotId, displayOrder, isMarkedImportant, isSelectedForAi } = data;

      const result = await supabaseREST.rpc('update_screenshot_metadata', {
        p_screenshot_id: screenshotId,
        p_display_order: displayOrder ?? null,
        p_is_marked_important: isMarkedImportant ?? null,
        p_is_selected_for_ai: isSelectedForAi ?? null
      });

      if (sendResponse) sendResponse(result);
    } catch (error) {
      console.error('[Background] Update screenshot error:', error);
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  }

  async deleteScreenshot(data, sendResponse) {
    try {
      const { screenshotId } = data;

      const result = await supabaseREST.rpc('delete_session_screenshot', {
        p_screenshot_id: screenshotId
      });

      if (result?.success) {
        // Notify console
        await this.consoleSync.send({
          type: 'SCREENSHOT_DELETED',
          data: { screenshotId }
        });

        // Notify content script (overlay)
        if (this.tabId) {
          try {
            await chrome.tabs.sendMessage(this.tabId, {
              type: 'SCREENSHOT_DELETED',
              data: { screenshotId }
            });
          } catch (e) {
            console.log('[Background] Content script not available for delete notification');
          }
        }
      }

      if (sendResponse) sendResponse(result);
    } catch (error) {
      console.error('[Background] Delete screenshot error:', error);
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();

console.log('[Background] Service worker initialized');