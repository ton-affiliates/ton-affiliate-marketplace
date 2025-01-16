import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MainScreen from './components/MainScreen';
import AdvertiserOptions from './components/AdvertiserOptions';
import BlockchainSetupCampaign from './components/BlockchainSetupCampaign'; 
// Or whatever you named the default export
import DeployEmptyCampaign from './components/DeployEmptyCampaign';
import TelegramSetup from './components/TelegramSetupCampaign';
import { TonConnectButton } from '@tonconnect/ui-react';
import { TonConnectProvider } from './components/TonConnectProvider';

import { TelegramProvider } from './components/TelegramContext';
import { TelegramCampaignProvider } from './components/TelegramCampaignContext';
import { ScreenTypes } from './components/ScreenNavigation';
import LoginScreen from './components/LoginScreen';

const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenTypes>('main');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [_, setIsLoggedIn] = useState(false); // rename '_' to 'isLoggedIn'

  const renderScreen = () => {
    switch (screen) {
      case 'main':
        return <MainScreen setScreen={setScreen} />;
      case 'advertiser':
        return <AdvertiserOptions setScreen={setScreen} />;

      // If you previously called "campaign" -> "NewCampaign", rename or keep it as you like
      case 'campaign':
        return <BlockchainSetupCampaign setScreen={setScreen} />;

      case 'status':
        return null;
      case 'setupTelegram':
        return <TelegramSetup setScreen={setScreen} campaignId={campaignId} />;
      case 'deployEmptyCampaign':
        return <DeployEmptyCampaign setScreen={setScreen} setCampaignId={setCampaignId} />;
      case 'login':
        return <LoginScreen setIsLoggedIn={setIsLoggedIn} setScreen={setScreen} />;

      // NEW SCREEN
      case 'blockchainCampaignSetup':
        return <BlockchainSetupCampaign setScreen={setScreen} />;

      default:
        return <MainScreen setScreen={setScreen} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="app-container"
    >
      <TelegramProvider>
        <TelegramCampaignProvider>
          <TonConnectProvider>
            {/* Show wallet connect button only if not on 'main' or 'login' */}
            {screen !== 'main' && screen !== 'login' && (
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <TonConnectButton />
              </div>
            )}
            {renderScreen()}
          </TonConnectProvider>
        </TelegramCampaignProvider>
      </TelegramProvider>
    </motion.div>
  );
};

export default App;
