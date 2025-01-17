// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';

// Import your existing components:
import MainScreen from './components/MainScreen';
import AdvertiserOptions from './components/AdvertiserOptions';
import DeployEmptyCampaign from './components/DeployEmptyCampaign';
import TelegramSetupCampaign from './components/TelegramSetupCampaign';
import BlockchainSetupCampaign from './components/BlockchainSetupCampaign';
import CampaignView from './components/CampaignView'; 
import LoginScreen from './components/LoginScreen';

// TonConnect + Telegram Providers
import { TonConnectButton } from '@tonconnect/ui-react';
import { TonConnectProvider } from './components/TonConnectProvider';
import { TelegramProvider } from './components/TelegramContext';
import { TelegramCampaignProvider } from './components/TelegramCampaignContext';

function App() {
  console.log('[App] rendering with React Router...');

  return (
    <BrowserRouter>
      <TelegramProvider>
        <TelegramCampaignProvider>
          <TonConnectProvider>
            {/* The TonConnect button if you still want it globally */}
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <TonConnectButton />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="app-container"
            >
              {/* Define your routes for each path */}
              <Routes>
                {/* Home / main screen */}
                <Route path="/" element={<MainScreen />} />

                {/* “Advertiser” route */}
                <Route path="/advertiser" element={<AdvertiserOptions />} />

                {/* Login route */}
                <Route path="/login" element={<LoginScreen />} />

                {/* Deploy / create a new campaign route */}
                <Route path="/deploy" element={<DeployEmptyCampaign />} />

                {/* Telegram setup route: /telegram-setup/:campaignId */}
                <Route path="/telegram-setup/:campaignId" element={<TelegramSetupCampaign />} />

                {/*
                  The “blockchain setup” route now has a campaignId param,
                  so we can do /blockchain-setup/1234567 and parse it in
                  BlockchainSetupCampaign via `useParams`.
                */}
                <Route path="/blockchain-setup/:campaignId" element={<BlockchainSetupCampaign />} />

                {/*
                  A dedicated route for a single campaign:
                  /campaign/123 loads <CampaignView/> with param :id.
                */}
                <Route path="/campaign/:id" element={<CampaignView />} />

                {/* Fallback route (if user types an unknown URL) */}
                <Route path="*" element={<MainScreen />} />
              </Routes>
            </motion.div>
          </TonConnectProvider>
        </TelegramCampaignProvider>
      </TelegramProvider>
    </BrowserRouter>
  );
}

export default App;
