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
            stopCapture();
            sendResponse({ success: true });
            break;

        case 'GET_CAPTURE_STATUS':
            sendResponse({ isRecording, isScreenSharing });
            break;

        // Screen capture fallback handlers
        case 'START_SCREEN_CAPTURE':
            // Support passing streamId for auto-capture (triggered by background)
            startScreenCapture(message.streamId)
                .then(result => sendResponse(result))
                .catch(err => {
                    sendBackLog(`Screen capture failed: ${err.message}`, true);
                    sendResponse({ success: false, error: err.message });
                });
            return true;

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

// ==========================================
// Audio Capture Functions
// ==========================================

async function startCapture(streamId, source = 'tab', apiKey = null) {
    if (isRecording) {
        sendBackLog('Recording already active, stopping first...', true);
        stopCapture();
    }

    // We have a fallback constant now, so we don't strict check apiKey here
    // if (!apiKey) {
    //     sendBackLog('Missing Deepgram API Key', true);
    //     throw new Error('Deepgram API Key is missing. Please configure it in the admin panel.');
    // }

    sendBackLog(`Starting audio capture with streamId: ${streamId} source: ${source}`);

    try {
        const constraints = {
            audio: {
                mandatory: {
                    chromeMediaSource: source,
                    chromeMediaSourceId: streamId
                }
            },
            video: false
        };

        // Desktop capture requires video constraint to be present (even if we ignore it)
        if (source === 'desktop') {
            constraints.video = {
                mandatory: {
                    chromeMediaSource: source,
                    chromeMediaSourceId: streamId
                }
            };
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // 1. Fix Muting: Play audio locally so user can hear the meeting
        const audioContext = new AudioContext();
        const sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNode.connect(audioContext.destination);

        // 2. Initialize Deepgram Transcription
        await initDeepgram(stream, apiKey);

        audioStream = stream;
        isRecording = true;
        sendBackLog('Audio capture started successfully');
    } catch (err) {
        sendBackLog(`Failed to start capture. Name: ${err.name} Message: ${err.message}`, true);
        throw err;
    }
}

const DEEPGRAM_API_KEY = '5e2e3945f5f5e171dbdc62bb3d06cd3f6a088266';

// Initialize Deepgram WebSocket
async function initDeepgram(stream, apiKey) {
    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
        sendBackLog('Deepgram socket already open');
        return;
    }

    // fallback to hardcoded key if dynamic one fails
    const finalKey = apiKey || DEEPGRAM_API_KEY;

    sendBackLog(`Initializing Deepgram connection with key: ${finalKey ? 'Present (length ' + finalKey.length + ')' : 'MISSING'}`);

    try {
        // Use Deepgram's auto-detect encoding for webm/opus audio from MediaRecorder
        deepgramSocket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true', [
            'token',
            finalKey
        ]);

        deepgramSocket.onopen = () => {
            sendBackLog('Connected to Deepgram WebSocket');

            // Start MediaRecorder to send audio chunks
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }

            // Important: Use correct mimeType for MediaRecorder
            // Chrome supports audio/webm
            try {
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            } catch (e) {
                sendBackLog(`MediaRecorder creation failed: ${e.message}`, true);
                return;
            }

            mediaRecorder.addEventListener('dataavailable', async (event) => {
                if (event.data.size > 0 && deepgramSocket.readyState === WebSocket.OPEN) {
                    // sendBackLog(`Sending audio chunk: ${event.data.size} bytes`);
                    deepgramSocket.send(event.data);
                } else if (event.data.size > 0) {
                    sendBackLog(`Socket not open, dropping chunk: ${event.data.size}`);
                }
            });

            mediaRecorder.start(250); // Send chunks every 250ms
            sendBackLog('MediaRecorder started');
        };

        deepgramSocket.onmessage = (message) => {
            try {
                const received = JSON.parse(message.data);

                // Log metadata or errors from Deepgram
                if (received.type === 'Metadata') {
                    sendBackLog(`Deepgram Metadata received: ${JSON.stringify(received)}`);
                }
                if (received.error) {
                    sendBackLog(`Deepgram Error received: ${received.error}`, true);
                }

                const transcript = received.channel?.alternatives[0]?.transcript;

                if (transcript && received.is_final) {
                    sendBackLog(`Transcript received: ${transcript}`);
                    chrome.runtime.sendMessage({
                        type: 'TRANSCRIPTION_RESULT',
                        data: {
                            text: transcript,
                            isFinal: true,
                            timestamp: new Date().toISOString()
                        }
                    });
                } else if (transcript) {
                    // Log interim results too if needed for debugging
                    // sendBackLog(`Interim transcript: ${transcript}`);
                }
            } catch (parseError) {
                sendBackLog(`Error parsing Deepgram message: ${parseError.message}`, true);
            }
        };

        deepgramSocket.onerror = (error) => {
            sendBackLog(`Deepgram WebSocket error: ${JSON.stringify(error)}`, true);
        };

        deepgramSocket.onclose = () => {
            sendBackLog('Deepgram WebSocket closed');
            deepgramSocket = null;
        };

    } catch (error) {
        console.error('[Offscreen] Failed to initialize Deepgram:', error);
    }
}

function stopCapture() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    if (deepgramSocket) {
        deepgramSocket.close();
        deepgramSocket = null;
    }

    if (isRecording && audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
        audioStream = null;
        isRecording = false;
        console.log('[Offscreen] Audio capture stopped');
    }
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

        // Small buffer to ensure frame is rendered
        await new Promise(resolve => setTimeout(resolve, 100));

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
