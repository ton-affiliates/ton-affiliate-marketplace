// src/components/LoginScreen.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom'; // For navigation
import TelegramLoginButton from './TelegramLoginButton';
import { useUserRole } from './UserRoleContext';
import { useTelegramContext } from './TelegramContext'; // <-- Import the context hook

const LoginScreen: React.FC = () => {
  const { userRole } = useUserRole();
  const navigate = useNavigate();

  // 1) Pull setUserInfo from the Telegram context
  const { setUserInfo } = useTelegramContext();

  // 2) Called once Telegram login is successful
  const handleLoginSuccess = (telegramUserData: any) => {
    // For example, telegramUserData might have { id, first_name, last_name, username, photo_url }

    // 3) Store the user data in the context
    setUserInfo({
      id: telegramUserData.id,
      firstName: telegramUserData.first_name,
      lastName: telegramUserData.last_name,
      username: telegramUserData.username,
      photoUrl: telegramUserData.photo_url,
    });

    // 4) Decide which route to show based on role
    if (userRole === 'Advertiser') {
      navigate('/merchant');
    } else {
      navigate('/affiliate');
    }
  };

  return (
    <div style={{ margin: 'auto', textAlign: 'center' }}>
      <h1>Login with Telegram</h1>
      <p>Please click the button below to log in via Telegram.</p>
      {/* 5) Pass our handleLoginSuccess to the TelegramLoginButton */}
      <TelegramLoginButton onLoginSuccess={handleLoginSuccess} />
    </div>
  );
};

export default LoginScreen;
