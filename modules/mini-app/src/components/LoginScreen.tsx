// src/components/LoginScreen.tsx
import React from 'react';
import TelegramLoginButton from './TelegramLoginButton';
import { useUserRole } from './UserRoleContext';
import { ScreenTypes } from './ScreenNavigation';

interface LoginScreenProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setScreen: React.Dispatch<React.SetStateAction<ScreenTypes>>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ setIsLoggedIn, setScreen }) => {
  // Pull the current role from context (set previously in MainScreen)
  const { userRole } = useUserRole();

  // This function is triggered once Telegram login is successful
  const handleLoginSuccess = () => {
    // Mark user as logged in
    setIsLoggedIn(true);

    // Decide which screen to show based on role
    if (userRole === 'Advertiser') {
      setScreen('advertiser');
    } else {
      setScreen('status'); // or whatever your Affiliate screen is
    }
  };

  return (
    <div style={{ margin: 'auto', textAlign: 'center' }}>
      <h1>Login with Telegram</h1>
      <p>Please click the button below to log in via Telegram.</p>
      <TelegramLoginButton onLoginSuccess={handleLoginSuccess} />
    </div>
  );
};

export default LoginScreen;
