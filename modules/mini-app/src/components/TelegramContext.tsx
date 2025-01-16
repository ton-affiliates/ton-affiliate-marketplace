// src/components/TelegramContext.tsx
import React, { createContext, useState, useContext } from 'react';

interface TelegramUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  // anything else from your DB
}

// This is what our context will provide
interface TelegramContextType {
  userInfo: TelegramUser | null;
  setUserInfo: React.Dispatch<React.SetStateAction<TelegramUser | null>>;
}

export const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<TelegramUser | null>(null);

  return (
    <TelegramContext.Provider value={{ userInfo, setUserInfo }}>
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
