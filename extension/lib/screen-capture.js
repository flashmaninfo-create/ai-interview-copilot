// Screen Capture Manager - Handles screenshot functionality

export class ScreenCaptureManager {
    async captureScreen() {
        // Use chrome.tabs.captureVisibleTab
        return new Promise((resolve, reject) => {
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(dataUrl);
                }
            });
        });
    }

    async processScreenshot(dataUrl) {
        return {
            data: dataUrl,
            text: '', // OCR would go here
            timestamp: Date.now()
        };
    }
}
