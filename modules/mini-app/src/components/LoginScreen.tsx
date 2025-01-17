// src/components/LoginScreen.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom'; // For navigation
import TelegramLoginButton from './TelegramLoginButton';
import { useUserRole } from './UserRoleContext';

const LoginScreen: React.FC = () => {
  const { userRole } = useUserRole();
  const navigate = useNavigate();

  // Triggered once Telegram login is successful
  const handleLoginSuccess = () => {
    // Decide which route to show based on role
    if (userRole === 'Advertiser') {
      // Instead of setScreen('advertiser'):
      navigate('/advertiser');
    } else {
      // e.g., /affiliate-status or something
      navigate('/status');
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
