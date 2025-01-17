import React from 'react';
import { motion } from 'framer-motion';
// We remove "ScreenProps" since we don't use setScreen for navigation anymore
// import { ScreenProps } from './ScreenNavigation';

interface CampaignOptionsProps {
  option: 'campaign' | 'status'; // Provide whatever props you need
}

const CampaignOptions: React.FC<CampaignOptionsProps> = ({ option }) => {
  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h1>
        {option === 'campaign'
          ? 'Set up a new campaign'
          : 'Live campaign status'}
      </h1>
      <p>
        {option === 'campaign'
          ? 'Form for new campaign setup...'
          : 'Live campaign stats...'}
      </p>

      {/* 
         If you need navigation, you can use React Router's `useNavigate()` or <Link> here.
         Example: 
         
         const navigate = useNavigate();
         
         <button onClick={() => navigate('/some-route')}>Go</button>
      */}

      <div className="navigation-buttons">
        <button className="nav-button" onClick={() => window.history.back()}>
          Go Back
        </button>
        <button className="nav-button" onClick={() => (window.location.href = '/')}>
          Go to Main Screen
        </button>
      </div>
    </motion.div>
  );
};

export default CampaignOptions;
