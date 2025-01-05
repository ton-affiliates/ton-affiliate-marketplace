import React, { useState } from 'react';
import { useTelegramCampaignContext, TelegramCategory, TelegramAsset  } from '../TelegramCampaignContext';
import { motion } from 'framer-motion';

interface TelegramSetupProps {
  setScreen: React.Dispatch<React.SetStateAction<'main' | 'advertiser' | 'campaign' | 'status' | 'setupTelegram' | 'deployEmptyCampaign'>>;
}

const TelegramSetup: React.FC<TelegramSetupProps> = ({ setScreen }) => {
  const { telegramCampaign, setTelegramCampaign } = useTelegramCampaignContext();
  const [campaignName, setCampaignName] = useState('');
  const [category, setCategory] = useState<TelegramCategory | ''>('');
  const [description, setDescription] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sleep = (ms: number | undefined) => new Promise(r => setTimeout(r, ms));
  const serverBaseUrl = process.env.REACT_APP_SRV_BASE_URL;
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    setErrorMessage('');

    try {
	
		if (!serverBaseUrl) {
            console.error('SERVER BASE API URL is not defined. Please check your .env file.');
        }
		
      const response = await fetch('${serverBaseUrl}/telegram/verify-and-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: inviteLink }),
      });

      await sleep(1000);

      if (!response.ok) {
        console.error('Invalid invite link');
        throw new Error('Invalid invite link');
      }

     const data = await response.json();
     // const mockedData = JSON.parse("{\"telegramAsset\":{\"id\":-1002273905871,\"name\":\"TonAffiliatesTestChannel\",\"type\":0,\"isPublic\":false,\"url\":\"https://t.me/+0_piKmVp4nk1YTQ0\"}}");
      setTelegramCampaign({
        ...telegramCampaign,
        campaignId: '',
        name: campaignName,
        description: description,
        category: category as TelegramCategory,
        telegramAsset: data.telegramAsset as TelegramAsset,
      });
      
      setIsVerified(true);
      setShowSuccessPopup(true); // Show popup
    } catch (error) {
      setErrorMessage('The invite link you entered is not valid. Please enter a valid link and try again.');
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('@ton_affiliates_verifier_bot');
    setCopied(true);

    setTimeout(() => setCopied(false), 2000); // Reset "Copied" after 2 seconds
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
            <option value="" disabled>Select a category</option>
            {Object.values(TelegramCategory).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
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

        <div className="card">
            <p>Please add the following bot as ADMIN to your channel/group with the 'add new members' privileges:</p>
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
            <label htmlFor="inviteLink" className='align-self-center'>*Copy invite link to group/channel here:</label>
            <input
            id="inviteLink"
            type="text"
            value={inviteLink}
            onChange={(e) => setInviteLink(e.target.value)}
            />
        </div>

       

        {errorMessage && (
            <div className="error-popup">
                <div className="error-popup-content">
                <button className="popup-close-top" onClick={() => setErrorMessage(null)}>
                    &times;
                </button>
                <div className="error-popup-body">
                    <h2 className="error-message">We Apologize</h2>
                    <div className="error-message">
                    {errorMessage.split('.').map((sentence, index) =>
                        sentence.trim() ? <p key={index}>{sentence.trim()}.</p> : null
                    )}
                    </div>
                </div>
                <button className="next-step-button" onClick={() => setErrorMessage(null)}>
                    Close
                </button>
                </div>
            </div>
            )}

        {showSuccessPopup && (
            <div className="popup-overlay">
                <div className="popup-container">
                <button className="popup-close-top" onClick={() => setShowSuccessPopup(false)}>
                    &times;
                </button>
                <div className="popup-content">
                    <div className="success-icon">&#x2714;</div> {/* Unicode check mark */}
                    <h2>Your Telegram Details Verified Successfully</h2>
                    <div className="campaign-details-pane">
                    {telegramCampaign && Object.entries(telegramCampaign).map(([key, value]) => (
                        <div key={key} className="campaign-detail">
                        <strong>{key}:</strong>{' '}
                        {typeof value === 'object' && value !== null ? (
                            <div className="nested-object">
                            {Object.entries(value).map(([nestedKey, nestedValue]) => (
                                <div key={nestedKey} className="nested-detail">
                                <strong>{nestedKey}:</strong> {nestedValue?.toString()}
                                </div>
                            ))}
                            </div>
                        ) : (
                            <span>{value?.toString()}</span>
                        )}
                        </div>
                    ))}
                    </div>
                    <button className="next-step-button" onClick={() => setScreen('campaign')}>
                    Next Step
                    </button>
                </div>
                </div>
            </div>
            )}
      
        {/* {isVerifying && (
            <div className="spinner-overlay">
                <div className="spinner-circle"></div>
            </div>
            )} */}

        {isVerifying && (
        <div className="spinner-overlay">
            <div className="spinner-container">
            <div className="spinner-circle"></div>
            <div className="spinner-label">Verifying</div>
            </div>
        </div>
        )}

        <div className="buttons-container">
            <button
           className='telegram-campaign-button'
            disabled={!campaignName || !category || !inviteLink}
            onClick={handleVerify}
            title={!campaignName || !category || !inviteLink ? 'Please fill all the Mandatory Fields marked with *' : ''}
            >
            Verify Setup
            </button>
            <button
           className='telegram-campaign-button'
            disabled={!isVerified}
            onClick={() => setScreen('campaign')}
            >
            Next
            </button>
        </div>
        
        <div className="navigation-buttons">
                    <button className="nav-button" onClick={() => setScreen('advertiser')}>Go Back</button>
                    <button className="nav-button" onClick={() => setScreen('main')}>Go to Main Screen</button>
                </div>
        
        </div>
    </motion.div>
  );
};

export default TelegramSetup;
