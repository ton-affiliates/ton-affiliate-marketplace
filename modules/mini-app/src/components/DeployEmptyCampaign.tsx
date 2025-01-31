// src/components/DeployEmptyCampaign.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TonConnectButton } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { useTonWalletConnect } from '../hooks/useTonConnect';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useAffiliateMarketplace } from '../hooks/useAffiliateMarketplace';
import Spinner from './Spinner';
import SuccessIcon from './SuccessIcon';
import { useCampaignWebSocket } from '../hooks/useCampaignWebSocket';

interface DeployEmptyCampaignProps {
  // We removed setScreen and setCampaignId, since we don't rely on them here.
}

const DeployEmptyCampaign: React.FC<DeployEmptyCampaignProps> = () => {
  const affiliateMarketplace = useAffiliateMarketplace();
  const { connectedStatus, userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();

  const [numCampaigns, setNumCampaigns] = useState<string>('---');
  const [waitingForTx, setWaitingForTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);
  const [txTimeout, setTxTimeout] = useState(false); // up to you if you keep a “timeout” state

  const timeoutRef = useRef<number | null>(null);

  // Real-time campaign updates via WebSocket:
  // Now we call useCampaignWebSocket with 5 arguments.
  useCampaignWebSocket(
    userAccount,
    setNumCampaigns,
    setTxSuccess,
    setWaitingForTx,
    setTxFailed
  );

  // Fetch initial number of campaigns
  useEffect(() => {
    const fetchNumCampaigns = async () => {
      if (!affiliateMarketplace) return;
      try {
        const count = await affiliateMarketplace.getNumCampaigns();
        setNumCampaigns(count.toString());
      } catch (error) {
        console.error('Failed to fetch the number of campaigns:', error);
      }
    };
    fetchNumCampaigns();
  }, [affiliateMarketplace]);

  // Cleanup if unmounted
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleDeployCampaign = async () => {
    if (!affiliateMarketplace || !userAccount) return;

    setWaitingForTx(true);
    setTxSuccess(false);
    setTxFailed(false);
    setTxTimeout(false);

    // Start a 60-second timer in case no event arrives
    timeoutRef.current = window.setTimeout(() => {
      setTxTimeout(true);
      setWaitingForTx(false);
    }, 60_000);

    try {
      const txPromise = affiliateMarketplace.send(
        sender,
        { value: toNano('0.15') },
        { $$type: 'AdvertiserDeployNewCampaign' }
      );

      console.log('Waiting for user to confirm the transaction...');
      await txPromise;

      console.log('Transaction sent successfully!');
      // The WebSocket event (CampaignCreatedEvent) will handle setting txSuccess, etc.
    } catch (error) {
      console.error('Transaction failed or was canceled:', error);

      setWaitingForTx(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (error instanceof Error) {
        if (error.message.includes('canceled')) {
          console.log('Transaction was canceled by the user.');
        } else {
          console.log('Transaction failed due to an error.');
        }
      }
      setTxFailed(true);
    }
  };

  return (
    <motion.div
      className="deploy-campaign-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="card">
        {!connectedStatus && <p>Please connect your Telegram wallet.</p>}

        {connectedStatus && (
          <>
            <div className="navigation-buttons">
              <p className="message status-active">Wallet is connected.</p>
              <TonConnectButton />
            </div>
            <div className="vertically-aligned">
              <h1 className="headline">Deploy New Campaign</h1>
              <p>Number of campaigns: {numCampaigns}</p>
              <button
                className="nav-button"
                onClick={handleDeployCampaign}
                disabled={waitingForTx}
              >
                Create New Campaign
              </button>
            </div>
          </>
        )}

        {waitingForTx && !txTimeout && (
          <div className="status-container">
            <Spinner />
            <p>Waiting for confirmation from server... (can take up to 1 minute)</p>
          </div>
        )}

        {txTimeout && !txSuccess && (
          <div className="status-container">
            <p>
              We haven't received a confirmation event yet. The transaction might
              still be processing. You can wait longer or refresh this page to check
              again.
            </p>
          </div>
        )}

        {txSuccess && (
          <div className="status-container">
            <SuccessIcon />
            <p>Transaction successful!</p>
          </div>
        )}

        {txFailed && (
          <div className="status-container">
            <p className="error-text">
              Transaction failed or was canceled. Please try again.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DeployEmptyCampaign;
