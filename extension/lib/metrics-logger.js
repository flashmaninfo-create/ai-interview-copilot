// Metrics Logger - Performance and quality metrics tracking

export class MetricsLogger {
    constructor() {
        this.metrics = {
            requests: [],
            summary: {
                totalRequests: 0,
                languageMatchRate: 0,
                avgResponseTime: 0,
                bannedPhraseHits: 0,
                retryCount: 0
            }
        };
        this.maxHistory = 100; // Keep last 100 requests
    }

    /**
     * Log a request with metrics
     */
    log(data) {
        const entry = {
            timestamp: Date.now(),
            mode: data.mode,
            provider: data.provider,
            model: data.model,
            responseTime: data.responseTime,
            tokenCount: data.tokenCount,
            languageMatch: data.languageMatch,
            bannedPhraseHits: data.bannedPhraseHits || 0,
            retried: data.retried || false,
            success: data.success,
            error: data.error || null
        };

        this.metrics.requests.push(entry);

        // Trim history
        if (this.metrics.requests.length > this.maxHistory) {
            this.metrics.requests.shift();
        }

        // Update summary
        this.updateSummary();

        // Log to console for debugging
        console.log('[Metrics]', {
            mode: entry.mode,
            time: `${entry.responseTime}ms`,
            match: entry.languageMatch,
            success: entry.success
        });

        return entry;
    }

    /**
     * Update summary statistics
     */
    updateSummary() {
        const requests = this.metrics.requests;
        const count = requests.length;

        if (count === 0) return;

        this.metrics.summary = {
            totalRequests: count,
            languageMatchRate: requests.filter(r => r.languageMatch).length / count,
            avgResponseTime: requests.reduce((sum, r) => sum + (r.responseTime || 0), 0) / count,
            bannedPhraseHits: requests.reduce((sum, r) => sum + (r.bannedPhraseHits || 0), 0),
            retryCount: requests.filter(r => r.retried).length,
            successRate: requests.filter(r => r.success).length / count
        };
    }

    /**
     * Get performance report
     */
    getReport() {
        const s = this.metrics.summary;
        return {
            ...s,
            avgResponseTimeFormatted: `${Math.round(s.avgResponseTime)}ms`,
            languageMatchFormatted: `${Math.round(s.languageMatchRate * 100)}%`,
            successRateFormatted: `${Math.round((s.successRate || 0) * 100)}%`
        };
    }

    /**
     * Check if performance is within budget
     */
    checkBudget(responseTime) {
        return {
            withinBudget: responseTime < 5000,
            details: {
                target: 5000,
                actual: responseTime,
                margin: 5000 - responseTime
            }
        };
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            requests: [],
            summary: {
                totalRequests: 0,
                languageMatchRate: 0,
                avgResponseTime: 0,
                bannedPhraseHits: 0,
                retryCount: 0
            }
        };
    }

    /**
     * Get recent errors
     */
    getRecentErrors(limit = 5) {
        return this.metrics.requests
            .filter(r => !r.success)
            .slice(-limit)
            .map(r => ({ mode: r.mode, error: r.error, time: r.timestamp }));
    }
}

// Singleton instance
let metricsInstance = null;

export function getMetricsLogger() {
    if (!metricsInstance) {
        metricsInstance = new MetricsLogger();
    }
    return metricsInstance;
}
