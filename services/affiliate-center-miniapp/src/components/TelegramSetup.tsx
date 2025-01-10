import React, { useState } from 'react';
import { useTelegramCampaignContext } from './TelegramCampaignContext';
import { TelegramCategory, TelegramAsset, TelegramAssetType } from '@common/models';
import { motion } from 'framer-motion';
import { ScreenProps } from './ScreenNavigation';

interface TelegramSetupProps extends ScreenProps {
  campaignId: string | null;
}

const TelegramSetup: React.FC<TelegramSetupProps> = ({ setScreen, campaignId }) => {
  const { telegramCampaign, setTelegramCampaign } = useTelegramCampaignContext();
  const [campaignName, setCampaignName] = useState('');
  const [category] = useState<TelegramCategory | ''>('');
  const [description, setDescription] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [telegramType, setTelegramType] = useState<TelegramAssetType | ''>(''); // Empty value fallback
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [telegramAsset, setTelegramAsset] = useState<TelegramAsset | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      setTelegramAsset(data.telegramAsset as TelegramAsset);
      setIsVerified(true);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to verify the Telegram URL. Please try again.');
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('@ton_affiliates_verifier_bot');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    if (!telegramAsset) return;
    setTelegramCampaign({
      ...telegramCampaign,
      name: campaignName,
      description,
      category: category as TelegramCategory,
      telegramAsset,
    });
    setScreen('campaign');
  };

  const renderTelegramType = (type: TelegramAssetType): string => {
    switch (type) {
      case TelegramAssetType.CHANNEL:
        return 'Channel';
      case TelegramAssetType.GROUP:
        return 'Group';
      default:
        return 'Unknown';
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
            id="telegramType"
            value={telegramType !== undefined ? TelegramAssetType[telegramType as number] : ''} // Ensure numeric index
            onChange={(e) => handleTelegramTypeChange(e.target.value)}
          >
            <option value="" disabled>
              Select Telegram Asset Type
            </option>
            {Object.values(TelegramAssetType)
              .filter((value) => typeof value === 'number') // Only numeric values
              .map((type) => (
                <option key={type} value={TelegramAssetType[type as number]}>
                  {TelegramAssetType[type as number]}
                </option>
              ))}
          </select>;

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
        <div className="card">
          <p>
            <strong>Why add the bot as an admin?</strong>{' '}
            <button
              className="info-button"
              title="The bot needs admin privileges to verify membership of users."
            >
              i
            </button>
          </p>
          <ul>
            <li>
              <strong>Public:</strong> Add the bot as an admin with the <em>"Add Members"</em>{' '}
              privilege.
            </li>
            <li>
              <strong>Private:</strong> Add the bot as an admin with the <em>"Manage Chat"</em>{' '}
              privilege.
            </li>
          </ul>
          <div className="copy-pane">
            @ton_affiliates_verifier_bot
            <button
              className={`copy-button ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              disabled={copied}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="inviteLink" className="align-self-center">
            *Copy invite link to group/channel here:
          </label>
          <input
            id="inviteLink"
            type="text"
            value={inviteLink}
            onChange={(e) => setInviteLink(e.target.value)}
          />
        </div>
        {errorMessage && <div className="error-popup"><p>{errorMessage}</p></div>}
        {isVerified && telegramAsset && (
          <div className="popup-overlay">
            <div className="popup-container">
              <h2>Telegram Details Verified</h2>
              <p>
                <strong>
                  {telegramAsset.type === TelegramAssetType.GROUP ? 'Group Name:' : 'Channel Name:'}
                </strong>{' '}
                {telegramAsset.name}
              </p>
              <p>
                <strong>Type:</strong> {renderTelegramType(telegramAsset.type)}
              </p>
              <p>
                <strong>Visibility:</strong> {telegramAsset.isPublic ? 'Public' : 'Private'}
              </p>
              <p>
                <strong>Invite Link:</strong>{' '}
                <a href={telegramAsset.url} target="_blank" rel="noopener noreferrer">
                  {telegramAsset.url}
                </a>
              </p>
              <button className="next-step-button" onClick={handleConfirm}>
                Confirm and Proceed
              </button>
            </div>
          </div>
        )}
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
