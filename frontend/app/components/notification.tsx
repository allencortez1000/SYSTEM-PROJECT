"use client";

import React, { createContext, useCallback, useContext, useState } from 'react';
import Toast from './toast';

type NotificationContextValue = {
  notify: (message: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const notify = useCallback((m: string) => {
    setMessage(m);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <Toast message={message} onClose={() => setMessage(null)} />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

export default NotificationContext;
