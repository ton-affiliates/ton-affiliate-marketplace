// src/components/AffiliateOptions.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTelegramContext } from './TelegramContext';

const AffiliateOptions: React.FC = () => {
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
            Hi {userInfo?.firstName || 'Affiliate'}!
          </strong>
        </p>
        <p>What would you like to do?</p>

        <div className="button-group">
          <button
            className="custom-button no-padding"
            onClick={() => navigate('/campaigns')}
          >
            View My Campaigns
          </button>
        </div>

        <div className="navigation-buttons">
          <button
            className="nav-button"
            onClick={() => navigate('/')}
          >
            Go to Main Screen
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AffiliateOptions;
