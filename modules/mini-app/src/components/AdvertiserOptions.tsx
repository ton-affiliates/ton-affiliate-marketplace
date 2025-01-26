import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; 
import { useTelegramContext } from './TelegramContext'; 
// We no longer import ScreenProps since we don't need setScreen.

const AdvertiserOptions: React.FC = () => {
  // Instead of setScreen, useNavigate from React Router
  const navigate = useNavigate();
  const { userInfo } = useTelegramContext();

  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="card">
        <p>
          <strong>
            Hi {userInfo?.firstName || 'Advertiser'}!
          </strong>
        </p>
        <p>What would you like to do?</p>
        <div className="button-group">
          <button
            className="custom-button no-padding"
            onClick={() => navigate('/deploy')}
          >
            Set up a new campaign
          </button>

          <button
            className="custom-button no-padding"
            onClick={() => navigate('/campaigns')}
          >
            Check live campaigns
          </button>
        </div>

        <div className="navigation-buttons">
          <button
            className="nav-button"
            // Was: onClick={() => setScreen('main')}
            onClick={() => navigate('/')}
          >
            Go to Main Screen
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdvertiserOptions;
