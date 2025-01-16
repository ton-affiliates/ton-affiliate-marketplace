import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TelegramCategory, TelegramAssetType } from '@common/models';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { ScreenProps } from './ScreenNavigation';

interface TelegramSetupProps extends ScreenProps {
  campaignId: string | null;
}

const TelegramSetup: React.FC<TelegramSetupProps> = ({ campaignId }) => {
  const [campaignName, setCampaignName] = useState('');
  const [category, setCategory] = useState<TelegramCategory | ''>('');
  const [description, setDescription] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [telegramType, setTelegramType] = useState<TelegramAssetType | ''>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get the user’s connected wallet from TonConnect
  const { userAccount } = useTonConnectFetchContext();

  const handleVerify = async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    console.log('handleVerify fields:', {
      campaignId,
      campaignName,
      category,
      inviteLink,
      description,
      telegramType,
      userWalletAddress: userAccount?.address,
    });

    try {
      // Ensure there's a connected wallet address
      if (!userAccount?.address) {
        throw new Error('No wallet address found. Please connect your wallet first.');
      }

      const response = await fetch(`/api/v1/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          walletAddress: userAccount.address,
          campaignName,
          category,
          inviteLink,
          description,
          telegramType,
        }),
      });

      if (!response.ok) {
        // Attempt to read an error message from the response body
        let serverError = 'Unknown server error';
        try {
          const errorBody = await response.json();
          if (errorBody.error) {
            serverError = errorBody.error;
          } else if (errorBody.message) {
            serverError = errorBody.message;
          }
        } catch (err) {
          // If parsing fails, we keep the fallback message
          console.error('Failed to parse server error JSON:', err);
        }
        throw new Error(serverError);
      }

      const data = await response.json();
      console.log('Verification successful:', data);
      // handle success (toast, navigate, etc.)
      
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to verify the Telegram URL. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Convert user’s selected string to our TelegramAssetType enum
  const handleTelegramTypeChange = (value: string) => {
    const mapped = stringToTelegramAssetType(value);
    if (mapped) {
      setTelegramType(mapped);
    } else {
      console.error(`Invalid TelegramType: ${value}`);
    }
  };

  const stringToTelegramAssetType = (value: string): TelegramAssetType | undefined => {
    switch (value.toUpperCase()) {
      case 'CHANNEL':
        return TelegramAssetType.CHANNEL;
      case 'GROUP':
        return TelegramAssetType.GROUP;
      case 'SUPER_GROUP':
        return TelegramAssetType.SUPER_GROUP;
      case 'MINI_APP':
        return TelegramAssetType.MINI_APP;
      default:
        return undefined;
    }
  };

  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="card">
        <h2>Set Up Your Telegram</h2>
        <p>
          <strong>Campaign ID:</strong> {campaignId || 'No campaign ID provided'}
        </p>

        <div className="form-group">
          <label htmlFor="campaignName">*Campaign Name:</label>
          <input
            id="campaignName"
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />
        </div>

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

        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="inviteLink">*Copy invite link to group/channel here:</label>
          <input
            id="inviteLink"
            type="text"
            value={inviteLink}
            onChange={(e) => setInviteLink(e.target.value)}
          />
        </div>

        {errorMessage && (
          <div className="error-popup">
            <p style={{ color: 'red', whiteSpace: 'pre-line' }}>{errorMessage}</p>
          </div>
        )}

        <div className="buttons-container">
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
          >
            {isVerifying ? 'Verifying...' : 'Verify Setup'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TelegramSetup;
