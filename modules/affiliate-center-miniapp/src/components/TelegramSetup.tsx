import React, { useState } from 'react';
import { TelegramCategory, TelegramAssetType } from '@common/models';
import { motion } from 'framer-motion';
import { ScreenProps } from './ScreenNavigation';

interface TelegramSetupProps extends ScreenProps {
  campaignId: string | null;
}

const TelegramSetup: React.FC<TelegramSetupProps> = ({ campaignId }) => {
  const [campaignName, setCampaignName] = useState('');
  const [category, setCategory] = useState<TelegramCategory | ''>('');
  const [description, setDescription] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [telegramType, setTelegramType] = useState<TelegramAssetType | ''>(''); // Empty value fallback
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/telegram/verify-and-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: inviteLink }),
      });

      if (!response.ok) {
        throw new Error('Invalid invite link or insufficient bot privileges.');
      }

      const data = await response.json();
      console.log('Verification successful:', data);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to verify the Telegram URL. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTelegramTypeChange = (value: string) => {
    const mappedType = stringToTelegramAssetType(value);
    if (mappedType !== undefined) {
      setTelegramType(mappedType);
    } else {
      console.error(`Invalid TelegramType: ${value}`);
    }
  };

  // Helper function to map strings to TelegramAssetType
  const stringToTelegramAssetType = (value: string): TelegramAssetType | undefined => {
    switch (value.toLowerCase()) {
      case 'channel':
        return TelegramAssetType.CHANNEL;
      case 'group':
        return TelegramAssetType.GROUP;
      case 'super_group':
        return TelegramAssetType.SUPER_GROUP;
      case 'forum':
        return TelegramAssetType.FORUM;
      case 'mini_app':
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
            value={telegramType !== '' ? TelegramAssetType[telegramType as number] : ''}
            onChange={(e) => handleTelegramTypeChange(e.target.value)}
          >
            <option value="" disabled>
              Select Telegram Asset Type
            </option>
            {Object.values(TelegramAssetType)
              .filter((value) => typeof value === 'number')
              .map((type) => (
                <option key={type} value={TelegramAssetType[type as number]}>
                  {TelegramAssetType[type as number]}
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
        {errorMessage && <div className="error-popup"><p>{errorMessage}</p></div>}
        <div className="buttons-container">
          <button
            className="telegram-campaign-button"
            disabled={!campaignName || !category || !inviteLink || !telegramType || isVerifying}
            onClick={handleVerify}
            title={
              !campaignName || !category || !inviteLink || !telegramType
                ? 'Please fill all the Mandatory Fields marked with *'
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
