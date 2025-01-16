import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { ScreenProps } from './ScreenNavigation';

interface BlockchainSetupCampaignProps extends ScreenProps {
  // If you need campaignId from the previous step:
  campaignId?: string;
}

const BlockchainSetupCampaign: React.FC<BlockchainSetupCampaignProps> = ({
  campaignId,
}) => {
  const { connectedStatus } = useTonConnectFetchContext();

  // If you want to show a quick "success" banner from the previous step:
  const [showSuccessBanner, setShowSuccessBanner] = useState(true);

  // Commissionable events, simplified to only "User Referred" and "Premium User Referred"
  const [commissionValues, setCommissionValues] = useState({
    userReferred: '0.1',
    premiumUserReferred: '0.1',
  });

  // We can hide the banner after some seconds or let them manually continue
  useEffect(() => {
    // For example, hide after 3 seconds if you want:
    const timer = setTimeout(() => {
      setShowSuccessBanner(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    // 1) You’d store or pass these commission values to your back end if needed
    // 2) Then redirect user to the final campaign page
    // e.g. "tonaffiliates.com/campaign/123455"
    // For now, let’s assume we have `campaignId` from props

    if (!campaignId) {
      // handle missing ID scenario or create a new one
      console.warn('No campaignId found, cannot redirect properly.');
      return;
    }
    const url = `/campaign/${campaignId}`; 
    // If your real domain is tonaffiliates.com, you could do:
    // window.location.href = `https://tonaffiliates.com/campaign/${campaignId}`;
    // Or within the app, do setScreen('status') or a new screen type
    window.location.href = url;
  };

  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="card">

        {/* 1) Show a success banner from the previous step */}
        {showSuccessBanner && (
          <div style={{ backgroundColor: '#c8f7c5', padding: '1em', marginBottom: '1em' }}>
            <strong>✓</strong> Your Telegram Setup step was successful. Now configure campaign on the blockchain.
          </div>
        )}

        {/* 2) Remove “Following Wallet is Connected” line completely */}
        {/* If you want to keep a mention of the wallet, do so here, or just remove it. */}
        
        {connectedStatus && (
          <p style={{ color: 'green' }}>Wallet is connected!</p>
        )}

        <h1 className="headline">Create New Campaign (Blockchain Setup)</h1>

        {/* 3) Commissionable events: only “User Referred” & “Premium User Referred” */}
        <div className="card container-column">
          <label className="label">Commissionable Events Fees (Human user*)</label>
          <div className="checkbox-group-grid">
            <div className="event-left">
              <input
                type="checkbox"
                id="userReferred"
                checked={true}
                readOnly
              />
              <label htmlFor="userReferred">User Referred</label>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              className="text-input event-right"
              value={commissionValues.userReferred}
              onChange={(e) =>
                setCommissionValues((prev) => ({
                  ...prev,
                  userReferred: e.target.value,
                }))
              }
            />
          </div>

          <div className="checkbox-group-grid">
            <div className="event-left">
              <input
                type="checkbox"
                id="premiumUserReferred"
                checked={true}
                readOnly
              />
              <label htmlFor="premiumUserReferred">Premium User Referred</label>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              className="text-input event-right"
              value={commissionValues.premiumUserReferred}
              onChange={(e) =>
                setCommissionValues((prev) => ({
                  ...prev,
                  premiumUserReferred: e.target.value,
                }))
              }
            />
          </div>

          <p style={{ fontSize: '0.85em', marginTop: '0.5em' }}>
            *We verify each referred user is human via captcha.
          </p>
        </div>

        {/* Possibly more logic for blockchain setup (like capturing deposit or contract info) */}
        
        <button className="nav-button full-width" onClick={handleSubmit}>
          Finalize & View Campaign
        </button>

        <TonConnectButton />

      </div>
    </motion.div>
  );
};

export default BlockchainSetupCampaign;
