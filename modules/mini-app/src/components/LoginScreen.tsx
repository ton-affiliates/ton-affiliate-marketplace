import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from './UserRoleContext';
import { useTelegramContext } from './TelegramContext';

const LoginScreen: React.FC = () => {
  const { userRole } = useUserRole();
  const navigate = useNavigate();
  const { setUserInfo } = useTelegramContext();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get the bot name from environment variables
  const botName = import.meta.env.VITE_TON_AFFILIATES_BOT;
  console.log(`Bot name: ${botName}`);

  //
  // 1) Called once the server says the user can proceed
  //
  function handleLoginSuccess(userObj: any) {
    // userObj might have { id, first_name, last_name, username, photo_url, etc. }

    // Store user in Telegram context
    setUserInfo({
      id: userObj.id,
      firstName: userObj.first_name,
      lastName: userObj.last_name,
      username: userObj.username,
      photoUrl: userObj.photo_url,
    });

    // Also persist in localStorage (or sessionStorage if you prefer)
    localStorage.setItem('telegramUser', JSON.stringify(userObj));

    // Decide route based on role
    if (userRole === 'Advertiser') {
      navigate('/merchant');
    } else {
      navigate('/affiliate');
    }
  }

  //
  // 2) Define the global callback for Telegram
  //
  useEffect(() => {
    (window as any).onTelegramAuth = async (telegramData: any) => {
      console.log('[LoginScreen] Telegram auth success (raw data):', telegramData);

      try {
        setErrorMessage(null);

        // Verify with your server
        const res = await fetch('/api/v1/auth/telegram-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telegramData),
        });
        const dbResp = await res.json();
        console.log('Server /telegram-verify response:', dbResp);

        if (dbResp.success) {
          // If the bot can't message the user, just warn but don't block
          if (dbResp.canMessage === false) {
            setErrorMessage(`
              We verified your Telegram info, but our bot can't message you yet. 
              To recieve direct messages open Telegram and tap "Start" on @${botName}:
              https://t.me/${botName}
            `);
          }
          // Proceed to the next step
          handleLoginSuccess(dbResp.user);
        } else {
          console.error('Telegram verify error:', dbResp.error);
          setErrorMessage(`Telegram verify error: ${dbResp.error}`);
        }
      } catch (err: any) {
        console.error('Error calling /telegram-verify:', err);
        setErrorMessage(`Error calling /telegram-verify: ${String(err)}`);
      }
    };

    // Cleanup on unmount
    return () => {
      (window as any).onTelegramAuth = null;
    };
  }, [setUserInfo, userRole, navigate, botName]);

  //
  // 3) Dynamically create the <script> for the Telegram widget
  //
  useEffect(() => {
    const script = document.createElement('script');
    script.async = true;
    // The official widget script
    script.src = 'https://telegram.org/js/telegram-widget.js?15';
    // Use the bot name from the environment variable
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-request-access', 'write');
    // Ties to our global callback name
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');

    const container = document.getElementById('telegram-button-root');
    container?.appendChild(script);

    return () => {
      // Remove the script if we leave this page
      script.remove();
    };
  }, [botName]);

  return (
    <div style={{ margin: 'auto', textAlign: 'center' }}>
      <h1>Login with Telegram</h1>
      <p>Please click the button below to log in via Telegram.</p>

      {/* 4) The container where the Telegram widget will append the button */}
      <div id="telegram-button-root" />

      {/* 5) Any warnings/errors */}
      {errorMessage && (
        <p style={{ color: 'red', marginTop: '1rem', whiteSpace: 'pre-line' }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default LoginScreen;
