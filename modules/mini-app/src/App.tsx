import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import MainScreen from './components/MainScreen';
import AdvertiserOptions from './components/AdvertiserOptions';
import DeployEmptyCampaign from './components/DeployEmptyCampaign';
import TelegramSetupCampaign from './components/TelegramSetupCampaign';
import BlockchainSetupCampaign from './components/BlockchainSetupCampaign';
import CampaignView from './components/CampaignView';
import LoginScreen from './components/LoginScreen';
import Campaigns from './components/Campaigns';
import { TonConnectButton } from '@tonconnect/ui-react';
import { TonConnectProvider } from './components/TonConnectProvider';
import { TelegramProvider } from './components/TelegramContext';
import { TelegramCampaignProvider } from './components/TelegramCampaignContext';
import AffiliateOptions from 'components/AffiliateOptions';


function App() {
  console.log('[App] rendering with React Router...');

  return (
    <BrowserRouter>
      <TelegramProvider>
        <TelegramCampaignProvider>
          <TonConnectProvider>
            <AppContent />
          </TonConnectProvider>
        </TelegramCampaignProvider>
      </TelegramProvider>
    </BrowserRouter>
  );
}

/** 
 * We split out the main <AppContent /> so we can call useLocation(),
 * which must be used inside a <BrowserRouter> (as in the main App).
 */
function AppContent() {
  const location = useLocation();

  // Hide TonConnect button on these paths:
  const hideTonConnectOn = ['/', '/login'];
  const shouldHideTonConnect = hideTonConnectOn.includes(location.pathname);

  return (
    <>
      {/* Conditionally render the TonConnect button */}
      {!shouldHideTonConnect && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <TonConnectButton />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="app-container"
      >
        <Routes>
          <Route path="/" element={<MainScreen />} />
          <Route path="/merchant" element={<AdvertiserOptions />} />
          <Route path="/affiliate" element={<AffiliateOptions />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/deploy" element={<DeployEmptyCampaign />} />
          <Route path="/telegram-setup/:campaignId" element={<TelegramSetupCampaign />} />
          <Route path="/blockchain-setup/:campaignId" element={<BlockchainSetupCampaign />} />
          <Route path="/campaign/:id" element={<CampaignView />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="*" element={<MainScreen />} />
        </Routes>
      </motion.div>
    </>
  );
}

export default App;
