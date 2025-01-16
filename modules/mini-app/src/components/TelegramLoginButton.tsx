import React, { useEffect, useState } from 'react';
import { useTelegramContext } from './TelegramContext'; // Path depends on your folder structure

interface TelegramLoginButtonProps {
  setIsLoggedIn?: React.Dispatch<React.SetStateAction<boolean>>;
  onLoginSuccess?: (userData: any) => void;
}

const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
  setIsLoggedIn,
  onLoginSuccess,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // We destructure setUserInfo from our TelegramContext
  const { setUserInfo } = useTelegramContext();

  useEffect(() => {
    (window as any).onTelegramAuth = async (telegramData: any) => {
      console.log('Telegram auth success (raw data):', telegramData);
      try {
        setErrorMessage(null);
        const res = await fetch('/api/v1/auth/telegram-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telegramData),
        });
        const dbResp = await res.json();
        console.log('Server /telegram-verify response:', dbResp);

        if (dbResp.success) {
          // If canMessage === false, show a prompt
          if (dbResp.canMessage === false) {
            setErrorMessage(
              `We verified your Telegram info, but our bot can't message you yet. 
               Please open Telegram and tap "Start" on @ton_affiliates_bot:
               https://t.me/ton_affiliates_bot`
            );
            return;
          }

          // Full success => store user in context
          console.log('User verified and bot can message them:', dbResp.user);
          setUserInfo(dbResp.user); // <--- store in context

          // If a setIsLoggedIn is provided, set it
          if (setIsLoggedIn) setIsLoggedIn(true);

          // If a parent callback is provided
          if (onLoginSuccess) onLoginSuccess(dbResp.user);
        } else {
          console.error('Telegram verify returned an error:', dbResp.error);
          setErrorMessage(`Telegram verify returned an error: ${dbResp.error}`);
        }
      } catch (err: any) {
        console.error('Error calling /telegram-verify:', err);
        setErrorMessage(`Error calling /telegram-verify: ${String(err)}`);
      }
    };

    // Create the <script> element
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?15';
    script.setAttribute('data-telegram-login', 'ton_affiliates_bot'); 
    script.setAttribute('data-size', 'large');
    // script.setAttribute('data-auth-url', 'https://your-server.com/api/v1/auth/telegram'); // optional
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');

    document.getElementById('telegram-button-root')?.appendChild(script);

    // Cleanup
    return () => {
      (window as any).onTelegramAuth = null;
      script.remove();
    };
  }, [setIsLoggedIn, onLoginSuccess, setUserInfo]);

  return (
    <div>
      <div id="telegram-button-root" />
      {errorMessage && (
        <p style={{ color: 'red', marginTop: '1rem', whiteSpace: 'pre-line' }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default TelegramLoginButton;
