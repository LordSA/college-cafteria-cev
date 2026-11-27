'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface StoreStatusContextType {
  isOpen: boolean;
  closedMessage: string;
  loading: boolean;
  refreshStatus: () => Promise<void>;
}

const StoreStatusContext = createContext<StoreStatusContextType>({
  isOpen: true,
  closedMessage: 'We are currently closed.',
  loading: true,
  refreshStatus: async () => {},
});

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [closedMessage, setClosedMessage] = useState<string>('We are currently closed.');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/store-status?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setIsOpen(Boolean(json.data.is_open));
          if (json.data.message) {
            setClosedMessage(json.data.message);
          }
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(fetchStatus, 20000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStatus]);

  return (
    <StoreStatusContext.Provider
      value={{
        isOpen,
        closedMessage,
        loading,
        refreshStatus: fetchStatus,
      }}
    >
      {children}
    </StoreStatusContext.Provider>
  );
}

export function useStoreStatus() {
  return useContext(StoreStatusContext);
}
