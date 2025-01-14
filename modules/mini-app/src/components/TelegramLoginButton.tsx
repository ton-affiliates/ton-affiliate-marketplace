import React, { useEffect } from 'react';

interface TelegramLoginButtonProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({ setIsLoggedIn }) => {
  useEffect(() => {
    // The callback for successful login
    (window as any).onTelegramAuth = (userData: unknown) => {
      console.log('Telegram auth success:', userData);
      setIsLoggedIn(true);
    };

    // Create the script element
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?15';
    script.setAttribute('data-telegram-login', 'ton_affiliates_verifier_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-auth-url', `https://${import.meta.env.VITE_SERVER_NAME}/api/v1/auth/telegram`);
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');

    // Append to DOM
    document.getElementById('telegram-button-root')?.appendChild(script);

    // Cleanup if component unmounts
    return () => {
      (window as any).onTelegramAuth = null;
      script.remove();
    };
  }, [setIsLoggedIn]);

  return (
    <div>
      <div id="telegram-button-root" />
    </div>
  );
};

export default TelegramLoginButton;
