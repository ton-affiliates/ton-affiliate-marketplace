import React, { createContext, useState, useContext, useEffect } from 'react';

interface TelegramUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  // etc...
}

interface TelegramContextType {
  userInfo: TelegramUser | null;
  setUserInfo: React.Dispatch<React.SetStateAction<TelegramUser | null>>;
  loading: boolean;
}

// Create the context
const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<TelegramUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a user in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('telegramUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserInfo(parsed);
      } catch (err) {
        console.error('Error parsing user from localStorage:', err);
      }
    }
    // We're done checking local storage
    setLoading(false);
  }, []);

  // Whenever userInfo changes, we can update localStorage as well
  useEffect(() => {
    if (userInfo) {
      localStorage.setItem('telegramUser', JSON.stringify(userInfo));
    } else {
      localStorage.removeItem('telegramUser');
    }
  }, [userInfo]);

  return (
    <TelegramContext.Provider value={{ userInfo, setUserInfo, loading }}>
      {children}
    </TelegramContext.Provider>
  );
};

export function useTelegramContext() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegramContext must be used within a TelegramProvider');
  }
  return context;
}
