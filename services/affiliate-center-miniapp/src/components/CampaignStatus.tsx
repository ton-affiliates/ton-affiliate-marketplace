import React, { useState } from 'react';
import { useUserRole } from "../UserRoleContext";
import { TonConnectButton } from '@tonconnect/ui-react';
import { useTonConnect } from '../hooks/useTonConnect';
import { motion } from 'framer-motion';
import { useTonConnectFetchContext } from '../TonConnectProvider';

interface CampaignStatusProps {
    setScreen: React.Dispatch<React.SetStateAction<'main' | 'advertiser' | 'campaign' | 'status'>>;
}

type CampaignDetails = {
    campaignId: string;
    advertiser: string;
    owner: string;
    payout: string;
    campaignDetails: {
      regularUsersCostPerAction: string;
      premiumUsersCostPerAction: string;
      allowedAffiliates: string;
      isPublicCampaign: boolean;
      campaignExpiresInNumDays: string;
      paymentMethod: string;
      requiresAdvertiserApprovalForWithdrawl: boolean;
    };
    numAffiliates: string;
    totalAffiliateEarnings: string;
    state: string;
    campaignStartTimestamp: string;
    lastUserActionTimestamp: string;
    numAdvertiserWithdrawls: string;
    numAdvertiserSignOffs: string;
    numUserActions: string;
    campaignBalance: string;
    maxCpaValue: string;
    contractTonBalance: string;
    contractAddress: string;
    contractUSDTBalance: string;
    contractUsdtJettonWallet: string;
    advertiserFeePercentage: string;
    affiliateFeePercentage: string;
    campaignHasSufficientFundsToPayMaxCpa: boolean;
    isCampaignExpired: boolean;
    isCampaignPausedByAdmin: boolean;
    campaignHasSufficientTonToPayGasFees: boolean;
    isCampaignActive: boolean;
    topAffiliates: string;
  };
  
  const campaignMap: { [key: string]: CampaignDetails } = {
    "3969379339": {
      campaignId: "3969379339",
      advertiser: "EQCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL39o",
      owner: "EQC7JRZSSZMiQEnw_bShtIfuLbIyFNfIHE8S2IJBVshgL-1W",
      payout: "EQCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL39o",
      campaignDetails: {
        regularUsersCostPerAction: "0: 0.2",
        premiumUsersCostPerAction: "0: 0.2",
        allowedAffiliates: "",
        isPublicCampaign: true,
        campaignExpiresInNumDays: "No Expiration",
        paymentMethod: "USDT",
        requiresAdvertiserApprovalForWithdrawl: false,
      },
      numAffiliates: "0",
      totalAffiliateEarnings: "0",
      state: "1",
      campaignStartTimestamp: "22/12/2024, 13:37:20",
      lastUserActionTimestamp: "01/01/1970, 2:00:00",
      numAdvertiserWithdrawls: "0",
      numAdvertiserSignOffs: "0",
      numUserActions: "0",
      campaignBalance: "0",
      maxCpaValue: "0.2",
      contractTonBalance: "0.172914241",
      contractAddress: "EQAjGgLZ8HE-cRFlWnmPJXTxkaPpmwpgTvrsdMtZmi4Ef4Aq",
      contractUSDTBalance: "0",
      contractUsdtJettonWallet: "EQBROtQznU4a0Gyroul5q2xY2TnGGTwtLHazLWZVtx6cwB_h",
      advertiserFeePercentage: "0",
      affiliateFeePercentage: "200",
      campaignHasSufficientFundsToPayMaxCpa: false,
      isCampaignExpired: false,
      isCampaignPausedByAdmin: false,
      campaignHasSufficientTonToPayGasFees: false,
      isCampaignActive: false,
      topAffiliates: "",
    },
    "3969379340": {
        campaignId: "3969379340",
        advertiser: "EQFakeAdvertiser...",
        owner: "EQFakeOwner...",
        payout: "EQFakePayout...",
        campaignDetails: {
        regularUsersCostPerAction: "0: 0.3",
        premiumUsersCostPerAction: "0: 0.4",
        allowedAffiliates: "",
        isPublicCampaign: true,
        campaignExpiresInNumDays: "No Expiration",
        paymentMethod: "TON",
        requiresAdvertiserApprovalForWithdrawl: true,
        },
        numAffiliates: "5",
        totalAffiliateEarnings: "1.5",
        state: "1",
        campaignStartTimestamp: "21/12/2024, 13:37:20",
        lastUserActionTimestamp: "01/01/1970, 2:00:00",
        numAdvertiserWithdrawls: "0",
        numAdvertiserSignOffs: "0",
        numUserActions: "0",
        campaignBalance: "1",
        maxCpaValue: "0.4",
        contractTonBalance: "0.5",
        contractAddress: "EQFakeAddress...",
        contractUSDTBalance: "1",
        contractUsdtJettonWallet: "EQFakeWallet...",
        advertiserFeePercentage: "0",
        affiliateFeePercentage: "200",
        campaignHasSufficientFundsToPayMaxCpa: true,
        isCampaignExpired: false,
        isCampaignPausedByAdmin: false,
        campaignHasSufficientTonToPayGasFees: true,
        isCampaignActive: true,
        topAffiliates: "Affiliate1, Affiliate2",
    },
  };

const CampaignStatus: React.FC<CampaignStatusProps> = ({ setScreen }) => {

    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetails | null>(null);
    const [showStatusDetails, setShowStatusDetails] = useState(false);
    const [showCampaignData, setShowCampaignData] = useState(false);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const { userRole } = useUserRole();
    //const { connected } = useTonConnect();
    const { connectedStatus } = useTonConnectFetchContext();

    const getStatusRowStyle = () => {
        if(selectedCampaign && selectedCampaign.isCampaignActive) 
            return  "detail-row-active";
        return "detail-row-inactive";
    };

    const handleAddTonUsdtClick = () => {
        setIsPopupOpen(true);
    };

    const handleClosePopup = () => {
        setIsPopupOpen(false);
    };

    const getCampaignIds = () => Object.keys(campaignMap);

    const getCampaignById = (id: string) => {
        return campaignMap[id] || null;
    };

    const handleCampaignSelect = (id: string) => {
        setSelectedCampaignId(id);
        const campaign = getCampaignById(id);
        setSelectedCampaign(campaign);
        setShowStatusDetails(false); // Reset the status details expander
        setShowCampaignData(false);
    };

    return (
        <motion.div
            className="screen-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >

            <div className="campaign-status card">
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
                        {getCampaignIds().map((id) => (
                            <option key={id} value={id}>
                            {id}
                            </option>
                        ))}
                        </select>
                    </div>
                )}
                

                {/* Campaign Status */}
                {connectedStatus && selectedCampaign && (
                    <>
                    <div className="card">
                        <div className="status-row">
                            <label className="label">Campaign Status:</label>
                            <span
                            className={`status ${
                                selectedCampaign.isCampaignActive ? "status-active" : "status-inactive"
                            }`}
                            >
                            {selectedCampaign.isCampaignActive ? "Active" : "Inactive"}
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
                                                selectedCampaign.campaignHasSufficientFundsToPayMaxCpa
                                                    ? "status-active"
                                                    : "status-inactive"
                                                }`}
                                            >
                                                {selectedCampaign.campaignHasSufficientFundsToPayMaxCpa
                                                ? "Yes"
                                                : "No"}
                                            </span>
                                            {!selectedCampaign.campaignHasSufficientFundsToPayMaxCpa && (
                                                
                                                <button className='min-content funds-button'>Add Funds</button>
                                            )}
                                        </div>
                                        <div className={getStatusRowStyle()}>
                                            <label>Sufficient Gas Fees:</label>
                                        
                                            <span
                                                className={`status ${
                                                selectedCampaign.campaignHasSufficientTonToPayGasFees
                                                    ? "status-active"
                                                    : "status-inactive"
                                                }`}
                                            >
                                                {selectedCampaign.campaignHasSufficientTonToPayGasFees
                                                ? "Yes"
                                                : "No"}
                                            </span>
                                            {!selectedCampaign.campaignHasSufficientTonToPayGasFees && (
                                                
                                                <button className='min-content funds-button'>Add Funds</button>
                                            )}
                                        </div>
                                        <div className={getStatusRowStyle()}>
                                            <label>Campaign Expired:</label>
                                        
                                            <span
                                                className={`status ${
                                                selectedCampaign.isCampaignExpired 
                                                    ? "status-inactive"
                                                    : "status-active"
                                                }`}
                                            >
                                                {selectedCampaign.isCampaignExpired 
                                                ? "Yes"
                                                : "No"}
                                            </span>
                                            {!selectedCampaign.isCampaignActive && !selectedCampaign.isCampaignExpired && (
                                                
                                                <button className='min-content funds-button visible-collapsed2'>Add Funds</button>
                                            )}
                                        </div>
                                        <div className={getStatusRowStyle()}>
                                            <label>Campaign Paused:</label>
                                        
                                            <span
                                                className={`status ${
                                                selectedCampaign.isCampaignPausedByAdmin  
                                                    ? "status-inactive"
                                                    : "status-active"
                                                }`}
                                            >
                                                {selectedCampaign.isCampaignPausedByAdmin  
                                                ? "Yes"
                                                : "No"}
                                            </span>
                                            {!selectedCampaign.isCampaignActive   && !selectedCampaign.isCampaignPausedByAdmin &&(
                                                
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
                            {Object.entries(selectedCampaign).map(([key, value]) => (
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
                                        {Object.entries(selectedCampaign).map(([key, value]) => (
                                        <div key={key} className="detail2-row">
                                            <strong>{key}:</strong> <span>{value?.toString()}</span>
                                        </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>


                    <div>
                    {selectedCampaign && userRole==="Advertiser" && (
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
                    {selectedCampaign && userRole==="Affiliate" && (
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


