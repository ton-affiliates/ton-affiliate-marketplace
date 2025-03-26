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
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
    >
      <div className="card" style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px', width: '100%' }}>
        <p>
          <strong>
            Hi {userInfo?.firstName || 'Affiliate'}!
          </strong>
        </p>
        <p>What would you like to do?</p>

        {/* Button block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            className="custom-button"
            onClick={() => navigate('/campaigns')}
          >
            View My Campaigns
          </button>

          <button
            className="custom-button"
            onClick={() => navigate('/marketplace')}
          >
            Explore Campaign Marketplace
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AffiliateOptions;
