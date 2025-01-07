import React from 'react';
import { motion } from 'framer-motion';
import { ScreenProps } from './ScreenNavigation'; // Import ScreenProps for type consistency

const AdvertiserOptions: React.FC<ScreenProps> = ({ setScreen }) => {
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
                        Hi Advertiser!
                    </strong>
                </p>
                <p>
                    What would you like to do?
                </p>
                <div className="button-group">
                    <button
                        className="custom-button no-padding"
                        onClick={() => setScreen('deployEmptyCampaign')}
                    >
                        Set up a new campaign
                    </button>
                    <button
                        className="custom-button no-padding"
                        onClick={() => setScreen('status')}
                    >
                        Check live campaign status
                    </button>
                </div>
                <div className="navigation-buttons">
                    <button
                        className="nav-button"
                        onClick={() => setScreen('main')}
                    >
                        Go to Main Screen
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default AdvertiserOptions;
