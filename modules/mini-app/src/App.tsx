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
import AffiliateOptions from './components/AffiliateOptions';
import ProtectedRoute from './components/ProtectedRoute';
import { AffiliatePage } from './components/AffiliatePage';

// 1) Import your AllAffiliatesPage:
import { AllAffiliatesPage } from './components/AllAffiliatesPage';

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

function AppContent() {
  const location = useLocation();
  const hideTonConnectOn = ['/', '/login'];
  const shouldHideTonConnect = hideTonConnectOn.includes(location.pathname);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {!shouldHideTonConnect && <TonConnectButton />}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="app-container"
      >
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<MainScreen />} />
          <Route path="/login" element={<LoginScreen />} />

          {/* Protected routes */}
          <Route
            path="/advertiser"
            element={
              <ProtectedRoute>
                <AdvertiserOptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/affiliate"
            element={
              <ProtectedRoute>
                <AffiliateOptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deploy"
            element={
              <ProtectedRoute>
                <DeployEmptyCampaign />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telegram-setup/:campaignId"
            element={
              <ProtectedRoute>
                <TelegramSetupCampaign />
              </ProtectedRoute>
            }
          />
          <Route
            path="/blockchain-setup/:campaignId"
            element={
              <ProtectedRoute>
                <BlockchainSetupCampaign />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaign/:id"
            element={
              <ProtectedRoute>
                <CampaignView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <Campaigns />
              </ProtectedRoute>
            }
          />

          {/* 2) Add the new route for AllAffiliatesPage */}
          <Route
            path="/campaign/:campaignId/affiliates"
            element={
              <ProtectedRoute>
                <AllAffiliatesPage />
              </ProtectedRoute>
            }
          />

          <Route
              path="/campaign/:campaignId/affiliate/:affiliateId"
              element={
                <ProtectedRoute>
                  <AffiliatePage />
                </ProtectedRoute>
              }
            />

          {/* Fallback */}
          <Route path="*" element={<MainScreen />} />
        </Routes>
      </motion.div>
    </>
  );
}

export default App;
