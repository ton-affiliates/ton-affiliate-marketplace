import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TonConnectButton } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';
import { useTonConnect } from '../hooks/useTonConnect';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useAffiliateMarketplace } from '../hooks/useAffiliateMarketplace';
import Spinner from './Spinner';
import SuccessIcon from './SuccessIcon';
import { useCampaignWebSocket } from '../hooks/useCampaignWebSocket';
import { ScreenTypes } from './ScreenNavigation';

interface DeployEmptyCampaignProps {
  setScreen: React.Dispatch<React.SetStateAction<ScreenTypes>>;
  setCampaignId: React.Dispatch<React.SetStateAction<string | null>>;
}

const DeployEmptyCampaign: React.FC<DeployEmptyCampaignProps> = ({ setScreen, setCampaignId }) => {
  const affiliateMarketplace = useAffiliateMarketplace();
  const { connectedStatus, userAccount } = useTonConnectFetchContext();
  const { sender } = useTonConnect();

  const [numCampaigns, setNumCampaigns] = useState<string>('---');
  const [waitingForTx, setWaitingForTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);

  // Use the WebSocket hook to handle real-time campaign updates
  useCampaignWebSocket(
    userAccount,
    setNumCampaigns,
    setCampaignId,
    setTxSuccess,
    setWaitingForTx,
    setTxFailed,
    setScreen
  );

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

  const handleDeployCampaign = async () => {
    if (!affiliateMarketplace || !userAccount) return;

    setWaitingForTx(true); // Show loading spinner
    setTxSuccess(false);   // Reset success state
    setTxFailed(false);    // Reset failure state

    try {
      // Send transaction and wait for user interaction
      const txPromise = affiliateMarketplace.send(
        sender,
        { value: toNano('0.15') },
        { $$type: 'AdvertiserDeployNewCampaign' }
      );

      console.log('Waiting for user to confirm the transaction...');
      await txPromise;

      console.log('Transaction sent successfully!');
      // Allow WebSocket to handle success state (handled by useCampaignWebSocket)
    } catch (error) {
      console.error('Transaction failed or was canceled:', error);

      if (error instanceof Error) {
        // Check if the user canceled the transaction explicitly
        if (error.message.includes('canceled')) {
          console.log('Transaction was canceled by the user.');
        } else {
          console.log('Transaction failed due to an error.');
        }
      } else {
        console.log('An unknown error occurred:', error);
      }

      // Reset UI state to its initial form
      setWaitingForTx(false); // Remove spinner
      setTxSuccess(false);    // Ensure success state is reset
      setTxFailed(false);     // Ensure failure state is reset
    }
  };

  return (
    <motion.div className="deploy-campaign-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        {!connectedStatus && <p>Please connect your Telegram wallet.</p>}

        {connectedStatus && (
          <>
            <div className="navigation-buttons">
              <p className="message status-active">Wallet is connected.</p>
              <TonConnectButton />
            </div>
            <div className="vertically-aligned">
              <h1 className="headline">Deploy Empty Campaign</h1>
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

        {waitingForTx && (
          <div className="status-container">
            <Spinner />
            <p>Waiting for transaction confirmation...</p>
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
            <p className="error-text">Transaction failed. Please try again.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DeployEmptyCampaign;
