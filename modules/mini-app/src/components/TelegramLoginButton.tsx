import React, { useEffect, useState } from 'react';

interface TelegramLoginButtonProps {
  setIsLoggedIn?: React.Dispatch<React.SetStateAction<boolean>>;
  onLoginSuccess?: (userData: any) => void;
}

const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
  setIsLoggedIn,
  onLoginSuccess,
}) => {
  // Local state to display an error message in the UI
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // The callback for successful login (Telegram widget calls "onTelegramAuth(user)")
    (window as any).onTelegramAuth = async (telegramData: any) => {
      console.log('Telegram auth success (raw data):', telegramData);

      try {
        // Reset any previous error
        setErrorMessage(null);

        // 1) Call your POST /api/v1/auth/telegram-verify endpoint to validate & upsert user
        const res = await fetch('/api/v1/auth/telegram-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telegramData),
        });

        const dbResp = await res.json();
        console.log('Server /telegram-verify response:', dbResp);

        if (dbResp.success) {
          // CASE 1: The user is verified, but "canMessage" is false => Bot can't message them yet
          if (dbResp.canMessage === false) {
            setErrorMessage(
              `We verified your Telegram info, but our bot can't message you yet. 
               Please open Telegram and tap "Start" on @ton_affiliates_bot:
               https://t.me/ton_affiliates_bot`
            );
            return; // Stop here, so user sees the message
          }

          // CASE 2: canMessage === true => Full success
          console.log('User verified and bot can message them:', dbResp.user);

          // If a setIsLoggedIn is provided, set it
          if (setIsLoggedIn) {
            setIsLoggedIn(true);
          }

          // If a parent callback is provided, invoke it with the user record
          if (onLoginSuccess) {
            onLoginSuccess(dbResp.user);
          }
        } else {
          // If the backend returned success=false, or an error
          console.error('Telegram verify returned an error:', dbResp.error);
          setErrorMessage(`Telegram verify returned an error: ${dbResp.error}`);
        }
      } catch (err: any) {
        console.error('Error calling /telegram-verify:', err);
        setErrorMessage(`Error calling /telegram-verify: ${String(err)}`);
      }
    };

    // Create the <script> element for Telegram widget
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?15';
    script.setAttribute('data-telegram-login', 'ton_affiliates_bot'); // Replace with your bot's username
    script.setAttribute('data-size', 'large');
    // If you want to avoid Telegram's auto-callback to /api/v1/auth/telegram, omit data-auth-url:
    // script.setAttribute('data-auth-url', 'https://your-server.com/api/v1/auth/telegram');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');

    document.getElementById('telegram-button-root')?.appendChild(script);

    // Cleanup if component unmounts
    return () => {
      (window as any).onTelegramAuth = null;
      script.remove();
    };
  }, [setIsLoggedIn, onLoginSuccess]);

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
