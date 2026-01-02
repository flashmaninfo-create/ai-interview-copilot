import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationContextType {
    showNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showNotification = useCallback((message: string, type: NotificationType) => {
        const id = Math.random().toString(36).substring(7);
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 3000);
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`min-w-[300px] p-4 rounded-lg shadow-lg text-white transform transition-all duration-300 animate-slide-in ${notification.type === 'success' ? 'bg-green-600' :
                            notification.type === 'error' ? 'bg-red-600' :
                                'bg-blue-600'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-medium">{notification.message}</span>
                            <button
                                onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notification.id))}
                                className="ml-4 hover:text-white/80"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
