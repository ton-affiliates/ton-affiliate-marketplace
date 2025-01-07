import React, { useState } from 'react';
import { motion } from 'framer-motion';
// import { UserRoleProvider } from "./UserRoleContext"; // Import the context provider
import MainScreen from './components/MainScreen';
import AdvertiserOptions from './components/AdvertiserOptions';
import CampaignStatus from './components/CampaignStatus';
import NewCampaign from './components/NewCampaign';
import DeployEmptyCampaign from './components/DeployEmptyCampaign';
import { TonConnectProvider } from './TonConnectProvider';
import { TelegramProvider } from './TelegramContext';
import { TelegramCampaignProvider } from './TelegramCampaignContext';
import TelegramSetup from './components/TelegramSetup';

const App: React.FC = () => {
  const [screen, setScreen] = useState<
    'main' | 'advertiser' | 'campaign' | 'status' | 'setupTelegram' | 'deployEmptyCampaign'
  >('main');

  const [campaignId, setCampaignId] = useState<string | null>(null); // State to store campaignId

  const renderScreen = () => {
    switch (screen) {
      case 'main':
        return <MainScreen setScreen={setScreen} />;
      case 'advertiser':
        return <AdvertiserOptions setScreen={setScreen} />;
      case 'campaign':
        return <NewCampaign setScreen={setScreen} />;
      case 'status':
        return <CampaignStatus setScreen={setScreen} />;
      case 'setupTelegram':
        return <TelegramSetup setScreen={setScreen} campaignId={campaignId} />; // Pass campaignId
      case 'deployEmptyCampaign':
        return <DeployEmptyCampaign setScreen={setScreen} setCampaignId={setCampaignId} />; // Pass setCampaignId
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="app-container"
    >
      {/* <UserRoleProvider> */}
      <TelegramProvider>
        <TelegramCampaignProvider>
          <TonConnectProvider>
            {renderScreen()}
          </TonConnectProvider>
        </TelegramCampaignProvider>
      </TelegramProvider>
      {/* </UserRoleProvider> */}
    </motion.div>
  );
};

export default App;
