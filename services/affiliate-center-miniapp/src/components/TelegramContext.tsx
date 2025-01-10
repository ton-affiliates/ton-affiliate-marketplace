import React, { createContext, useEffect, useState, ReactNode } from "react";

interface TelegramUserInfo {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode: string;
}

interface TelegramContextProps {
  userInfo: TelegramUserInfo | null;
  initData: string | null;
  initDataUnsafe: object | null;
}

export const TelegramContext = createContext<TelegramContextProps>({
  userInfo: null,
  initData: null,
  initDataUnsafe: null,
});

export const TelegramProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<TelegramUserInfo | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [initDataUnsafe, setInitDataUnsafe] = useState<object | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tgWebApp = window.Telegram.WebApp;

      // Initialize the Telegram Web App
      tgWebApp.ready();

      // Retrieve initial data and user information
      setInitData(tgWebApp.initData);
      setInitDataUnsafe(tgWebApp.initDataUnsafe);

      // Set user info if available
      if (tgWebApp.initDataUnsafe.user) {
        const user = tgWebApp.initDataUnsafe.user;
        setUserInfo({
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name || undefined,
          username: user.username || undefined,
          languageCode: user.language_code,
        });
      }
    }
  }, []);

  return (
    <TelegramContext.Provider
      value={{
        userInfo,
        initData,
        initDataUnsafe,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
};