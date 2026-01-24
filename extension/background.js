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
    console.log('[Background] Service worker initializing. State loaded:', {
      hasActiveSession: !!this.state.data.activeSession,
      activeSessionId: this.state.data.activeSession?.id,
      hasUser: !!this.state.data.user,
      credits: this.state.data.credits
    });

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
      console.log('[Background] Auto-resuming session from state:', this.state.data.activeSession.id);
      await this.resumeSession({ sessionId: this.state.data.activeSession.id });
      console.log('[Background] After auto-resume: sessionActive =', this.sessionActive);
    } else {
      console.log('[Background] No active session to restore');
    }

    // Ensure Deepgram key is available
    chrome.storage.local.get(['deepgram_api_key'], (result) => {
      if (!result.deepgram_api_key) {
        // Set default if missing (TEMPORARY: In prod should force user to set it)
        chrome.storage.local.set({ deepgram_api_key: '5e2e3945f5f5e171dbdc62bb3d06cd3f6a088266' });
      }
    });

    // Listen for remote console commands (Supabase)
    this.consoleSync.onMessage(async (msg) => {
      console.log('[Background] Received remote console command:', msg.type, 'Data:', JSON.stringify(msg.data));
      console.log('[Background] Current state - sessionActive:', this.sessionActive, 'consoleSync.connected:', this.consoleSync.connected);

      // AUTO-RESTORE SESSION: If we receive a console command but sessionActive is false,
      // try to restore the session from the database. This handles the case where:
      // 1. The extension's service worker restarted
      // 2. The console found a session in the database but the extension didn't restore it
      if (!this.sessionActive && this.consoleSync.sessionId) {
        console.log('[Background] Session not active, attempting auto-restore for sessionId:', this.consoleSync.sessionId);
        try {
          await this.restoreSessionFromConsole(this.consoleSync.sessionId);
        } catch (err) {
          console.error('[Background] Failed to auto-restore session:', err.message);
        }
      }

      switch (msg.type) {
        case 'REQUEST_HINT':
          console.log('[Background] Processing REQUEST_HINT from console, requestType:', msg.data?.requestType, 'sessionActive:', this.sessionActive);
          if (!this.sessionActive) {
            console.error('[Background] CRITICAL: Console request received but sessionActive is still false after restore attempt!');
            // Send error to console so user gets feedback
            await this.consoleSync.send({
              type: 'HINT_ERROR',
              data: { error: 'Session not active. Please refresh the meeting tab or restart the session.' }
            });
            return;
          }
          this.requestHint({ ...msg.data, trigger: msg.data?.trigger || 'manual' });
          break;
        case 'TAKE_SCREENSHOT':
          if (!this.sessionActive) {
            console.warn('[Background] TAKE_SCREENSHOT called but no active session');
            this.consoleSync.send({
              type: 'SCREENSHOT_ERROR',
              data: { error: 'No active session in extension. Please reconnect the meeting.' }
            });
            return;
          }
          this.takeScreenshot({ trigger: msg.data?.trigger || 'console' });
          break;
        case 'CLEAR_SCREENSHOTS':
          // Clear screenshots and notify overlay (triggered from console)
          this.clearScreenshots(() => { });
          break;
        case 'TOGGLE_SCREENSHOT_SELECTION':
          // Forward selection change to the overlay content script
          if (this.tabId && msg.data) {
            chrome.tabs.sendMessage(this.tabId, {
              type: 'SCREENSHOT_SELECTION_UPDATED',
              data: msg.data
            }).catch(() => { });
          }
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

      case 'REGISTER_MEETING_TAB':
        if (sender.tab && sender.tab.id) {
          this.meetingTabId = sender.tab.id;
          // Also update generic tabId if not set or if we trust this more
          if (!this.tabId) this.tabId = sender.tab.id;
          console.log('[Background] Registered meeting tab:', this.meetingTabId);
        }
        sendResponse({ success: true });
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

      case 'REGISTER_MEETING_TAB':
        if (sender.tab && sender.tab.id) {
          this.meetingTabId = sender.tab.id;
          if (!this.tabId) this.tabId = sender.tab.id;
          console.log('[Background] Registered meeting tab:', this.meetingTabId);
        }
        sendResponse({ success: true });
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

      case 'TOGGLE_SCREENSHOT_SELECTION':
        // Broadcast selection change to console and active tab
        await this.consoleSync.send({
          type: 'SCREENSHOT_SELECTION_UPDATED',
          data: msg.data
        });
        if (this.tabId) {
          chrome.tabs.sendMessage(this.tabId, {
            type: 'SCREENSHOT_SELECTION_UPDATED',
            data: msg.data
          }).catch(() => { });
        }
        sendResponse({ success: true });
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
            isFinal: msg.data.isFinal,
            source: msg.data.source || 'tab' // 'mic' or 'tab'
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

          // Deactivate any previous active sessions for this user
          // This prevents the console from finding old sessions while the extension uses a new one
          try {
            await supabaseREST.update('interview_sessions', 
              { status: 'cancelled', ended_at: new Date().toISOString() },
              { user_id: this.state.data.user.id, status: 'active' }
            );
            console.log('[Background] Deactivated any previous active sessions');
          } catch (deactivateError) {
            console.warn('[Background] Could not deactivate old sessions:', deactivateError.message);
          }

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

      // ALWAYS connect ConsoleSync to receive commands from Console (regardless of DB success)
      try {
        await this.consoleSync.connect(consoleToken, sessionId);
        console.log('[Background] ConsoleSync connected for session:', sessionId);

        // Only send heartbeat/sync messages if DB session was created successfully
        if (dbSessionCreated) {
          await this.consoleSync.send({
            type: 'SESSION_ACTIVE',
            data: { sessionId, timestamp: Date.now(), interviewContext: data?.interviewContext || {} }
          });
        } else {
          console.log('[Background] Skipping sync messages - DB session not created');
        }
      } catch (syncErr) {
        console.error('[Background] Console Sync Connect Error:', syncErr);
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
  // Uses chrome.desktopCapture to show the dialog in the meeting tab
  async startScreenCapture(data, sendResponse) {
    try {
      console.log('[Background] Starting screen capture for Online Assessment');

      // Get the meeting tab for showing the dialog
      let targetTab = null;

      // Try to get the meeting tab from stored tabId
      if (this.tabId) {
        try {
          targetTab = await chrome.tabs.get(this.tabId);
        } catch (e) {
          console.log('[Background] Stored tab not found, using active tab');
        }
      }

      // Fallback to active tab
      if (!targetTab) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab) {
          targetTab = activeTab;
          this.tabId = activeTab.id; // Store for later use
        }
      }

      if (!targetTab) {
        throw new Error('No tab available for screen capture dialog');
      }

      console.log('[Background] Showing screen share dialog in tab:', targetTab.id, targetTab.url?.substring(0, 50));

      // Use chrome.desktopCapture to show dialog in the meeting tab
      // This will open the "Choose what to share" dialog in that tab
      const streamId = await new Promise((resolve, reject) => {
        chrome.desktopCapture.chooseDesktopMedia(
          ['screen', 'window', 'tab'],
          targetTab,
          (streamId) => {
            if (streamId) {
              resolve(streamId);
            } else {
              reject(new Error('Screen share was cancelled or denied'));
            }
          }
        );
      });

      console.log('[Background] Got streamId:', streamId?.substring(0, 20) + '...');

      // Create offscreen document if not exists
      await this.createOffscreenDocument();

      // Send streamId to offscreen document to start capture
      const response = await chrome.runtime.sendMessage({
        type: 'START_SCREEN_CAPTURE',
        streamId: streamId
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to start screen capture');
      }

      // Store the screen sharing state
      this.isScreenSharing = true;
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
    const sessionId = data.sessionId || this.state.data.activeSession?.id;

    if (!sessionId) {
      if (sendResponse) sendResponse({ success: false, error: 'No session ID provided' });
      return;
    }

    try {
      console.log('[Background] Resuming session:', sessionId);

      // RESTORE TAB ID: Critical for screen capture
      // 1. Try from existing state
      if (!this.tabId && this.state.data.activeSession?.tabId) {
        try {
          await chrome.tabs.get(this.state.data.activeSession.tabId);
          this.tabId = this.state.data.activeSession.tabId;
          console.log('[Background] Restored tabId from valid state:', this.tabId);
        } catch (e) {
          console.log('[Background] Stored tabId invalid or closed');
        }
      }

      // 2. If still missing, try to find by meeting URL/Platform
      if (!this.tabId) {
        console.log('[Background] Searching for meeting tab...');
        // Implementation note: activeSession might be updated below, but we need tabId now
        const knownUrl = this.state.data.activeSession?.url || data?.meetingUrl;
        if (knownUrl) {
          const tabs = await chrome.tabs.query({ url: knownUrl });
          if (tabs && tabs.length > 0) {
            this.tabId = tabs[0].id;
            console.log('[Background] Found meeting tab by URL:', this.tabId);
          }
        }

        // Fallback: Query active tab in current window if user triggered this manually
        if (!this.tabId) {
          const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
          // Basic heuristic: is it a meeting?
          if (active && (active.url.includes('meet.google') || active.url.includes('teams.live') || active.url.includes('zoom.us'))) {
            this.tabId = active.id;
            console.log('[Background] Assumed active tab is meeting:', this.tabId);
          }
        }
      }

      // 3. If tabId is still valid/found, verify it's not restricted
      if (this.tabId) {
        try {
          const tab = await chrome.tabs.get(this.tabId);
          // Check for restricted URLs
          if (tab && (tab.url.startsWith('chrome:') || tab.url.startsWith('edge:') || tab.url.startsWith('about:') || tab.url.startsWith('file:') || tab.url.startsWith('chrome-extension:'))) {
            console.warn('[Background] Resume attempted on restricted URL:', tab.url);
          }
        } catch (e) {
          console.warn('[Background] Tab validation failed:', e);
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

        if (result && result.success) {
          sessionData = result.session_data;
          pausedState = result.paused_state;
          consoleToken = result.console_token;
          console.log('[Background] Session resumed via RPC');
        } else {
          // Fallback to direct select
          const sessions = await supabaseREST.select('interview_sessions', `id=eq.${sessionId}`);
          if (sessions && sessions.length > 0) {
            sessionData = sessions[0];
            pausedState = sessionData.paused_state;
            consoleToken = sessionData.console_token;
            // Update status
            await supabaseREST.update('interview_sessions', { status: 'active', updated_at: new Date().toISOString() }, { id: sessionId });
          }
        }
      } catch (dbError) {
        console.error('[Background] Failed to resume from DB:', dbError);
        // Try local storage
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
        startTime: adjustedStartTime,
        url: this.state.data.activeSession?.url || 'unknown', // Use existing or unknown
        platform: this.state.data.activeSession?.platform || 'google-meet',
        interviewContext: pausedState?.interview_context || {},
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

      // Start audio capture if possible
      if (this.tabId) {
        try {
          const tab = await chrome.tabs.get(this.tabId);
          const isRestricted = (url) => url && (url.startsWith('chrome:') || url.startsWith('edge:') || url.startsWith('about:') || url.startsWith('file:') || url.startsWith('chrome-extension:'));

          if (tab && !isRestricted(tab.url)) {
            await this.startRealAudioCapture(this.tabId);
            // Notify content script
            await this.notifyContentScriptResume(this.tabId, {
              sessionId: sessionId,
              elapsedTime: elapsedTime,
              transcriptionText: pausedState?.transcription_text || ''
            });
          }
        } catch (e) {
          console.log('[Background] Could not restart audio/overlay:', e.message);
        }
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

  // Restore session state when console commands arrive but extension lost its session state
  // This is a lightweight restore that just sets sessionActive = true so hints work
  async restoreSessionFromConsole(sessionId) {
    console.log('[Background] Attempting lightweight session restore for:', sessionId);

    try {
      // Fetch session from database
      const sessions = await supabaseREST.select('interview_sessions', `id=eq.${sessionId}`);

      if (!sessions || sessions.length === 0) {
        console.error('[Background] Session not found in database:', sessionId);
        throw new Error('Session not found');
      }

      const session = sessions[0];

      // Only restore if session is still active
      if (session.status !== 'active') {
        console.warn('[Background] Session is not active in DB, status:', session.status);
        throw new Error('Session is not active');
      }

      console.log('[Background] Found active session in DB, restoring state...');

      // Set sessionActive flag - this is the key fix!
      this.sessionActive = true;

      // Restore minimal activeSession data needed for hints
      this.state.data.activeSession = {
        id: sessionId,
        startTime: new Date(session.started_at).getTime(),
        url: session.meeting_url || 'unknown',
        platform: this.detectPlatform(session.meeting_url || ''),
        interviewContext: session.context || {},
        restoredFromConsole: true
      };

      // Restore console token if available
      if (session.console_token) {
        this.state.data.consoleToken = session.console_token;
      }

      await this.state.save();

      console.log('[Background] Session restored successfully from console sync, sessionActive:', this.sessionActive);

      // Pre-warm AI config
      this.aiService.warmup();

    } catch (error) {
      console.error('[Background] Failed to restore session from console:', error);
      throw error;
    }
  }

  // Helper to notify content script about resumed session
  async notifyContentScriptResume(tabId, data) {
    // Try to send message first
    let contentScriptReady = false;
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
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
      console.warn('[Background] requestHint called but no active session. Trigger:', data?.trigger || 'unknown');
      // Send error back to console so user sees feedback
      await this.consoleSync.send({
        type: 'HINT_ERROR',
        data: { error: 'No active session in extension. Please reconnect the meeting.' }
      });
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

    // Rate limiting
    const now = Date.now();
    if (this.lastScreenshotTime && now - this.lastScreenshotTime < 500) {
      console.log('[Background] Screenshot debounced');
      if (sendResponse) sendResponse({ success: false, error: 'Please wait...' });
      return;
    }
    this.lastScreenshotTime = now;

    try {
      const { trigger } = data || {};
      let dataUrl;
      let captureMethod = 'native';

      // 1. LIVE CODING: Priority is the Screen Share Stream
      // If we are in Live Coding mode and have an active screen share, use it.
      // This ensures we capture the code editor or whatever the user is sharing, not just the meeting tab.
      // EXCEPTION: If triggered from Console, user likely wants the Meeting Window (what interviewer sees)
      // and not the Screen Share (which might show the Console itself, causing "clicking itself").
      const sessionContext = this.state.data.activeSession?.interviewContext || {};
      const isLiveCoding = sessionContext.isLiveCoding === true;

      if (isLiveCoding && this.isScreenSharing && trigger !== 'console') {
        console.log('[Background] Live Coding: Capturing from screen share stream');

        // Hide overlay before capturing stream frame
        // Use this.meetingTabId or this.tabId (consistent with standard mode)
        const overlayTabId = this.meetingTabId || this.tabId;
        console.log('[Background] Live Coding HIDE to tab:', overlayTabId);
        try {
          const hideMsg = { type: 'HIDE_OVERLAY_FOR_CAPTURE' };
          if (overlayTabId) {
            await chrome.tabs.sendMessage(overlayTabId, hideMsg);
          }
        } catch (e) {
          console.warn('[Background] HIDE message failed:', e.message);
        }

        // Wait for hide to render (detach from DOM) + Video Stream Latency
        // 1000ms total to ensure stream buffer is flushed
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const frameResult = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREEN_FRAME' });
          if (frameResult?.success && frameResult.data) {
            dataUrl = frameResult.data;
            captureMethod = 'screen-share';
          }
        } catch (e) {
          console.warn('[Background] Screen share capture failed:', e);
        }

        // Show overlay again immediately
        try {
          const showMsg = { type: 'SHOW_OVERLAY_AFTER_CAPTURE' };
          if (overlayTabId) {
            chrome.tabs.sendMessage(overlayTabId, showMsg).catch(() => { });
          }
        } catch (e) { }
      }

      // 2. STANDARD MODE (or Live Coding fallback)
      // Capture the meeting window/tab.
      if (!dataUrl) {
        const meetingTabId = this.meetingTabId || this.tabId;

        if (!meetingTabId) {
          throw new Error('No meeting tab identified');
        }

        const meetingTab = await chrome.tabs.get(meetingTabId).catch(() => null);
        if (!meetingTab) throw new Error('Meeting tab not found');

        // Check if meeting window is the currently focused one
        const currentWindow = await chrome.windows.getLastFocused();
        const meetingWindowId = meetingTab.windowId;
        const isMeetingWindowFocused = currentWindow.id === meetingWindowId;

        // Smart Logic:
        // If the meeting window is NOT focused (user is on Console in another window),
        // we can safely use captureVisibleTab on the meeting window.
        if (!isMeetingWindowFocused) {
          console.log('[Background] Native capture: Meeting window is background/separate');

          // Still hide overlay before capture
          await chrome.tabs.sendMessage(meetingTabId, { type: 'HIDE_OVERLAY_FOR_CAPTURE' }).catch(() => { });
          await new Promise(r => setTimeout(r, 300));

          dataUrl = await chrome.tabs.captureVisibleTab(meetingWindowId, { format: 'png' });
          captureMethod = 'native-window';

          // Restore overlay
          chrome.tabs.sendMessage(meetingTabId, { type: 'SHOW_OVERLAY_AFTER_CAPTURE' }).catch(() => { });
        } else {
          // If meeting window IS focused...
          // Check if meeting TAB is active.
          if (meetingTab.active) {
            // User is looking at meeting tab - Native Capture is safe & fast
            console.log('[Background] Native capture: Meeting tab is active');

            // Temporary hide overlay
            await chrome.tabs.sendMessage(meetingTabId, { type: 'HIDE_OVERLAY_FOR_CAPTURE' }).catch(() => { });
            await new Promise(r => setTimeout(r, 500)); // Ensure overlay is fully detached

            dataUrl = await chrome.tabs.captureVisibleTab(meetingWindowId, { format: 'png' });
            captureMethod = 'native-current';

            // Restore overlay
            chrome.tabs.sendMessage(meetingTabId, { type: 'SHOW_OVERLAY_AFTER_CAPTURE' }).catch(() => { });

          } else {
            // Meeting tab is NOT active (User is in same window but on different tab)
            // We need to decide: Do we capture THIS tab (e.g. Docs) or force switch to Meeting?

            // Get the actual active tab in this window
            const [activeTab] = await chrome.tabs.query({ windowId: meetingWindowId, active: true });

            // Heuristic: Is this the Console?
            const isConsole = activeTab?.url?.includes('/console') || activeTab?.title?.includes('Console');

            if (!isConsole) {
              // User is looking at Docs/StackOverflow/etc. - Capture what they see!
              console.log('[Background] Native capture: Capturing active non-meeting tab (Docs/etc)');

              try {
                // Temporary hide overlay if present on this tab
                chrome.tabs.sendMessage(activeTab.id, { type: 'HIDE_OVERLAY_FOR_CAPTURE' }).catch(() => { });
                await new Promise(r => setTimeout(r, 250));

                dataUrl = await chrome.tabs.captureVisibleTab(meetingWindowId, { format: 'png' });
                captureMethod = 'native-active-tab';

                chrome.tabs.sendMessage(activeTab.id, { type: 'SHOW_OVERLAY_AFTER_CAPTURE' }).catch(() => { });
              } catch (capErr) {
                console.warn('[Background] Native capture failed (likely permission), falling back to DOM:', capErr);
                // Fallback to DOM capture for this active tab
                const domResult = await this.executeDomCapture(activeTab.id);
                if (domResult?.success) {
                  dataUrl = domResult.dataUrl;
                  captureMethod = 'fallback-dom-active';
                } else {
                  throw capErr;
                }
              }

            } else {
              // User is on Console - clicking "Snap" here means they want the MEETING, not the Console UI.
              // Force switch to meeting tab.
              console.log('[Background] User is on Console - forcing switch to Meeting Tab');

              // Try DOM first (less intrusive), then Flash Switch
              try {
                const domResult = await this.executeDomCapture(meetingTabId);
                if (domResult?.success) {
                  dataUrl = domResult.dataUrl;
                  captureMethod = 'forced-dom';
                } else {
                  throw new Error('DOM capture failed');
                }
              } catch (err) {
                console.error('[Background] DOM capture error:', err.message);
                console.log('[Background] Attempting Flash Switch Fallback...');

                // Fallback: fast switch-snap-switch
                try {
                  const [activeWindowTab] = await chrome.tabs.query({ active: true, windowId: meetingWindowId });
                  const returnTabId = activeWindowTab?.id;

                  if (returnTabId && returnTabId !== meetingTabId) {
                    await chrome.tabs.update(meetingTabId, { active: true });
                    // Hide overlay explicitly
                    chrome.tabs.sendMessage(meetingTabId, { type: 'HIDE_OVERLAY_FOR_CAPTURE' }).catch(() => { });

                    // Give overlay a moment to hide
                    await new Promise(r => setTimeout(r, 300));

                    dataUrl = await chrome.tabs.captureVisibleTab(meetingWindowId, { format: 'png' });
                    captureMethod = 'flash-switch';

                    chrome.tabs.sendMessage(meetingTabId, { type: 'SHOW_OVERLAY_AFTER_CAPTURE' }).catch(() => { });
                    await chrome.tabs.update(returnTabId, { active: true });
                  } else {
                    // Already on meeting tab? Then normal capture should have worked or we are stuck
                    dataUrl = await chrome.tabs.captureVisibleTab(meetingWindowId, { format: 'png' });
                  }
                } catch (switchErr) {
                  console.error('[Background] Flash switch failed:', switchErr);
                  throw err;
                }
              }
            }
          }
        }
      }

      if (!dataUrl) throw new Error('All capture methods failed');

      // Save logic (shared)
      // Get tab info for metadata if available
      let tabUrl = '';
      let tabTitle = '';
      try {
        if (this.tabId) {
          const tab = await chrome.tabs.get(this.tabId);
          tabUrl = tab.url;
          tabTitle = tab.title;
        }
      } catch (e) { }

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
          p_extracted_text: '',
          p_code_text: '',
          p_metadata: {
            url: tabUrl,
            title: tabTitle
          }
        });

        if (!result?.error) {
          const screenshotData = {
            id: result?.screenshot_id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            image_url: dataUrl,
            display_order: result?.display_order,
            capture_method: captureMethod
          };

          // Notify overlay FIRST (instant direct message) - before slower console sync
          console.log('[Background] Sending SCREENSHOT_ADDED to overlay. tabId:', this.tabId, 'meetingTabId:', this.meetingTabId);
          if (this.tabId) {
            chrome.tabs.sendMessage(this.tabId, { type: 'SCREENSHOT_ADDED', data: screenshotData })
              .then(() => console.log('[Background] SCREENSHOT_ADDED sent to tabId:', this.tabId))
              .catch((err) => console.warn('[Background] Failed to send SCREENSHOT_ADDED to tabId:', err.message));
          }

          // Also notify meetingTabId if different, to ensure overlay gets it
          if (this.meetingTabId && this.meetingTabId !== this.tabId) {
            chrome.tabs.sendMessage(this.meetingTabId, { type: 'SCREENSHOT_ADDED', data: screenshotData })
              .then(() => console.log('[Background] SCREENSHOT_ADDED sent to meetingTabId:', this.meetingTabId))
              .catch((err) => console.warn('[Background] Failed to send SCREENSHOT_ADDED to meetingTabId:', err.message));
          }

          // Notify console via sync (slower - goes through Supabase DB)
          console.log('[Background] Sending SCREENSHOT_ADDED to console via sync...');
          this.consoleSync.send({ type: 'SCREENSHOT_ADDED', data: screenshotData }).catch(() => { });
        }
      }

      if (sendResponse) sendResponse({ success: true, dataUrl });

    } catch (err) {
      console.error('[Background] Capture failed:', err);

      // Notify console about failure so it stops spinning
      this.consoleSync.send({ type: 'SCREENSHOT_ERROR', data: { error: err.message } });

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
    console.log('[Background] Transcription:', transcript.text, 'isFinal:', transcript.isFinal, 'source:', transcript.source);

    // Process through TranscriptionManager (single source of truth, append-only)
    const state = this.transcriptionManager.processResult(
      transcript.text,
      transcript.isFinal,
      transcript.confidence,
      transcript.source
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

  async executeDomCapture(tabId) {
    if (!tabId) return { success: false, error: 'No tab ID provided' };

    console.log('[Background] Executing DOM capture for tab:', tabId);

    const domCapturePromise = chrome.tabs.sendMessage(tabId, {
      type: 'TAKE_DOM_SCREENSHOT'
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('DOM capture timed out')), 8000);
    });

    try {
      const result = await Promise.race([domCapturePromise, timeoutPromise]);
      if (result && result.success && result.dataUrl) {
        return result;
      }
      return { success: false, error: result?.error || 'DOM capture failed (unknown)' };
    } catch (err) {
      console.error('[Background] DOM capture exception:', err);
      return { success: false, error: err.message };
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();

console.log('[Background] Service worker initialized');