import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TonConnectButton } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { useTonConnect } from '../hooks/useTonConnect';

import { useTonConnectFetchContext } from '../TonConnectProvider';
import { useAffiliateMarketplace } from '../hooks/useAffiliateMarketplace';

interface DeployCampaignButtonProps {
  // If you want to navigate to another screen afterward:
  setScreen: React.Dispatch<
    React.SetStateAction<
      'main' | 'advertiser' | 'campaign' | 'status' | 'setupTelegram' | 'deployEmptyCampaign'
    >
  >;
}

const DeployCampaignButton: React.FC<DeployCampaignButtonProps> = ({ setScreen }) => {
  const affiliateMarketplace = useAffiliateMarketplace();
  const { connectedStatus } = useTonConnectFetchContext();
  const { sender } = useTonConnect();

  // UI states
  const [loading, setLoading] = useState(false);
  const [numCampaigns, setNumCampaigns] = useState<string>('---');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // On mount, or whenever `affiliateMarketplace` changes, fetch the current campaign count
  useEffect(() => {
    async function fetchCampaigns() {
      if (!affiliateMarketplace) return;
      try {
        const count = await affiliateMarketplace.getNumCampaigns();
        setNumCampaigns(count.toString());
      } catch (error) {
        console.error('Error fetching numCampaigns:', error);
      }
    }
    fetchCampaigns();
  }, [affiliateMarketplace]);

  /**
   * Deploy a new campaign by sending an 'AdvertiserDeployNewCampaign' message.
   * Then refetch the campaign count to show the updated value.
   */
  const handleDeployCampaign = async () => {
    if (!affiliateMarketplace) return;
    setLoading(true);
    try {

      // 1) Deploy new campaign
      await affiliateMarketplace.send(
        sender,     
        { value: toNano('0.15') },
        { $$type: 'AdvertiserDeployNewCampaign' }
      );
      console.log('Deploy transaction sent!');

      // 2) Fetch updated campaign count
      const count = await affiliateMarketplace.getNumCampaigns();
      setNumCampaigns(count.toString());
      console.log(`Updated count: ${count}`);

      // 3) Close modal (or navigate to 'status', etc.)
      setIsModalOpen(false);
      // setScreen('status'); // If you want to jump to the status screen
    } catch (error) {
      console.error('Deploy error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="card">
        {/* If user isn't connected yet */}
        {!connectedStatus && (
          <p>To proceed, we need you to connect your Telegram wallet</p>
        )}

        {/* Wallet status + Connect button */}
        <div className="navigation-buttons">
          {connectedStatus && (
            <p className="message status-active">Following Wallet is Connected:</p>
          )}
          <TonConnectButton />
        </div>

        {/* If connected, show campaign info + "Create" button */}
        {connectedStatus && (
          <div className="vertically-aligned">
            <h1 className="headline">Deploy New Campaign</h1>
            <p>Num campaigns: {numCampaigns}</p>

            <button
              className="nav-button"
              onClick={() => setIsModalOpen(true)}
            >
              Create New Campaign
            </button>
          </div>
        )}

        {/* Expandable info for non-connected, if desired */}
        {/* (Similar to your isExpanded approach in NewCampaign) */}

      </div>

      {/* Modal overlay (like in NewCampaign) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            {/* Close button in the top-right corner */}
            <button
              className="modal-close-top"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2>Review Campaign Details</h2>
            <p>Here you could list fields or options for your campaign.</p>
            <p>Current # of campaigns: {numCampaigns}</p>

            {/* Deploy button */}
            <button
              className="nav-button margin-left"
              onClick={handleDeployCampaign}
              disabled={loading}
            >
              {loading ? 'Deploying...' : 'Deploy'}
            </button>

            {/* Or navigate away if you prefer */}
            {/* <button
              className="nav-button margin-left"
              onClick={() => {
                setIsModalOpen(false);
                setScreen('status');
              }}
            >
              Check Status
            </button> */}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="navigation-buttons">
        <button className="nav-button" onClick={() => setScreen('advertiser')}>
          Go Back
        </button>
        <button className="nav-button" onClick={() => setScreen('main')}>
          Go to Main Screen
        </button>
      </div>
    </motion.div>
  );
};

export default DeployCampaignButton;
