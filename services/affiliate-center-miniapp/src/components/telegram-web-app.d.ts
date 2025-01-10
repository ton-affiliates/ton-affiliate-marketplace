interface TelegramWebAppUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
  }
  
  interface TelegramWebAppInitDataUnsafe {
    user?: TelegramWebAppUser;
    [key: string]: any;
  }
  
  interface TelegramWebApp {
    initData: string;
    initDataUnsafe: TelegramWebAppInitDataUnsafe;
    ready: () => void;
  }
  
  interface TelegramGlobal {
    WebApp: TelegramWebApp;
  }
  
  interface Window {
    Telegram: TelegramGlobal;
  }