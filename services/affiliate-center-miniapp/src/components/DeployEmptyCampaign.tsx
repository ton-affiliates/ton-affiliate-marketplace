// DeployCampaignButton.tsx

// Note: We don't import "React" at the top unless we explicitly need it (e.g., using React.* APIs).
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TonConnectButton } from '@tonconnect/ui-react';
import { toNano, Address } from '@ton/core';
import { useTonConnect } from '../hooks/useTonConnect';
import { useTonConnectFetchContext } from '../TonConnectProvider';
import { useAffiliateMarketplace } from '../hooks/useAffiliateMarketplace';

// Import local CSS for styling
import '../styles/DeplyCampaignButton.css';

// Our feedback components (they no longer import "React" if it's not used)
import Spinner from './Spinner';
import SuccessIcon from './SuccessIcon';

interface DeployCampaignButtonProps {
  setScreen: React.Dispatch<
    React.SetStateAction<
      'main' | 'advertiser' | 'campaign' | 'status' | 'setupTelegram' | 'deployEmptyCampaign'
    >
  >;
}

function translateRawAddress(rawAddress: { workChain: number; hash: { type: string; data: number[] } }) {
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

  // UI states
  const [numCampaigns, setNumCampaigns] = useState<string>('---');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Transaction states
  const [waitingForTx, setWaitingForTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);

  // We'll store a reference for the timeout so we can cancel if needed
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3000');

    socket.onopen = () => {
      console.log('WebSocket: connected to ws://localhost:3000');
    };

    socket.onmessage = (evt) => {
      const message = JSON.parse(evt.data);
      if (message.type === 'CampaignCreatedEvent') {
        console.log('Received new campaign created event:', message.data);

        const campaignId = BigInt(message.data.campaignId);
        console.log('Campaign ID:', campaignId);

        // Increase the campaign count for display
        setNumCampaigns((prev) => (parseInt(prev, 10) + 1).toString());

        // Check if the event is for the current user
        if (userAccount) {
          const eventAdvertiser = translateRawAddress(message.data.advertiser).toString();
          const userAddress = Address.parse(userAccount.address).toString();
          console.log('Event advertiser:', eventAdvertiser);
          console.log('User address:', userAddress);

          // If this belongs to the current user
          if (eventAdvertiser === userAddress) {
            console.log('Transaction success for current user! ID:', campaignId);

            // Clear the timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            setTxSuccess(true);
            setWaitingForTx(false);
            setTxFailed(false);
          }
        }
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
      // Clear any leftover timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [userAccount]);

  const handleDeployCampaign = async () => {
    if (!affiliateMarketplace || !userAccount) return;

    // Reset states
    setWaitingForTx(true);
    setTxSuccess(false);
    setTxFailed(false);

    try {
      // Deploy new campaign
      await affiliateMarketplace.send(
        sender,
        { value: toNano('0.15') },
        { $$type: 'AdvertiserDeployNewCampaign' }
      );
      console.log('Deploy transaction sent!');

      // Start a 30-second timer
      timeoutRef.current = setTimeout(() => {
        console.log('No campaign ID arrived in 30s -> transaction failed');
        setTxFailed(true);
        setWaitingForTx(false);
      }, 30_000);

    } catch (error) {
      console.error('Deploy error:', error);
      setTxFailed(true);
      setWaitingForTx(false);
    } finally {
      // Close modal so user can't change screens
      setIsModalOpen(false);
    }
  };

  // Decide if we allow navigation based on the transaction state
  const navigationDisabled = waitingForTx && !txSuccess && !txFailed;

  return (
    <motion.div className="screen-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        {!connectedStatus && <p>Please connect your Telegram wallet</p>}

        <div className="navigation-buttons">
          {connectedStatus && <p className="message status-active">Wallet is connected</p>}
          <TonConnectButton />
        </div>

        {/* Normal state: user not in a transaction */}
        {connectedStatus && !waitingForTx && !txSuccess && !txFailed && (
          <div className="vertically-aligned">
            <h1 className="headline">Deploy New Campaign</h1>
            <p>Num campaigns: {numCampaigns}</p>
            <button className="nav-button" onClick={() => setIsModalOpen(true)}>
              Create New Campaign
            </button>
          </div>
        )}

        {/* Spinner if waiting for campaign ID */}
        {waitingForTx && !txSuccess && !txFailed && (
          <div className="status-container">
            <Spinner />
            <p>Waiting for transaction confirmation...</p>
          </div>
        )}

        {/* Success UI if the campaign ID arrived for the current user */}
        {txSuccess && (
          <div className="status-container">
            <SuccessIcon />
            <p>Transaction successful!</p>
          </div>
        )}

        {/* Failure if 30s passed or an error occurred */}
        {txFailed && (
          <div className="status-container">
            <p className="error-text">Transaction failed. Please try again.</p>
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
              disabled={waitingForTx}
            >
              {waitingForTx ? 'Deploying...' : 'Deploy'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Buttons: disabled while waiting for TX */}
      <div className="navigation-buttons">
        <button className="nav-button" onClick={() => setScreen('advertiser')} disabled={navigationDisabled}>
          Go Back
        </button>
        <button className="nav-button" onClick={() => setScreen('main')} disabled={navigationDisabled}>
          Go to Main Screen
        </button>
      </div>
    </motion.div>
  );
};

export default DeployCampaignButton;
