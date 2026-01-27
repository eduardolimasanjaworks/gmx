
export interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    details?: any;
}

const LOG_KEY = 'gmx_system_logs';
const MAX_LOGS = 100;

export const Logger = {
    getLogs: (): LogEntry[] => {
        try {
            const stored = localStorage.getItem(LOG_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },

    saveLogs: (logs: LogEntry[]) => {
        localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    },

    add: (level: 'INFO' | 'WARN' | 'ERROR', message: string, details?: any) => {
        const logs = Logger.getLogs();
        const newEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            details: details ? JSON.stringify(details, null, 2) : undefined
        };

        // Add absolute logging to console as well
        if (level === 'ERROR') console.error(`[Logger] ${message}`, details);
        else console.log(`[Logger] ${message}`, details);

        logs.unshift(newEntry); // Add to beginning
        if (logs.length > MAX_LOGS) logs.pop(); // Keep size check

        Logger.saveLogs(logs);
    },

    info: (message: string, details?: any) => Logger.add('INFO', message, details),
    warn: (message: string, details?: any) => Logger.add('WARN', message, details),
    error: (message: string, details?: any) => Logger.add('ERROR', message, details),

    clear: () => {
        localStorage.removeItem(LOG_KEY);
    }
};
