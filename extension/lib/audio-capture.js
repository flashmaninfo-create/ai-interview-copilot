// Audio Capture Manager - Handles audio capture via desktopCapture
// Triggers the "Choose what to share" dialog for explicit audio permission

export class AudioCaptureManager {
    constructor() {
        this.isCapturing = false;
        this.streamId = null;
    }

    async createOffscreenDocument() {
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });

        if (existingContexts.length > 0) {
            return;
        }

        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA', 'DISPLAY_MEDIA', 'DOM_SCRAPING'],
            justification: 'Recording meeting audio for transcription'
        });
    }

    async startCapture(tabId) {
        if (this.isCapturing) {
            console.log('[AudioCapture] Already capturing');
            return;
        }

        console.log('[AudioCapture] Starting capture flow for tab:', tabId);

        // Fetch API Key from storage or config if not already set
        if (!this.apiKey) {
            const result = await chrome.storage.local.get(['deepgram_api_key']);
            this.apiKey = result.deepgram_api_key || '5e2e3945f5f5e171dbdc62bb3d06cd3f6a088266'; // Fallback to avoid breaking immediately, but should be set by user
        }

        // 1. Ensure offscreen document exists
        await this.createOffscreenDocument();

        // 2. Request Tab Capture Stream ID (Specifically for Offscreen Document)
        // detailed logic: chrome.tabCapture.getMediaStreamId generates a streamId that is valid for
        // the extension's offscreen document, allowing it to ingest the tab's media.
        return new Promise((resolve, reject) => {
            console.log('[AudioCapture] Requesting tab capture stream ID for tab:', tabId);

            chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, async (streamId) => {
                if (chrome.runtime.lastError) {
                    console.error('[AudioCapture] tabCapture runtime error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (!streamId) {
                    console.warn('[AudioCapture] No stream ID returned from tabCapture');
                    reject(new Error('Failed to get stream ID'));
                    return;
                }

                console.log('[AudioCapture] Got stream ID:', streamId);
                this.streamId = streamId;
                this.isCapturing = true;

                // 3. Send stream ID to offscreen document
                try {
                    const response = await chrome.runtime.sendMessage({
                        type: 'START_AUDIO_CAPTURE',
                        streamId: streamId,
                        source: 'tab', // Source must be 'tab' for tabCapture streams
                        apiKey: this.apiKey // Pass validation key
                    });

                    if (response && response.success) {
                        console.log('[AudioCapture] Offscreen capture started');
                        resolve({ success: true, streamId });
                    } else {
                        reject(new Error(response?.error || 'Offscreen initialization failed'));
                    }
                } catch (err) {
                    reject(new Error('Failed to communicate with offscreen doc: ' + err.message));
                }
            });
        });
    }

    async stopCapture() {
        this.isCapturing = false;
        this.streamId = null;
        console.log('[AudioCapture] Stopping capture');

        // Notify offscreen to stop
        try {
            await chrome.runtime.sendMessage({ type: 'STOP_AUDIO_CAPTURE' });
        } catch (e) {
            // Ignore error if offscreen is already closed
        }
    }
}

