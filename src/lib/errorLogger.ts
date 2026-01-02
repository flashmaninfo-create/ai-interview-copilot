
/**
 * Centralized Error Logger
 * Can be integrated with services like Sentry, LogRocket, etc.
 */

type ErrorLevel = 'info' | 'warn' | 'error' | 'fatal';

interface ErrorLogParams {
    message: string;
    error?: any;
    level?: ErrorLevel;
    context?: Record<string, any>;
}

export const errorLogger = {
    log: ({ message, error, level = 'info', context }: ErrorLogParams) => {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level,
            message,
            error: error?.message || error,
            stack: error?.stack,
            context
        };

        // In development, log to console
        if (import.meta.env.DEV) {
            switch (level) {
                case 'error':
                case 'fatal':
                    console.error(`[${level.toUpperCase()}] ${message}`, logData);
                    break;
                case 'warn':
                    console.warn(`[${level.toUpperCase()}] ${message}`, logData);
                    break;
                default:
                    console.log(`[${level.toUpperCase()}] ${message}`, logData);
            }
        } else {
            // In production, sending to external service would go here
            // e.g. Sentry.captureException(error, { extra: context });
            console.error(JSON.stringify(logData)); // Fallback generic log
        }
    },

    error: (message: string, error?: any, context?: Record<string, any>) => {
        errorLogger.log({ message, error, level: 'error', context });
    },

    warn: (message: string, context?: Record<string, any>) => {
        errorLogger.log({ message, level: 'warn', context });
    }
};
