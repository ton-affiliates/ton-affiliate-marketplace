import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dictionary } from '@ton/core';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { useTonWalletConnect } from '../hooks/useTonConnect';
import { useParams, useNavigate } from 'react-router-dom';
import { GAS_FEE } from '@common/constants';

/**
 * This component expects a route like: /blockchain-setup/:campaignId
 * Then it fetches the campaign contract and finalizes campaign details on-chain.
 */
function BlockchainSetupCampaign() {
  const { campaignId } = useParams<{ campaignId: string }>();
  console.log('[BlockchainSetupCampaign] rendered with campaignId:', campaignId);

  // Commission fees
  const [commissionValues, setCommissionValues] = useState({
    userReferred: '0.1',
    premiumUserReferred: '0.1',
  });

  // Boolean: isPublicCampaign (true => public, false => private)
  const [isPublicCampaign, setIsPublicCampaign] = useState(true);

  // Payment method MUST be a bigint, so we store 0n for TON, 1n for USDT.
  const [paymentMethod, setPaymentMethod] = useState<bigint>(0n);

  // Expiration date
  const [expirationDateEnabled, setExpirationDateEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState(''); // "YYYY-MM-DD"

  // UI States
  const [txInProgress, setTxInProgress] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Contract data
  const { connectedStatus, userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();
  const advertiserAddress = userAccount?.address || null;
  const numericCampaignId = campaignId ? BigInt(campaignId) : undefined;

  const { campaignContract, isLoading, error } = useCampaignContract(
    advertiserAddress || undefined,
    numericCampaignId
  );

  const navigate = useNavigate();

  /**
   * Handler for “Finalize & View Campaign.”
   */
  async function handleSubmit() {
    setTxInProgress(true);
    setTxFailed(false);
    setTxSuccess(false);
    setErrorMessage(null);

    try {
      if (!connectedStatus || !userAccount?.address) {
        throw new Error('No wallet connected. Please connect your wallet.');
      }
      if (!campaignContract) {
        throw new Error(error || 'Campaign contract not loaded yet.');
      }
      if (!sender) {
        throw new Error('Sender is not set. Could not send transaction.');
      }

      // 1) Build the cost-per-action dictionaries
      const userReferredVal = BigInt(
        Math.floor(parseFloat(commissionValues.userReferred) * 1e9)
      );
      const premiumReferredVal = BigInt(
        Math.floor(parseFloat(commissionValues.premiumUserReferred) * 1e9)
      );

      const regularUsersMap = Dictionary.empty<bigint, bigint>();
      const premiumUsersMap = Dictionary.empty<bigint, bigint>();
      const BOT_OP_CODE_USER_CLICK = 0n;

      regularUsersMap.set(BOT_OP_CODE_USER_CLICK, userReferredVal);
      premiumUsersMap.set(BOT_OP_CODE_USER_CLICK, premiumReferredVal);

      // 2) Determine expiration in days, store as a bigint or null
      let campaignValidForNumDays: bigint | null = null;
      if (expirationDateEnabled && expirationDate) {
        const now = new Date();
        const chosenDate = new Date(expirationDate + 'T00:00:00');
        const diffMs = chosenDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          campaignValidForNumDays = BigInt(diffDays);
        }
      }

      // isPublicCampaign => boolean
      // paymentMethod => our bigint (0n or 1n)
      const requiresAdvertiserApprovalForWithdrawl = false;

	  const stateBefore = (await campaignContract.getCampaignData()).state;
      if (stateBefore !== 0n) {
		setErrorMessage('Error: campaign has already been initialized!');
        return;
	  }

      // 3) Send the transaction to the contract
      await campaignContract.send(
        sender,
        { value: GAS_FEE },
        {
          $$type: 'AdvertiserSetCampaignDetails',
          campaignDetails: {
            // EXACT shape that matches your CampaignDetails definition
            $$type: 'CampaignDetails',
            regularUsersCostPerAction: regularUsersMap,
            premiumUsersCostPerAction: premiumUsersMap,
            isPublicCampaign,
            campaignValidForNumDays,
            paymentMethod,
            requiresAdvertiserApprovalForWithdrawl,
          },
        }
      );

      setTxSuccess(true);

      // After 1.5s, navigate to final campaign page
      setTimeout(() => {
        if (campaignId) {
          navigate(`/campaign/${campaignId}`);
        } else {
          console.warn('No campaignId in URL, cannot navigate to /campaign/:id');
        }
      }, 1500);

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
        {error && <p style={{ color: 'red' }}>Error from useCampaignContract: {error}</p>}

        {/* 
          Campaign Type: public/private 
          => sets isPublicCampaign: boolean
        */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <label>Campaign Type:</label>
          <div>
            <label>
              <input
                type="radio"
                name="campaignType"
                value="public"
                checked={isPublicCampaign === true}
                onChange={() => setIsPublicCampaign(true)}
              />
              Public (any affiliate can join)
            </label>
          </div>
          <div>
            <label>
              <input
                type="radio"
                name="campaignType"
                value="private"
                checked={isPublicCampaign === false}
                onChange={() => setIsPublicCampaign(false)}
              />
              Private (approval required)
            </label>
          </div>
        </div>

        {/* Payment Method => 0n for TON, 1n for USDT */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <label>Payment Method:</label>
          <div>
            <label>
              <input
                type="radio"
                name="paymentMethod"
                value="0"
                checked={paymentMethod === 0n}
                onChange={() => setPaymentMethod(0n)}
              />
              TON
            </label>
          </div>
          <div>
            <label>
              <input
                type="radio"
                name="paymentMethod"
                value="1"
                checked={paymentMethod === 1n}
                onChange={() => setPaymentMethod(1n)}
              />
              USDT
            </label>
          </div>
        </div>

        {/* Commission fields */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <label>Commissionable Events Fees (human user*)</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <div>
              <label>User Referred:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={commissionValues.userReferred}
                onChange={(e) =>
                  setCommissionValues((prev) => ({
                    ...prev,
                    userReferred: e.target.value,
                  }))
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
                  setCommissionValues((prev) => ({
                    ...prev,
                    premiumUserReferred: e.target.value,
                  }))
                }
                style={{ width: '5rem' }}
              />
            </div>
          </div>
          <p style={{ fontSize: '0.85em', marginTop: '0.5em' }}>
            *We verify each referred user is human via captcha.
          </p>
        </div>

        {/* Expiration date checkbox + date input => sets campaignValidForNumDays */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <label>Campaign Expiration Date:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              />
            )}
          </div>
          <p style={{ fontSize: '0.85em', marginTop: '0.5em' }}>
            We'll compute the difference in days from now. 
            If it is set to 0, no expiration is used.
          </p>
        </div>

        {/* Display TX states */}
        {txInProgress && <p>Sending transaction...</p>}
        {txFailed && errorMessage && <p style={{ color: 'red' }}>Error: {errorMessage}</p>}
        {txSuccess && <p style={{ color: 'green' }}>Campaign updated successfully! Redirecting...</p>}

        <button
          style={{ marginTop: '1rem' }}
          onClick={handleSubmit}
          disabled={txInProgress || !campaignContract}
        >
          Finalize & View Campaign
        </button>
      </div>
    </motion.div>
  );
}

export default BlockchainSetupCampaign;
