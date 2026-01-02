// Audio Capture Manager - Placeholder for audio capture functionality

export class AudioCaptureManager {
    constructor() {
        this.isCapturing = false;
    }

    async startCapture(tabId) {
        this.isCapturing = true;
        console.log('[AudioCapture] Starting capture for tab:', tabId);
    }

    async stopCapture() {
        this.isCapturing = false;
        console.log('[AudioCapture] Stopping capture');
    }
}
