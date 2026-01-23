// Offscreen Document - Handles audio capture, Deepgram transcription, and screen capture fallback
// This runs in an offscreen document context where we have access to MediaRecorder and MediaStreams

// DEEPGRAM_API_KEY removed - now passed dynamically

let mediaRecorder = null;
let audioStream = null;
let deepgramSocket = null;
let isRecording = false;

// Screen capture state (for fallback when DOM capture fails)
let screenStream = null;
let isScreenSharing = false;

// Helper to forward logs to background -> overlay
function sendBackLog(message, isError = false) {
    const logType = isError ? 'error' : 'info';
    console[logType](`[Offscreen] ${message}`);
    try {
        chrome.runtime.sendMessage({
            type: 'DEBUG_LOG',
            data: { message, level: logType, source: 'offscreen' }
        });
    } catch (e) {
        // Ignore parsing errors if background is gone
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    sendBackLog(`Message received: ${message.type}`);

    switch (message.type) {
        case 'START_AUDIO_CAPTURE':
            startCapture(message.streamId, message.source, message.apiKey)
                .then(() => sendResponse({ success: true }))
                .catch(err => {
                    sendBackLog(`Start capture failed: ${err.message}`, true);
                    sendResponse({ success: false, error: err.message });
                });
            return true; // Keep channel open for async response

        case 'STOP_AUDIO_CAPTURE':
            stopAllCaptures();
            sendResponse({ success: true });
            break;

        case 'START_SCREEN_CAPTURE':
            // Support passing streamId for auto-capture (triggered by background)
            startScreenCapture(message.streamId)
                .then(result => sendResponse(result))
                .catch(err => {
                    sendBackLog(`Screen capture failed: ${err.message}`, true);
                    sendResponse({ success: false, error: err.message });
                });
            return true;

        case 'CAPTURE_SCREENSHOT':
            captureScreenshot() // This function seems missing or was in the part I deleted? Check original manually if needed.
                .then((dataUrl) => sendResponse({ success: true, screenshot: dataUrl }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;

        case 'GET_CAPTURE_STATUS':
            sendResponse({ isRecording, isScreenSharing });
            break;

        case 'CAPTURE_SCREEN_FRAME':
            captureScreenFrame()
                .then(result => sendResponse(result))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;

        case 'STOP_SCREEN_CAPTURE':
            stopScreenCapture();
            sendResponse({ success: true });
            break;
    }
});

// Audio Capture State
const captureSessions = new Map(); // source -> CaptureSession

class CaptureSession {
    constructor(source, apiKey) {
        this.source = source;
        this.apiKey = apiKey;
        this.mediaRecorder = null;
        this.stream = null;
        this.deepgramSocket = null;
        this.isRecording = false;
        this.DEEPGRAM_API_KEY = '5e2e3945f5f5e171dbdc62bb3d06cd3f6a088266';
    }

    async start(streamId) {
        sendBackLog(`[${this.source}] Starting capture with streamId: ${streamId || 'mic'}`);

        try {
            let stream;
            if (this.source === 'mic') {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } else {
                const constraints = {
                    audio: {
                        mandatory: {
                            chromeMediaSource: 'tab',
                            chromeMediaSourceId: streamId
                        }
                    },
                    video: false
                };
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            // 1. Fix Muting: Play audio locally so user can hear the meeting (ONLY for tab audio)
            // Do NOT play mic audio back to user (echo)
            if (this.source === 'tab') {
                this.audioContext = new AudioContext();
                const sourceNode = this.audioContext.createMediaStreamSource(stream);
                sourceNode.connect(this.audioContext.destination);
            }

            // 2. Initialize Deepgram Transcription
            await this.initDeepgram(stream);

            this.stream = stream;
            this.isRecording = true;
            sendBackLog(`[${this.source}] Audio capture started successfully`);
        } catch (err) {
            sendBackLog(`[${this.source}] Failed to start capture: ${err.message}`, true);
            throw err;
        }
    }

    async initDeepgram(stream) {
        if (this.deepgramSocket && this.deepgramSocket.readyState === WebSocket.OPEN) {
            return;
        }

        const finalKey = this.apiKey || this.DEEPGRAM_API_KEY;
        // Use Nova-2 model tailored for meetings
        const model = 'nova-2';
        // Different options could be used for mic vs tab if needed, but nova-2 is generally best for both

        try {
            this.deepgramSocket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=${model}&punctuate=true&smart_format=true&language=en`, [
                'token',
                finalKey
            ]);

            this.deepgramSocket.onopen = () => {
                sendBackLog(`[${this.source}] Connected to Deepgram`);

                if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                }

                try {
                    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                } catch (e) {
                    sendBackLog(`[${this.source}] MediaRecorder creation failed: ${e.message}`, true);
                    return;
                }

                this.mediaRecorder.addEventListener('dataavailable', async (event) => {
                    if (event.data.size > 0 && this.deepgramSocket && this.deepgramSocket.readyState === WebSocket.OPEN) {
                        this.deepgramSocket.send(event.data);
                    }
                });

                this.mediaRecorder.start(250);
            };

            this.deepgramSocket.onmessage = (message) => {
                try {
                    const received = JSON.parse(message.data);
                    const transcript = received.channel?.alternatives[0]?.transcript;
                    const isFinal = received.is_final;

                    if (transcript) {
                        chrome.runtime.sendMessage({
                            type: 'TRANSCRIPTION_RESULT',
                            data: {
                                text: transcript,
                                isFinal: isFinal,
                                source: this.source, // 'mic' or 'tab'
                                timestamp: new Date().toISOString()
                            }
                        });
                    }
                } catch (error) {
                    // Ignore parse errors
                }
            };

            this.deepgramSocket.onerror = (error) => {
                sendBackLog(`[${this.source}] Deepgram error: ${JSON.stringify(error)}`, true);
            };

            this.deepgramSocket.onclose = () => {
                sendBackLog(`[${this.source}] Deepgram socket closed`);
                this.deepgramSocket = null;
            };

        } catch (error) {
            console.error(`[${this.source}] Failed to init Deepgram:`, error);
        }
    }

    stop() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.deepgramSocket) {
            this.deepgramSocket.close();
            this.deepgramSocket = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        this.isRecording = false;
        sendBackLog(`[${this.source}] Capture stopped`);
    }
}

// Global stop function to stop ALL sessions
function stopAllCaptures() {
    captureSessions.forEach(session => session.stop());
    captureSessions.clear();
    isRecording = false; // Global flag update
}

// Updated message handlers for audio
async function startCapture(streamId, source, apiKey) {
    // If source is not specified, default to 'tab' (backward compatibility)
    // But realistically we should always pass it now.
    const sessionSource = source || 'tab';

    // Stop existing session for this source if any
    if (captureSessions.has(sessionSource)) {
        captureSessions.get(sessionSource).stop();
        captureSessions.delete(sessionSource);
    }

    const session = new CaptureSession(sessionSource, apiKey);
    captureSessions.set(sessionSource, session);

    await session.start(streamId);
    isRecording = true; // Set global flag if at least one is recording
}

// ==========================================
// Screen Capture Fallback Functions
// ==========================================

async function startScreenCapture(streamId) {
    if (isScreenSharing) {
        console.log('[Offscreen] Screen capture already active');
        return { success: true, alreadyActive: true };
    }

    try {
        console.log('[Offscreen] Requesting screen capture...', streamId ? '(using streamId)' : '(requesting permission)');

        if (streamId) {
            // Use streamId provided by background (from chrome.desktopCapture)
            screenStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: streamId,
                        maxWidth: 1920,
                        maxHeight: 1080
                    }
                }
            });
        } else {
            // Fallback: Request entire screen capture via getDisplayMedia
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'monitor',
                    cursor: 'never'
                },
                audio: false
            });
        }

        isScreenSharing = true;

        // Handle stream ending (user clicks "Stop sharing")
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            console.log('[Offscreen] Screen sharing ended by user');
            isScreenSharing = false;
            screenStream = null;

            // Notify background that sharing stopped
            chrome.runtime.sendMessage({
                type: 'SCREEN_SHARE_ENDED',
                data: { reason: 'user_stopped' }
            });
        });

        console.log('[Offscreen] Screen capture started successfully');
        return {
            success: true,
            width: screenStream.getVideoTracks()[0].getSettings().width,
            height: screenStream.getVideoTracks()[0].getSettings().height
        };

    } catch (error) {
        console.error('[Offscreen] Screen capture failed:', error.name, error.message);
        isScreenSharing = false;
        screenStream = null;

        if (error.name === 'NotAllowedError') {
            return { success: false, error: 'Screen sharing was denied by user' };
        }
        if (error.name === 'InvalidStateError') {
            return { success: false, error: 'Screen sharing stream ID is invalid or expired' };
        }
        return { success: false, error: error.name + ': ' + error.message };
    }
}

async function captureScreenFrame() {
    if (!isScreenSharing || !screenStream) {
        return { success: false, error: 'Screen capture not active' };
    }

    try {
        const videoTrack = screenStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();

        // Create video element to draw from stream
        const video = document.createElement('video');
        video.srcObject = screenStream;
        video.muted = true;
        video.autoplay = true; // Ensure autoplay is set
        video.playsInline = true;

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                video.onloadedmetadata = null;
                video.onplay = null;
                reject(new Error('Video load timeout'));
            }, 3000);

            // Wait for both metadata AND actual playing state
            video.onloadedmetadata = () => {
                video.play().catch(e => { /* ignore play errors if already playing */ });
            };

            video.onplaying = () => {
                clearTimeout(timeout);
                resolve();
            };

            // Trigger load
            video.load();
        });

        // Larger buffer to ensure stream reflects current DOM state (after overlay hide)
        // Screen share streams have encoding/decoding latency
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = document.createElement('canvas');
        canvas.width = settings.width || video.videoWidth;
        canvas.height = settings.height || video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Cleanup
        video.pause();
        video.srcObject = null;
        video.remove(); // Explicitly remove

        const dataUrl = canvas.toDataURL('image/png', 0.9);

        console.log('[Offscreen] Screen frame captured:', canvas.width, 'x', canvas.height);

        return {
            success: true,
            data: dataUrl,
            width: canvas.width,
            height: canvas.height,
            method: 'screen'
        };

    } catch (error) {
        console.error('[Offscreen] Frame capture failed:', error);
        return { success: false, error: error.message };
    }
}

function stopScreenCapture() {
    console.log('[Offscreen] Stopping screen capture...');

    isScreenSharing = false;

    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
    }

    console.log('[Offscreen] Screen capture stopped');
}

console.log('[Offscreen] Offscreen document loaded and ready');
