// Offscreen Document - Handles audio capture and Deepgram transcription
// This runs in an offscreen document context where we have access to MediaRecorder

const DEEPGRAM_API_KEY = '87fdc61a249e2e068fdf7eabc96eebfd7f46c407';

let mediaRecorder = null;
let audioStream = null;
let deepgramSocket = null;
let isRecording = false;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Offscreen] Message received:', message.type);

    switch (message.type) {
        case 'START_AUDIO_CAPTURE':
            startCapture(message.streamId)
                .then(() => sendResponse({ success: true }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true; // Keep channel open for async response

        case 'STOP_AUDIO_CAPTURE':
            stopCapture();
            sendResponse({ success: true });
            break;

        case 'GET_CAPTURE_STATUS':
            sendResponse({ isRecording });
            break;
    }
});

async function startCapture(streamId) {
    if (isRecording) {
        console.log('[Offscreen] Already recording');
        return;
    }

    try {
        console.log('[Offscreen] Starting audio capture with streamId:', streamId);

        // Get the audio stream from tab (system/tab audio only - what others are saying)
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: false
        });

        console.log('[Offscreen] Got tab audio stream, tracks:', audioStream.getAudioTracks().length);

        // IMPORTANT: Play audio back to speakers so user can still hear it
        // The getUserMedia captures and mutes original audio, we need to restore it
        try {
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(audioStream);
            source.connect(audioContext.destination); // Play to speakers
            console.log('[Offscreen] Tab audio playback connected to speakers');
        } catch (audioErr) {
            console.log('[Offscreen] Could not set up audio playback:', audioErr);
        }

        // Connect to Deepgram
        await connectDeepgram();

        // Start recording
        startRecording();

        isRecording = true;
        console.log('[Offscreen] Tab/system audio capture started successfully');

    } catch (error) {
        console.error('[Offscreen] Error starting capture:', error);
        throw error;
    }
}

async function connectDeepgram() {
    return new Promise((resolve, reject) => {
        console.log('[Offscreen] Connecting to Deepgram...');

        const url = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&punctuate=true&interim_results=true';

        deepgramSocket = new WebSocket(url, ['token', DEEPGRAM_API_KEY]);

        deepgramSocket.onopen = () => {
            console.log('[Offscreen] Deepgram connected');
            resolve();
        };

        deepgramSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
                    const transcript = data.channel.alternatives[0].transcript;
                    const isFinal = data.is_final;

                    if (transcript && transcript.trim()) {
                        console.log('[Offscreen] Transcript:', transcript, 'Final:', isFinal);

                        // Send transcript to background script
                        chrome.runtime.sendMessage({
                            type: 'TRANSCRIPTION_RESULT',
                            data: {
                                text: transcript,
                                isFinal: isFinal,
                                confidence: data.channel.alternatives[0].confidence || 0.95
                            }
                        });
                    }
                }
            } catch (e) {
                console.error('[Offscreen] Error parsing Deepgram response:', e);
            }
        };

        deepgramSocket.onerror = (error) => {
            console.error('[Offscreen] Deepgram error:', error);
            reject(new Error('Deepgram connection failed'));
        };

        deepgramSocket.onclose = (event) => {
            console.log('[Offscreen] Deepgram disconnected:', event.code, event.reason);
        };

        // Timeout if connection takes too long
        setTimeout(() => {
            if (deepgramSocket.readyState !== WebSocket.OPEN) {
                reject(new Error('Deepgram connection timeout'));
            }
        }, 10000);
    });
}

function startRecording() {
    if (!audioStream) {
        console.error('[Offscreen] No audio stream available');
        return;
    }

    // Create MediaRecorder with appropriate settings for Deepgram
    const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
    };

    try {
        mediaRecorder = new MediaRecorder(audioStream, options);
    } catch (e) {
        // Fallback if opus not supported
        mediaRecorder = new MediaRecorder(audioStream);
    }

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
            deepgramSocket.send(event.data);
        }
    };

    mediaRecorder.onerror = (error) => {
        console.error('[Offscreen] MediaRecorder error:', error);
    };

    // Send audio chunks every 100ms for smooth, real-time transcription
    // Smaller chunks = faster word appearance, smoother flow
    mediaRecorder.start(100);
    console.log('[Offscreen] MediaRecorder started');
}

function stopCapture() {
    console.log('[Offscreen] Stopping capture...');

    isRecording = false;

    // Stop MediaRecorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder = null;
    }

    // Close Deepgram connection
    if (deepgramSocket) {
        if (deepgramSocket.readyState === WebSocket.OPEN) {
            deepgramSocket.close();
        }
        deepgramSocket = null;
    }

    // Stop audio stream
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }

    console.log('[Offscreen] Capture stopped');
}

console.log('[Offscreen] Offscreen document loaded and ready');
