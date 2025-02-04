// src/components/TelegramSetupCampaign.tsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useTonConnectFetchContext } from './TonConnectProvider';

export enum TelegramCategory {
  GAMING = 'Gaming',
  CRYPTO = 'Crypto',
  TECHNOLOGY = 'Technology',
  LIFESTYLE = 'Lifestyle',
  EDUCATION = 'Education',
  HEALTH = 'Health',
  TRAVEL = 'Travel',
  FINANCE = 'Finance',
  ENTERTAINMENT = 'Entertainment',
  POLITICS = 'Politics',
  SOCIAL = 'Social',
  SPORTS = 'Sports',
  NEWS = 'News',
  SCIENCE = 'Science',
  ART = 'Art',
  MUSIC = 'Music',
  OTHER = 'Other', // For uncategorized or unique cases
}


/**
 *  We load the bot's name/username from an environment variable
 *  (e.g. 'VITE_TON_AFFILIATES_BOT' = "TonVerifierBot").
 */
// const verifierBotName = import.meta.env.VITE_TON_AFFILIATES_BOT;

/**
 * This component guides the user to set up a Telegram channel (or mini-app).
 * They must add our verifier bot as admin, so the server can confirm.
 */
function TelegramSetupCampaign() {
  // 1) Grab the campaignId from the URL
  const { campaignId } = useParams<{ campaignId: string }>();
  console.log('[TelegramSetupCampaign] rendered with campaignId:', campaignId);

  // 2) Local states for form inputs
  const [campaignName, setCampaignName] = useState('');
  const [category, setCategory] = useState<TelegramCategory | ''>('');
  const [inviteLink, setInviteLink] = useState('');

  // 3) UI states
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 4) Access the user’s wallet
  const { userAccount } = useTonConnectFetchContext();
  const navigate = useNavigate();

  async function handleVerify() {
    console.log('[TelegramSetupCampaign] handleVerify clicked!');
    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Must have a wallet connected
    if (!userAccount?.address) {
      console.warn('[TelegramSetupCampaign] No wallet address found');
      setErrorMessage('No wallet address found. Please connect your wallet first.');
      setIsVerifying(false);
      return;
    }

    // Prepare data for server
    const bodyData = {
      campaignId,
      walletAddress: userAccount.address,
      campaignName,
      category,
      inviteLink,
    };

    console.log('[TelegramSetupCampaign] Sending POST /api/v1/campaigns with data:', bodyData);

    try {
      const response = await fetch('/api/v1/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        let serverError = 'Unknown server error';
        try {
          const errorBody = await response.json();
          if (errorBody.error) {
            serverError = errorBody.error;
          } else if (errorBody.message) {
            serverError = errorBody.message;
          }
        } catch {
          // If not valid JSON, ignore
        }
        throw new Error(serverError);
      }

      // If success
      const data = await response.json();
      setSuccessMessage('Campaign created & verified successfully!');

      // Navigate to the next step
      const nextId = data.id || campaignId;
      console.log('[TelegramSetupCampaign] Navigating to /blockchain-setup/', nextId);
      navigate(`/blockchain-setup/${nextId}`);
    } catch (err: any) {
      console.error('[TelegramSetupCampaign] Error verifying telegram setup:', err);
      setErrorMessage(err.message || 'Failed to verify the Telegram URL. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="card">
        {/* MAIN HEADING */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Deploy New Telegram Campaign</h2>
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              cursor: 'pointer',
              fontSize: '1.2rem',
            }}
            title="Setup Telegram Details for your Campaign."
          >
            ℹ️
          </div>
        </div>

        {/* Show the campaign ID if we have it */}
        <p>
          <strong>Campaign ID:</strong> {campaignId || 'No campaign ID provided'}
        </p>

        {/* Campaign Name */}
        <div className="form-group">
          <label htmlFor="campaignName">*Campaign Name:</label>
          <input
            id="campaignName"
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />
        </div>

        {/* Category (dropdown) */}
        <div className="form-group">
          <label htmlFor="category">*Category:</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TelegramCategory)}
          >
            <option value="" disabled>
              Select a category
            </option>
            {Object.values(TelegramCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Invite Link */}
        <div className="form-group">
          <label htmlFor="inviteLink">*Public Channel Invite Link:</label>
          <input
            id="inviteLink"
            type="text"
            value={inviteLink}
            onChange={(e) => setInviteLink(e.target.value)}
            placeholder="e.g. https://t.me/MyPublicChannel"
          />
        </div>

        {/* Error or success */}
        {errorMessage && (
          <div className="error-popup">
            <p style={{ color: 'red', whiteSpace: 'pre-line' }}>{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="success-popup">
            <p style={{ color: 'green', whiteSpace: 'pre-line' }}>{successMessage}</p>
          </div>
        )}

        {/* Verify Setup button */}
        <button
          className="telegram-campaign-button"
          disabled={
            !campaignName ||
            !category ||
            !inviteLink ||
            isVerifying
          }
          onClick={handleVerify}
          title={
            !campaignName || !category || !inviteLink
              ? 'Please fill all required fields'
              : ''
          }
          style={{ marginTop: '1rem' }}
        >
          {isVerifying ? 'Verifying... Please wait' : 'Verify Setup'}
        </button>
      </div>
    </motion.div>
  );
}

export default TelegramSetupCampaign;
