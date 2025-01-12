import React from 'react';
import { motion } from 'framer-motion';
import { ScreenProps } from './ScreenNavigation'; // Import shared types

interface CampaignOptionsProps extends ScreenProps {
    option: 'campaign' | 'status'; // Define specific options for this component
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
