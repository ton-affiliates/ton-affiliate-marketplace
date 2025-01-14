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
import { ScreenTypes } from './ScreenNavigation';

interface DeployEmptyCampaignProps {
  setScreen: React.Dispatch<React.SetStateAction<ScreenTypes>>;
  setCampaignId: React.Dispatch<React.SetStateAction<string | null>>;
}

const DeployEmptyCampaign: React.FC<DeployEmptyCampaignProps> = ({
  setScreen,
  setCampaignId,
}) => {
  const affiliateMarketplace = useAffiliateMarketplace();
  const { connectedStatus, userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();

  const [numCampaigns, setNumCampaigns] = useState<string>('---');
  const [waitingForTx, setWaitingForTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);

  /** NEW: Flag to indicate we timed out waiting for the transaction event */
  const [txTimeout, setTxTimeout] = useState(false);

  /** A ref to store the timeout ID, so we can clear it when needed */
  const timeoutRef = useRef<number | null>(null);

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

  /** Fetch initial number of campaigns */
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

  /** Cleanup on component unmount to avoid memory leaks */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleDeployCampaign = async () => {
    if (!affiliateMarketplace || !userAccount) return;

    setWaitingForTx(true);  // Show loading spinner
    setTxSuccess(false);    // Reset success state
    setTxFailed(false);     // Reset failure state
    setTxTimeout(false);    // Reset timeout state

    // Start a 60-second timer. If no campaign event arrives within 1 minute,
    // we assume it timed out or user might have missed the event.
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
      // Further updates will come via the WebSocket event (CampaignCreatedEvent).
    } catch (error) {
      console.error('Transaction failed or was canceled:', error);

      if (error instanceof Error) {
        if (error.message.includes('canceled')) {
          console.log('Transaction was canceled by the user.');
          setTxFailed(true);
        } else {
          console.log('Transaction failed due to an error.');
          setTxFailed(true);
        }
      } else {
        console.log('An unknown error occurred:', error);
        setTxFailed(true);
      }

      setWaitingForTx(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  /** If the WebSocket event arrives, you'll handle it in `useCampaignWebSocket`,
   * presumably calling `setTxSuccess(true)`, `setWaitingForTx(false)`, and
   * clearing the timeout there.
   **/

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

        {waitingForTx && !txTimeout && (
          <div className="status-container">
            <Spinner />
            <p>Waiting for transaction confirmation... (can take up to 1 minute)</p>
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
