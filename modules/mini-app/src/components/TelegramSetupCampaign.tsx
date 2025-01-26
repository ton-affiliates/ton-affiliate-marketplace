// src/components/TelegramSetupCampaign.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { TelegramCategory, TelegramAssetType } from '@common/models';

function TelegramSetupCampaign() {
  // 1) Grab the campaignId from the URL (e.g. /telegram-setup/123)
  const { campaignId } = useParams<{ campaignId: string }>();
  console.log('[TelegramSetupCampaign] rendered with campaignId:', campaignId);

  // 2) Local state for form inputs
  const [campaignName, setCampaignName] = useState('');
  const [category, setCategory] = useState<TelegramCategory | ''>('');
  const [inviteLink, setInviteLink] = useState('');
  const [telegramType, setTelegramType] = useState<TelegramAssetType | ''>('');

  // 3) UI states
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 4) Access the user’s TonConnect wallet address
  const { userAccount } = useTonConnectFetchContext();

  // 5) React Router hook to navigate to the next page
  const navigate = useNavigate();

  // 6) Handler for the “Verify Setup” button
  async function handleVerify() {
    console.log('[TelegramSetupCampaign] handleVerify clicked!');
    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Make sure user is connected
    if (!userAccount?.address) {
      console.warn('[TelegramSetupCampaign] No wallet address found');
      setErrorMessage('No wallet address found. Please connect your wallet first.');
      setIsVerifying(false);
      return;
    }

    // Prepare the POST body
    const bodyData = {
      campaignId,
      walletAddress: userAccount.address,
      campaignName,
      category,
      inviteLink,
      telegramType,
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
        // Attempt to parse JSON
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

      // If successful
      const data = await response.json();
      console.log('[TelegramSetupCampaign] Verification successful:', data);
      setSuccessMessage('Campaign created successfully!');

      // If the server returns the final campaign ID in `data.id`, use that
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

  // Helper for “telegramType”
  function handleTelegramTypeChange(value: string) {
    const mapped = stringToTelegramAssetType(value);
    setTelegramType(mapped ?? '');
  }

  function stringToTelegramAssetType(value: string): TelegramAssetType | undefined {
    switch (value.toUpperCase()) {
      case 'CHANNEL':
        return TelegramAssetType.CHANNEL;
      case 'MINI_APP':
        return TelegramAssetType.MINI_APP;
      default:
        return undefined;
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
          <h2 style={{ margin: 0 }}>Deploy New Campaign</h2>
          {/* Info icon with tooltip */}
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              cursor: 'pointer',
              fontSize: '1.2rem',
            }}
            title="We create a new campaign contract on the blockchain. 
This can take ~20–30 seconds because we wait for 
the 'CampaignCreatedEvent' on our server before moving on."
          >
            ℹ️
          </div>
        </div>

        {/* EXPLANATORY TEXT */}
        <p style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: '#555' }}>
          By clicking "Verify Setup," we’ll deploy a new campaign contract on the TON blockchain
          and wait for our server to confirm creation. Once confirmed, you’ll
          automatically proceed to the next step. This can take up to 30 seconds.
        </p>

        {/* Display the campaign ID if available */}
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

        {/* Telegram Type (dropdown) */}
        <div className="form-group">
          <label htmlFor="telegramType">*Telegram Type:</label>
          <select
            id="telegramType"
            value={telegramType}
            onChange={(e) => handleTelegramTypeChange(e.target.value)}
          >
            <option value="" disabled>
              Select Telegram Asset Type
            </option>
            {Object.values(TelegramAssetType).map((typeStr) => (
              <option key={typeStr} value={typeStr}>
                {typeStr}
              </option>
            ))}
          </select>
        </div>

        {/* Invite Link (Required) */}
        <div className="form-group">
          <label htmlFor="inviteLink">*Copy invite link to channel here:</label>
          <input
            id="inviteLink"
            type="text"
            value={inviteLink}
            onChange={(e) => setInviteLink(e.target.value)}
          />
        </div>

        {/* Error or success messages */}
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

        {/* "Verify Setup" button */}
        <button
          className="telegram-campaign-button"
          disabled={
            !campaignName ||
            !category ||
            !inviteLink ||
            !telegramType ||
            isVerifying
          }
          onClick={handleVerify}
          title={
            !campaignName || !category || !inviteLink || !telegramType
              ? 'Please fill all the mandatory fields marked with *'
              : ''
          }
          style={{ marginTop: '1rem' }}
        >
          {isVerifying ? 'Deploying... Please wait' : 'Verify Setup'}
        </button>
      </div>
    </motion.div>
  );
}

export default TelegramSetupCampaign;
