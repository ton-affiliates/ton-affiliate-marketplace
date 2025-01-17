// src/components/MainScreen.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; 
import { useUserRole } from './UserRoleContext';
import { useTelegramContext } from './TelegramContext';
import useScrollToTop from '../hooks/scrollToStart';

const MainScreen: React.FC = () => {
  const { setUserRole } = useUserRole();
  const { userInfo } = useTelegramContext();
  const navigate = useNavigate();

  const handleRoleSelection = (role: 'Advertiser' | 'Affiliate') => {
    setUserRole(role);
    // Instead of setScreen('login'):
    navigate('/login');
  };

  useScrollToTop();

  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="card">
        <h1>Hi {userInfo?.firstName || 'There'}!</h1>
        <p>
          Are you an Affiliate looking for active campaigns, or an Advertiser looking to set up a referral campaign?
        </p>
        <div className="button-group">
          <button
            className="custom-button"
            onClick={() => handleRoleSelection('Advertiser')}
          >
            Advertiser
          </button>
          <button
            className="custom-button"
            onClick={() => handleRoleSelection('Affiliate')}
          >
            Affiliate
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MainScreen;
