import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useUserRole } from '../UserRoleContext';
import { useTonConnectFetchContext } from '../TonConnectProvider';
import useSocket from '../hooks/useSocket'; // Hook for socket management
import { ScreenProps } from './ScreenNavigation'; // Centralized screen props

const CampaignStatus: React.FC<ScreenProps> = ({ setScreen }) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showStatusDetails, setShowStatusDetails] = useState(false);
  const [showCampaignData, setShowCampaignData] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const { userRole } = useUserRole();
  const { connectedStatus } = useTonConnectFetchContext();
  const { campaignsIds, campaignDetailsFromId, fetchCampaignDetails } = useSocket('http://localhost:5000');

  const getStatusRowStyle = () => {
    if (campaignDetailsFromId?.isCampaignActive) return 'detail-row-active';
    return 'detail-row-inactive';
  };

//   const handleAddTonUsdtClick = () => setIsPopupOpen(true);
  const handleClosePopup = () => setIsPopupOpen(false);

  const handleCampaignSelect = (id: string) => {
    if (id) {
      fetchCampaignDetails(id);
    }
    setSelectedCampaignId(id);
    setShowStatusDetails(false);
    setShowCampaignData(false);
  };

  const renderValue = (value: any): React.ReactNode => {
    if (typeof value === 'object' && value !== null) {
      return (
        <div style={{ marginLeft: '1rem' }}>
          {Object.entries(value).map(([nestedKey, nestedValue]) => (
            <div key={nestedKey}>
              <strong>{nestedKey}:</strong> {renderValue(nestedValue)}
            </div>
          ))}
        </div>
      );
    }
    return value?.toString();
  };

  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="campaign-status card">
        {userRole === 'Advertiser' && <h1>Campaign Management</h1>}
        {userRole === 'Affiliate' && <h1>Campaign Market</h1>}

        {!connectedStatus && <p>To proceed, we need you to connect your Telegram wallet</p>}

        <div className="navigation-buttons">
          {connectedStatus && <p className="message status-active">Following Wallet is Connected:</p>}
          <TonConnectButton />
        </div>

        {connectedStatus && (
          <div className="card">
            <label className="label">Available Campaigns:</label>
            <select
              className="available-select"
              value={selectedCampaignId || ''}
              onChange={(e) => handleCampaignSelect(e.target.value)}
            >
              <option value="" disabled>
                Select a campaign
              </option>
              {campaignsIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        )}

        {connectedStatus && campaignDetailsFromId && (
          <>
            <div className="card">
              <div className="status-row">
                <label className="label">Campaign Status:</label>
                <span
                  className={`status ${
                    campaignDetailsFromId.isCampaignActive ? 'status-active' : 'status-inactive'
                  }`}
                >
                  {campaignDetailsFromId.isCampaignActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {userRole === 'Advertiser' && (
                <div className="expander">
                  <button
                    className="main-button expander-button display-block"
                    onClick={() => setShowStatusDetails((prev) => !prev)}
                  >
                    {showStatusDetails ? 'Hide Details ▼' : 'Status Details ▲'}
                  </button>
                  {showStatusDetails && (
                    <motion.div
                      className="expander-content"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="details-pane">
                        <div className={getStatusRowStyle()}>
                          <label>Sufficient Max Cpa Funds:</label>
                          <span
                            className={`status ${
                              campaignDetailsFromId.campaignHasSufficientFundsToPayMaxCpa
                                ? 'status-active'
                                : 'status-inactive'
                            }`}
                          >
                            {campaignDetailsFromId.campaignHasSufficientFundsToPayMaxCpa ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {/* Additional campaign details */}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <div className="expander">
                <button
                  className="main-button expander-button display-block"
                  onClick={() => setShowCampaignData((prev) => !prev)}
                >
                  {showCampaignData ? 'Hide Campaign Data ▼' : 'Campaign Data ▲'}
                </button>
                {showCampaignData && (
                  <motion.div
                    className="expander-content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="details2-pane">
                      {Object.entries(campaignDetailsFromId).map(([key, value]) => (
                        <div key={key} className="detail2-row">
                          <strong>{key}:</strong> <span>{renderValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {isPopupOpen && (
              <div className="popup-overlay">
                <div className="popup">
                  <button className="popup-close-top" onClick={handleClosePopup}>
                    ×
                  </button>
                  <h2>Add TON/USDT</h2>
                  <label>Select TON Amount To Add:</label>
                  <div className="popup-row">
                    <input
                      type="number"
                      step="0.01"
                      className="popup-input"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="popup-buttons">
                    <button className="popup-button" onClick={handleClosePopup}>
                      Close
                    </button>
                    <button className="popup-button">Submit</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="navigation-buttons">
        {userRole === 'Advertiser' && (
          <button className="nav-button" onClick={() => setScreen('advertiser')}>
            Go Back
          </button>
        )}
        <button className="nav-button" onClick={() => setScreen('main')}>
          Go to Main Screen
        </button>
      </div>
    </motion.div>
  );
};

export default CampaignStatus;
