// src/components/LoginScreen.tsx
import React from 'react';
import TelegramLoginButton from './TelegramLoginButton';

interface LoginScreenProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ setIsLoggedIn }) => {
  return (
    <div style={{ margin: 'auto', textAlign: 'center' }}>
      <h1>Login with Telegram</h1>
      <p>Please click the button below to log in via Telegram.</p>
      {/* Pass setIsLoggedIn down to TelegramLoginButton so it can update login status on success */}
      <TelegramLoginButton setIsLoggedIn={setIsLoggedIn} />
    </div>
  );
};

export default LoginScreen;
