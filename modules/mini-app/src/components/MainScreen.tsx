import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { useUserRole } from './UserRoleContext';
import { TelegramContext } from './TelegramContext';
import useScrollToTop from '../hooks/scrollToStart';
import { ScreenProps } from './ScreenNavigation'; // Use centralized ScreenProps type

const MainScreen: React.FC<ScreenProps> = ({ setScreen }) => {
  const { setUserRole } = useUserRole();
  const { userInfo } = useContext(TelegramContext);

  const handleRoleSelection = (role: 'Advertiser' | 'Affiliate') => {
    setUserRole(role);
    // Go to 'login' so user can do the Telegram login flow
    setScreen('login');
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
          Are you an Affiliate looking for active campaigns, or an Advertiser looking to set up a
          referral campaign?
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
