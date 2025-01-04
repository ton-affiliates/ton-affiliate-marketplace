import React, { useState } from 'react';
import { useUserRole } from "../UserRoleContext";
import { TonConnectButton } from '@tonconnect/ui-react';
import {  } from '../hooks/useTonConnect';
import { motion } from 'framer-motion';
import { useTonConnectFetchContext } from '../TonConnectProvider';
import useSocket from '../hooks/useSocket'; // Correct default import

interface CampaignStatusProps {
    setScreen: React.Dispatch<React.SetStateAction<'main' | 'advertiser' | 'campaign' | 'status'>>;
}
  


const CampaignStatus: React.FC<CampaignStatusProps> = ({ setScreen }) => {

    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    //const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetails | null>(null);
    const [showStatusDetails, setShowStatusDetails] = useState(false);
    const [showCampaignData, setShowCampaignData] = useState(false);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const { userRole } = useUserRole();

    const { campaignsIds, campaignDetailsFromId, fetchCampaignDetails } = useSocket('http://localhost:5000'); // Backend URL

    //const { connected } = useTonConnect();
    const { connectedStatus } = useTonConnectFetchContext();

    const getStatusRowStyle = () => {
        if(campaignDetailsFromId && campaignDetailsFromId.isCampaignActive) 
            return  "detail-row-active";
        return "detail-row-inactive";
    };

    const handleAddTonUsdtClick = () => {
        setIsPopupOpen(true);
    };

    const handleClosePopup = () => {
        setIsPopupOpen(false);
    };

    const handleCampaignSelect = (id: string) => {
        if (id) {
            fetchCampaignDetails(id);
          }
        setSelectedCampaignId(id);
       // setSelectedCampaign(campaign);
        setShowStatusDetails(false); // Reset the status details expander
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

            {/* <div>
      <h1>Available Campaigns:</h1>
      {campaignsIds.length > 0 ? (
        <select>
          {campaignsIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      ) : (
        <p>No campaigns available.</p>
      )}
        {campaignDetailsFromId && (
        <div>
          <h3>Campaign Details</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {Object.entries(campaignDetailsFromId).map(([key, value]) => (
              <div key={key}>
                 <strong>{key}:</strong> {value !== null && value !== undefined ? String(value) : 'N/A'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div> */}
            {userRole==="Advertiser" && (
                <h1>Campaign Management</h1>)}
            {userRole==="Affiliate" && (
                <h1>Campaign Market</h1>)}
                {/* Combobox */}

                {!connectedStatus && ( 
                    <p>To proceed, we need you to connect your Telegram wallet</p>)}
                    <div className="navigation-buttons">    
                {connectedStatus && ( 
                    <p className="message status-active">
                       Following Wallet is Connected:</p>)}
                       
                    <TonConnectButton />
                </div>

                {connectedStatus && ( 
                    <div className="card">
                        <label className="label">Available Campaigns:</label>
                        <select
                        className="available-select"
                        value={selectedCampaignId || ""}
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
                

                {/* Campaign Status */}
                {connectedStatus && campaignDetailsFromId && (
                    <>
                    <div className="card">
                        <div className="status-row">
                            <label className="label">Campaign Status:</label>
                            <span
                            className={`status ${
                                campaignDetailsFromId.isCampaignActive ? "status-active" : "status-inactive"
                            }`}
                            >
                            {campaignDetailsFromId.isCampaignActive ? "Active" : "Inactive"}
                            </span>
                        </div>


                        <div className="expander">
                        {userRole ==="Advertiser" && (  
                            <button
                                className="main-button expander-button display-block"
                                onClick={() => setShowStatusDetails((prev) => !prev)}
                            >
                                {showStatusDetails ? "Hide Details  ▼" : "Status Details  ▲"}
                            </button>)}
                            {showStatusDetails && userRole ==="Advertiser" && (
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
                                                    ? "status-active"
                                                    : "status-inactive"
                                                }`}
                                            >
                                                {campaignDetailsFromId.campaignHasSufficientFundsToPayMaxCpa
                                                ? "Yes"
                                                : "No"}
                                            </span>
                                            {!campaignDetailsFromId.campaignHasSufficientFundsToPayMaxCpa && (
                                                
                                                <button className='min-content funds-button'>Add Funds</button>
                                            )}
                                        </div>
                                        <div className={getStatusRowStyle()}>
                                            <label>Sufficient Gas Fees:</label>
                                        
                                            <span
                                                className={`status ${
                                                campaignDetailsFromId.campaignHasSufficientTonToPayGasFees
                                                    ? "status-active"
                                                    : "status-inactive"
                                                }`}
                                            >
                                                {campaignDetailsFromId.campaignHasSufficientTonToPayGasFees
                                                ? "Yes"
                                                : "No"}
                                            </span>
                                            {!campaignDetailsFromId.campaignHasSufficientTonToPayGasFees && (
                                                
                                                <button className='min-content funds-button'>Add Funds</button>
                                            )}
                                        </div>
                                        <div className={getStatusRowStyle()}>
                                            <label>Campaign Expired:</label>
                                        
                                            <span
                                                className={`status ${
                                                campaignDetailsFromId.isCampaignExpired 
                                                    ? "status-inactive"
                                                    : "status-active"
                                                }`}
                                            >
                                                {campaignDetailsFromId.isCampaignExpired 
                                                ? "Yes"
                                                : "No"}
                                            </span>
                                            {!campaignDetailsFromId.isCampaignActive && !campaignDetailsFromId.isCampaignExpired && (
                                                
                                                <button className='min-content funds-button visible-collapsed2'>Add Funds</button>
                                            )}
                                        </div>
                                        <div className={getStatusRowStyle()}>
                                            <label>Campaign Paused:</label>
                                        
                                            <span
                                                className={`status ${
                                                campaignDetailsFromId.isCampaignPausedByAdmin  
                                                    ? "status-inactive"
                                                    : "status-active"
                                                }`}
                                            >
                                                {campaignDetailsFromId.isCampaignPausedByAdmin  
                                                ? "Yes"
                                                : "No"}
                                            </span>
                                            {!campaignDetailsFromId.isCampaignActive   && !campaignDetailsFromId.isCampaignPausedByAdmin &&(
                                                
                                                <button className='min-content funds-button visible-collapsed2'>Add Funds</button>
                                            )}
                                        </div>
                                    {/* Add other details like Campaign Expired */}
                                </div>
                                </motion.div>
                            )}
                        </div> 
                    </div>
                    {/* Additional Cards */}
                    {/* Campaign Data */}
                    {/* <div className="card">
                        <button onClick={() => setShowCampaignData((prev) => !prev)}>
                        {showCampaignData ? "Hide Campaign Data ▼" : "Campaign Data ▲"}
                        </button>
                        {showCampaignData && (
                        <div className="details2-pane">
                            {Object.entries(campaignDetailsFromId).map(([key, value]) => (
                            <div key={key} className="detail2-row">
                                <strong>{key}:</strong> <span>{value?.toString()}</span>
                            </div>
                            ))}
                        </div>
                        )}
                    </div> */}

                    <div className="card">
                        <div className="expander">
                            <button
                                className="main-button expander-button display-block"
                                onClick={() => setShowCampaignData((prev) => !prev)}
                            >
                                {showCampaignData ? "Hide Campaign Data ▼" : "Campaign Data ▲"}
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


                    <div>
                    {campaignDetailsFromId && userRole==="Advertiser" && (
                        <div>
                        {/* Advertiser Actions */}
                        <div className="card">
                            <h3>Advertiser Actions:</h3>
                            <div className="button-group vertically-aligned2">
                            <button className="nav-button" onClick={handleAddTonUsdtClick}>Add TON/USDT</button>
                            <button className="nav-button">Withdraw Campaign</button>
                            <button className="nav-button">Approve Affiliates</button>
                            <button className="nav-button">SignOff Affiliates</button>
                            </div>
                        </div>
                        </div>
                    )}
                    </div>

                    <div>
                    {campaignDetailsFromId && userRole==="Affiliate" && (
                        <div>
                        {/* Advertiser Actions */}
                        <div className="card">
                            <h3>Affiliates Actions:</h3>
                            <div className="button-group vertically-aligned2">
                            
                            <button className="nav-button">Join Campaign!</button>
                            <button className="nav-button">Generate New Affiliate Link</button>
                            <button className="nav-button">Withdraw Earnings</button>
                            </div>
                        </div>
                        </div>
                    )}
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
            {userRole==="Advertiser" && (
                <button className="nav-button" onClick={() => setScreen('advertiser')}>Go Back</button>)}
                <button className="nav-button" onClick={() => setScreen('main')}>Go to Main Screen</button>
            </div>
        </motion.div>
    );
};

export default CampaignStatus;


