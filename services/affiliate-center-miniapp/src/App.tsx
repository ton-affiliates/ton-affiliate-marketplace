import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MainScreen from './components/MainScreen';
import AdvertiserOptions from './components/AdvertiserOptions';
import NewCampaign from './components/NewCampaign';
import DeployEmptyCampaign from './components/DeployEmptyCampaign';
import TelegramSetup from './components/TelegramSetup';
import { TonConnectButton } from '@tonconnect/ui-react';
import { TonConnectProvider } from './TonConnectProvider';
import { TelegramProvider } from './TelegramContext';
import { TelegramCampaignProvider } from './TelegramCampaignContext';
import { ScreenTypes } from './components/ScreenNavigation'; // Reuse ScreenTypes

const App: React.FC = () => {
  // State for managing the active screen
  const [screen, setScreen] = useState<ScreenTypes>('main');
  
  // State for managing the campaignId
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const renderScreen = () => {
    switch (screen) {
      case 'main':
        return <MainScreen setScreen={setScreen} />;
      case 'advertiser':
        return <AdvertiserOptions setScreen={setScreen} />;
      case 'campaign':
        return <NewCampaign setScreen={setScreen} />;
      case 'status':
        return null; // TMP <CampaignStatus setScreen={setScreen} />;
      case 'setupTelegram':
        return <TelegramSetup setScreen={setScreen} campaignId={campaignId} />;
      case 'deployEmptyCampaign':
        return <DeployEmptyCampaign setScreen={setScreen} setCampaignId={setCampaignId} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="app-container"
    >
      {/* Wrapping everything in providers */}
      <TelegramProvider>
        <TelegramCampaignProvider>
          <TonConnectProvider>
            {/* Wallet Connect Button at Top Right */}
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <TonConnectButton />
            </div>
            {/* Render the selected screen */}
            {renderScreen()}
          </TonConnectProvider>
        </TelegramCampaignProvider>
      </TelegramProvider>
    </motion.div>
  );
};

export default App;
