import React from 'react';
import { motion } from 'framer-motion';

interface CampaignOptionsProps {
    option: 'campaign' | 'status';
    setScreen: React.Dispatch<React.SetStateAction<'main' | 'advertiser' | 'campaign' | 'status' | 'setupTelegram'>>;
}

const CampaignOptions: React.FC<CampaignOptionsProps> = ({ option, setScreen }) => {
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
            <div className="navigation-buttons">
                <button
                    className="nav-button"
                    onClick={() => setScreen('advertiser')}
                >
                    Go Back
                </button>
                <button
                    className="nav-button"
                    onClick={() => setScreen('main')}
                >
                    Go to Main Screen
                </button>
            </div>
        </motion.div>
    );
};

export default CampaignOptions;