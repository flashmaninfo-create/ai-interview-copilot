// Screen Capture Manager - DOM-first capture with getDisplayMedia fallback
// Captures full viewport - no platform-specific targeting

export class ScreenCaptureManager {
    constructor() {
        this.html2canvasLoaded = false;
        this.html2canvasScript = null;
    }

    /**
     * Load html2canvas library dynamically
     */
    async loadHtml2Canvas() {
        if (this.html2canvasLoaded) return true;

        if (typeof html2canvas !== 'undefined') {
            this.html2canvasLoaded = true;
            return true;
        }

        // Logic now relies on background injecting the script
        // We'll give it a small delay just in case
        return new Promise(resolve => {
            let checks = 0;
            const check = setInterval(() => {
                if (typeof html2canvas !== 'undefined') {
                    clearInterval(check);
                    this.html2canvasLoaded = true;
                    resolve(true);
                }
                checks++;
                if (checks > 10) { // 1 second timeout
                    clearInterval(check);
                    console.error('[ScreenCapture] html2canvas not found in global scope');
                    resolve(false);
                }
            }, 100);
        });
    }

    /**
     * Primary capture method: DOM-based using html2canvas
     * Works best for browser-based coding platforms
     * @returns {Promise<{success: boolean, data?: string, method: string, error?: string}>}
     */
    async captureDOM() {
        try {
            await this.loadHtml2Canvas();

            if (typeof html2canvas === 'undefined') {
                return { success: false, error: 'html2canvas not available', method: 'dom' };
            }

            // Capture the entire document body
            const canvas = await html2canvas(document.body, {
                useCORS: true,
                allowTaint: true,
                scale: 1.5, // Good balance between quality and size
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: document.documentElement.scrollWidth,
                windowHeight: document.documentElement.scrollHeight
            });

            const dataUrl = canvas.toDataURL('image/png', 0.9);

            console.log('[ScreenCapture] DOM capture successful');
            return {
                success: true,
                data: dataUrl,
                method: 'dom',
                width: canvas.width,
                height: canvas.height
            };
        } catch (error) {
            console.error('[ScreenCapture] DOM capture failed:', error);
            return { success: false, error: error.message, method: 'dom' };
        }
    }

    /**
     * Capture a specific element by selector
     * Useful for targeting problem description areas
     * @param {string} selector - CSS selector for the element
     */
    async captureElement(selector) {
        try {
            await this.loadHtml2Canvas();

            const element = document.querySelector(selector);
            if (!element) {
                return { success: false, error: `Element not found: ${selector}`, method: 'element' };
            }

            const canvas = await html2canvas(element, {
                useCORS: true,
                allowTaint: true,
                scale: 2, // Higher quality for focused captures
                logging: false,
                backgroundColor: '#ffffff'
            });

            const dataUrl = canvas.toDataURL('image/png', 0.9);

            return {
                success: true,
                data: dataUrl,
                method: 'element',
                selector: selector,
                width: canvas.width,
                height: canvas.height
            };
        } catch (error) {
            console.error('[ScreenCapture] Element capture failed:', error);
            return { success: false, error: error.message, method: 'element' };
        }
    }

    /**
     * Capture visible viewport only (faster, smaller file)
     */
    async captureViewport() {
        try {
            await this.loadHtml2Canvas();

            if (typeof html2canvas === 'undefined') {
                return { success: false, error: 'html2canvas not available', method: 'viewport' };
            }

            const canvas = await html2canvas(document.body, {
                useCORS: true,
                allowTaint: true,
                scale: 1.5,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                x: window.scrollX,
                y: window.scrollY,
                width: window.innerWidth,
                height: window.innerHeight
            });

            const dataUrl = canvas.toDataURL('image/png', 0.9);

            return {
                success: true,
                data: dataUrl,
                method: 'viewport',
                width: canvas.width,
                height: canvas.height
            };
        } catch (error) {
            console.error('[ScreenCapture] Viewport capture failed:', error);
            return { success: false, error: error.message, method: 'viewport' };
        }
    }

    /**
     * Fallback: Request screen capture using chrome.tabs.captureVisibleTab
     * This captures the visible tab as seen by the browser
     */
    async captureScreen() {
        try {
            // This method is called from background context via chrome.tabs.captureVisibleTab
            // Return a placeholder - actual capture happens in background.js
            return {
                success: true,
                method: 'screen',
                requiresBackground: true
            };
        } catch (error) {
            console.error('[ScreenCapture] Screen capture request failed:', error);
            return { success: false, error: error.message, method: 'screen' };
        }
    }

    /**
     * Process screenshot: compress and prepare for upload
     * @param {string} dataUrl - Base64 data URL of the image
     * @param {Object} options - Processing options
     */
    async processScreenshot(dataUrl, options = {}) {
        const {
            maxWidth = 1920,
            maxHeight = 1080,
            quality = 0.85,
            format = 'image/jpeg'
        } = options;

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale down if too large
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                // Create canvas for resizing
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const processedData = canvas.toDataURL(format, quality);

                resolve({
                    data: processedData,
                    width: Math.round(width),
                    height: Math.round(height),
                    originalWidth: img.width,
                    originalHeight: img.height,
                    sizeBytes: Math.round((processedData.length * 3) / 4) // Approximate base64 decoded size
                });
            };

            img.onerror = () => {
                resolve({
                    data: dataUrl,
                    error: 'Failed to process image'
                });
            };

            img.src = dataUrl;
        });
    }

    /**
     * Smart capture: Try DOM first, fallback to screen capture
     * @param {Object} options - Capture options
     */
    async smartCapture(options = {}) {
        const { preferViewport = false, elementSelector = null } = options;

        // Try element capture first if selector provided
        if (elementSelector) {
            const elementResult = await this.captureElement(elementSelector);
            if (elementResult.success) {
                return elementResult;
            }
        }

        // Try viewport or full DOM capture
        const domResult = preferViewport
            ? await this.captureViewport()
            : await this.captureDOM();

        if (domResult.success) {
            return domResult;
        }

        // Fallback to screen capture (handled by background)
        console.log('[ScreenCapture] DOM capture failed, signaling for screen capture fallback');
        return {
            success: false,
            requiresFallback: true,
            method: 'fallback',
            error: domResult.error
        };
    }
}
