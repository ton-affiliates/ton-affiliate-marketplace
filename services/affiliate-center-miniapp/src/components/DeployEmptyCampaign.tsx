import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TonConnectButton } from '@tonconnect/ui-react';
import { toNano, Address } from '@ton/core';
import { useTonConnect } from '../hooks/useTonConnect';
import { useTonConnectFetchContext } from '../TonConnectProvider';
import { useAffiliateMarketplace } from '../hooks/useAffiliateMarketplace';
import '../styles/DeplyCampaignButton.css';
import Spinner from './Spinner';
import SuccessIcon from './SuccessIcon';
import { ScreenProps } from './ScreenNavigation'; // Import ScreenProps for type consistency

interface DeployCampaignButtonProps extends ScreenProps {
  setCampaignId: React.Dispatch<React.SetStateAction<string | null>>;
}

function translateRawAddress(rawAddress: { workChain: number; hash: { type: string; data: number[] } }): Address {
  const workChain = rawAddress.workChain;
  const hashBuffer = Buffer.from(rawAddress.hash.data);
  return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
}

const DeployCampaignButton: React.FC<DeployCampaignButtonProps> = ({ setScreen, setCampaignId }) => {
  const affiliateMarketplace = useAffiliateMarketplace();
  const { connectedStatus, userAccount } = useTonConnectFetchContext();
  const { sender } = useTonConnect();

  const [numCampaigns, setNumCampaigns] = useState<string>('---');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [waitingForTx, setWaitingForTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3000');

    socket.onopen = () => {
      console.log('WebSocket connected to ws://localhost:3000');
    };

    socket.onmessage = (evt) => {
      const message = JSON.parse(evt.data);
      if (message.type === 'CampaignCreatedEvent') {
        const campaignId = BigInt(message.data.campaignId).toString();
        const eventAdvertiser = translateRawAddress(message.data.advertiser).toString();
        const userAddress = userAccount ? Address.parse(userAccount.address).toString() : null;

        if (eventAdvertiser === userAddress) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setNumCampaigns((prev) => (parseInt(prev, 10) + 1).toString());
          setCampaignId(campaignId); // Save campaignId for the next screen
          setTxSuccess(true);
          setWaitingForTx(false);
          setTxFailed(false);

          // Redirect to setup page
          setTimeout(() => {
            setScreen('setupTelegram');
          }, 1000);
        }
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [userAccount, setCampaignId, setScreen]);

  const handleDeployCampaign = async () => {
    if (!affiliateMarketplace || !userAccount) return;

    setIsModalOpen(false);
    setWaitingForTx(true);
    setTxSuccess(false);
    setTxFailed(false);

    try {
      await affiliateMarketplace.send(
        sender,
        { value: toNano('0.15') },
        { $$type: 'AdvertiserDeployNewCampaign' }
      );
      console.log('Deploy transaction sent!');

      timeoutRef.current = setTimeout(() => {
        console.log('No campaign ID received within 60 seconds -> transaction failed.');
        setTxFailed(true);
        setWaitingForTx(false);
      }, 60_000);
    } catch (error) {
      console.error('Deploy transaction error:', error);
      setTxFailed(true);
      setWaitingForTx(false);
    }
  };

  return (
    <motion.div className="screen-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                onClick={() => setIsModalOpen(true)}
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close-top"
              onClick={() => setIsModalOpen(false)}
              disabled={waitingForTx}
            >
              ×
            </button>
            <h2>Review Campaign Details</h2>
            <p>Current number of campaigns: {numCampaigns}</p>
            <button
              className="nav-button margin-left"
              onClick={handleDeployCampaign}
              disabled={waitingForTx}
            >
              Deploy
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DeployCampaignButton;
