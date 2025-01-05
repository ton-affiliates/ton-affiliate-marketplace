// DeployCampaignButton.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useTonConnect } from '../hooks/useTonConnect';
import { toNano, Address } from '@ton/core';
import { useTonConnectFetchContext } from '../TonConnectProvider';
import { useAffiliateMarketplace } from '../hooks/useAffiliateMarketplace';

interface DeployCampaignButtonProps {
  setScreen: React.Dispatch<React.SetStateAction<
    'main' | 'advertiser' | 'campaign' | 'status' | 'setupTelegram' | 'deployEmptyCampaign'
  >>;
}

// Helper to convert a Tact raw address to an Address
function translateRawAddress(rawAddress: { workChain: number; hash: { type: string; data: number[] } }): Address {
  if (!rawAddress || rawAddress.hash.type !== 'Buffer') {
    throw new Error('Invalid raw address format');
  }

  const workChain = rawAddress.workChain;
  const hashBuffer = Buffer.from(rawAddress.hash.data);

  if (hashBuffer.length !== 32) {
    throw new Error(`Invalid address hash length: ${hashBuffer.length}`);
  }

  return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
}

const DeployCampaignButton: React.FC<DeployCampaignButtonProps> = ({ setScreen }) => {
  // Grab your contract instance
  const affiliateMarketplace = useAffiliateMarketplace();

  // From TonConnectProvider: check if user is connected, plus full account object
  const { connectedStatus, userAccount } = useTonConnectFetchContext();
  // From your custom `useTonConnect` hook: used for sending contract calls
  const { sender } = useTonConnect();

  const [loading, setLoading] = useState(false);
  const [numCampaigns, setNumCampaigns] = useState<string>('---');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Open a WebSocket to listen for new campaigns
    const socket = new WebSocket('ws://localhost:3000');

    socket.onopen = () => {
      console.log('WebSocket: connected to ws://localhost:3000');
    };

    socket.onmessage = (evt) => {
      const message = JSON.parse(evt.data);
      if (message.type === 'CampaignCreatedEvent') {
        console.log('Received new campaign created event:', message.data);

        // Possibly parse as BigInt
        const campaignId = BigInt(message.data.campaignId);
        console.log('Campaign ID:', campaignId);

        // Bump the campaign count in the UI
        setNumCampaigns((prev) => (parseInt(prev, 10) + 1).toString());

        // Compare the event's advertiser with the connected user's address
        const eventAdvertiser = translateRawAddress(message.data.advertiser).toString();
        console.log('Event advertiser:', eventAdvertiser);
        
        // If userAccount is not null, we can access userAccount.address
        if (userAccount) {
          console.log('User address:', Address.parse(userAccount.address).toString());

          if (eventAdvertiser === Address.parse(userAccount.address).toString()) {
            console.log('This event belongs to the current user! Save to DB or navigate away...');
          }
        }
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Cleanup
    return () => {
      socket.close();
    };
  }, [userAccount]);

  // Example function to deploy a new campaign
  const handleDeployCampaign = async () => {
    if (!affiliateMarketplace) return;
    setLoading(true);
    try {
      // Use 'sender' for contract calls
      await affiliateMarketplace.send(
        sender,
        { value: toNano('0.15') },
        { $$type: 'AdvertiserDeployNewCampaign' }
      );
      console.log('Deploy transaction sent!');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Deploy error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="screen-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        {/* If user isn't connected, prompt them */}
        {!connectedStatus && <p>Please connect your Telegram wallet</p>}

        <div className="navigation-buttons">
          {connectedStatus && <p className="message status-active">Wallet is connected</p>}
          <TonConnectButton />
        </div>

        {connectedStatus && (
          <div className="vertically-aligned">
            <h1 className="headline">Deploy New Campaign</h1>
            <p>Num campaigns: {numCampaigns}</p>
            <button className="nav-button" onClick={() => setIsModalOpen(true)}>
              Create New Campaign
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-top" onClick={() => setIsModalOpen(false)}>
              ×
            </button>
            <h2>Review Campaign Details</h2>
            <p>Current # of campaigns: {numCampaigns}</p>
            <button
              className="nav-button margin-left"
              onClick={handleDeployCampaign}
              disabled={loading}
            >
              {loading ? 'Deploying...' : 'Deploy'}
            </button>
          </div>
        </div>
      )}

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
