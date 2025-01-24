// src/components/BlockchainSetupCampaign.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { useTonWalletConnect } from '../hooks/useTonConnect';
import { advertiserSetCampaignDetails } from '../blockchain/campaign/advertiserSetCampaignDetails';

function BlockchainSetupCampaign() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const [commissionValues, setCommissionValues] = useState({
    userReferred: '0.1',
    premiumUserReferred: '0.1',
  });
  const [isPublicCampaign, setIsPublicCampaign] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<bigint>(0n);
  const [expirationDateEnabled, setExpirationDateEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');

  const [txInProgress, setTxInProgress] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { connectedStatus, userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();
  const advertiserAddress = userAccount?.address || '';
  const numericCampaignId = campaignId ? BigInt(campaignId) : undefined;

  // Load the campaign contract
  const { campaignContract, isLoading, error } = useCampaignContract(
    advertiserAddress,
    numericCampaignId
  );

  async function handleSubmit() {
    setTxInProgress(true);
    setTxSuccess(false);
    setTxFailed(false);
    setErrorMessage(null);

    try {
      // Basic checks
      if (!connectedStatus || !advertiserAddress) {
        throw new Error('No wallet connected. Please connect your wallet first.');
      }
      if (!campaignContract) {
        throw new Error(error || 'Campaign contract not loaded yet.');
      }
      if (!sender) {
        throw new Error('Sender is not set. Could not send transaction.');
      }

      // Call our new blockchain script
      await advertiserSetCampaignDetails(
        campaignContract,
        sender,
        advertiserAddress,
        commissionValues,
        isPublicCampaign,
        paymentMethod,
        expirationDateEnabled,
        expirationDate
      );

      // If we get here => success
      setTxSuccess(true);

      // After 0.5s, navigate to final campaign page
      setTimeout(() => {
        if (campaignId) {
          navigate(`/campaign/${campaignId}`);
        } else {
          console.warn('No campaignId in URL, cannot navigate to /campaign/:id');
        }
      }, 500);
    } catch (err: any) {
      console.error('[BlockchainSetupCampaign] Transaction error:', err);
      setTxFailed(true);
      setErrorMessage(err.message || 'Transaction failed or canceled');
    } finally {
      setTxInProgress(false);
    }
  }

  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="card">
        <p>
          <strong>Campaign ID:</strong> {campaignId || 'No campaign ID provided'}
        </p>
        {isLoading && <p>Loading Campaign Contract...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}

        {/* Public/Private radio buttons */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <label>Campaign Type:</label>
          <label>
            <input
              type="radio"
              value="public"
              checked={isPublicCampaign}
              onChange={() => setIsPublicCampaign(true)}
            />
            Public
          </label>
          <label>
            <input
              type="radio"
              value="private"
              checked={!isPublicCampaign}
              onChange={() => setIsPublicCampaign(false)}
            />
            Private
          </label>
        </div>

        {/* Payment method => 0n or 1n */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <label>Payment Method:</label>
          <label>
            <input
              type="radio"
              value="0"
              checked={paymentMethod === 0n}
              onChange={() => setPaymentMethod(0n)}
            />
            TON
          </label>
          <label>
            <input
              type="radio"
              value="1"
              checked={paymentMethod === 1n}
              onChange={() => setPaymentMethod(1n)}
            />
            USDT
          </label>
        </div>

        {/* Commission fields */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <label>Commissionable Events Fees</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <div>
              <label>User Referred:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={commissionValues.userReferred}
                onChange={(e) =>
                  setCommissionValues({ 
                    ...commissionValues, 
                    userReferred: e.target.value 
                  })
                }
                style={{ width: '5rem' }}
              />
            </div>
            <div>
              <label>Premium User Referred:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={commissionValues.premiumUserReferred}
                onChange={(e) =>
                  setCommissionValues({ 
                    ...commissionValues, 
                    premiumUserReferred: e.target.value 
                  })
                }
                style={{ width: '5rem' }}
              />
            </div>
          </div>
        </div>

        {/* Expiration date => sets a "campaignValidForNumDays" or null */}
        <ExpirationDateSelector
          expirationDateEnabled={expirationDateEnabled}
          setExpirationDateEnabled={setExpirationDateEnabled}
          expirationDate={expirationDate}
          setExpirationDate={setExpirationDate}
        />

        {/* If TX in progress, show a spinner or note */}
        {txInProgress && <p>Sending transaction...</p>}
        {/* If TX fails, show error */}
        {txFailed && errorMessage && (
          <p style={{ color: 'red' }}>Error: {errorMessage}</p>
        )}
        {/* If TX success, show success note */}
        {txSuccess && (
          <p style={{ color: 'green' }}>
            Campaign updated successfully! Navigating...
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={txInProgress || !campaignContract}
          style={{ marginTop: '1rem' }}
        >
          Finalize & View Campaign
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Sub-component for selecting an expiration date or disabling it.
 * (Identical to your code, just left intact.)
 */
function ExpirationDateSelector({
  expirationDateEnabled,
  setExpirationDateEnabled,
  expirationDate,
  setExpirationDate,
}: {
  expirationDateEnabled: boolean;
  setExpirationDateEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  expirationDate: string;
  setExpirationDate: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <div className="card container-column" style={{ marginTop: '1rem' }}>
      <label>Campaign Expiration Date:</label>
      <label>
        <input
          type="checkbox"
          checked={expirationDateEnabled}
          onChange={(e) => setExpirationDateEnabled(e.target.checked)}
        />
        <span style={{ marginLeft: '0.5rem' }}>Enable expiration date</span>
      </label>
      {expirationDateEnabled && (
        <input
          type="date"
          value={expirationDate}
          onChange={(e) => setExpirationDate(e.target.value)}
          style={{ marginTop: '0.5rem' }}
        />
      )}
      <p style={{ fontSize: '0.85em', marginTop: '0.5em' }}>
        We compute days from now until the chosen date.
        If it’s 0 or negative, we use “no expiration”.
      </p>
    </div>
  );
}

export default BlockchainSetupCampaign;
