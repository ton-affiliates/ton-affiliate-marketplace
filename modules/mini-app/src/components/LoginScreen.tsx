import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from './UserRoleContext';
import { useTelegramContext } from './TelegramContext';

const LoginScreen: React.FC = () => {
  const { userRole } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { setUserInfo } = useTelegramContext();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get the bot name from environment variables
  const botName = import.meta.env.VITE_TON_AFFILIATES_BOT;
  console.log(`Bot name: ${botName}`);

  // Capture the "from" location, default to "/"
  const from = location.state?.from || '/';

  //
  // 1) Called once the server says the user can proceed
  //
  function handleLoginSuccess(userObj: any) {
    // Store user in Telegram context
    setUserInfo({
      id: userObj.id,
      firstName: userObj.first_name,
      lastName: userObj.last_name,
      username: userObj.username,
      photoUrl: userObj.photo_url,
    });

    // Also persist in localStorage
    localStorage.setItem('telegramUser', JSON.stringify(userObj));

    // Redirect logic:
    // - If the user came from a page other than MainScreen ('/'), return them there.
    // - If they came from MainScreen ('/'), redirect them to the correct route based on role.
    if (from !== '/') {
      navigate(from, { replace: true });
    } else {
      if (userRole === 'Advertiser') {
        navigate('/advertiser', { replace: true });
      } else {
        navigate('/affiliate', { replace: true });
      }
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
          // Warn if bot can't message user
          if (dbResp.user.canMessage === false) {
            setErrorMessage(`We verified your Telegram info, but our bot can't message you yet. 
              To receive direct messages, open Telegram and tap "Start" on @${botName}: 
              https://t.me/${botName}`);
          }
          // Proceed with login success handling
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
  }, [setUserInfo, userRole, navigate, botName, from]);

  //
  // 3) Dynamically create the <script> for the Telegram widget
  //
  useEffect(() => {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?15';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');

    const container = document.getElementById('telegram-button-root');
    container?.appendChild(script);

    return () => {
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
