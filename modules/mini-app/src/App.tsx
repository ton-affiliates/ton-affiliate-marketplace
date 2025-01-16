import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MainScreen from './components/MainScreen';
import AdvertiserOptions from './components/AdvertiserOptions';
import NewCampaign from './components/NewCampaign';
import DeployEmptyCampaign from './components/DeployEmptyCampaign';
import TelegramSetup from './components/TelegramSetup';
import { TonConnectButton } from '@tonconnect/ui-react';
import { TonConnectProvider } from './components/TonConnectProvider';

// This is the new/updated TelegramProvider storing userInfo
import { TelegramProvider } from './components/TelegramContext';

import { TelegramCampaignProvider } from './components/TelegramCampaignContext';
import { ScreenTypes } from './components/ScreenNavigation';
import LoginScreen from './components/LoginScreen';

const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenTypes>('main');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  // rename '_' to 'isLoggedIn'
  const [_, setIsLoggedIn] = useState(false);

  const renderScreen = () => {
    switch (screen) {
      case 'main':
        return <MainScreen setScreen={setScreen} />;
      case 'advertiser':
        return <AdvertiserOptions setScreen={setScreen} />;
      case 'campaign':
        return <NewCampaign setScreen={setScreen} />;
      case 'status':
        return null;
      case 'setupTelegram':
        return <TelegramSetup setScreen={setScreen} campaignId={campaignId} />;
      case 'deployEmptyCampaign':
        return <DeployEmptyCampaign setScreen={setScreen} setCampaignId={setCampaignId} />;
      case 'login':
        return <LoginScreen setIsLoggedIn={setIsLoggedIn} setScreen={setScreen} />;
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
