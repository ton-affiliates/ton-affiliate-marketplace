import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useTonConnectFetchContext } from '../TonConnectProvider';
//import { useCounterContract } from '../hooks/useCounterContract';

interface NewCampaignProps {
    setScreen: React.Dispatch<React.SetStateAction<'main' | 'advertiser' | 'campaign' | 'status'>>;
}

type CommissionableEventKeys = 'userReferred' | 'premiumUserReferred' | 'userRetained' | 'userActive';

const NewCampaign: React.FC<NewCampaignProps> = ({ setScreen }) => {
    const [isExpanded, setIsExpanded] = useState(false);
   // const { connected } = useTonConnect();
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
   
    const { connectedStatus } = useTonConnectFetchContext();

    // Initialize TonConnect status tracking
  
    const toggleTooltip = () => {
        setIsTooltipVisible((prev) => !prev);
      };
   // const { value, address, sendIncrement } = useCounterContract();
    

    const [campaignDetails, setCampaignDetails] = useState({
        campaignType: 'public',
        tokenType: 'TON',
        commissionableEvents: {
            userReferred: true,
            premiumUserReferred: true,
            userRetained: false,
            userActive: false,
        },
        commissionValues: {
            userReferred: '0.1',
            premiumUserReferred: '0.1',
            userRetained: '',
            userActive: '',
        },
        expirationDateEnabled: false, // Default: expiration date checkbox unchecked
        expirationDate: null,
        approveEarnings: 'yes',
    });

    const handleCheckboxChange = (
        event: React.ChangeEvent<HTMLInputElement>,
        key: CommissionableEventKeys
    ) => {
        const { checked } = event.target;
        setCampaignDetails((prev) => ({
            ...prev,
            commissionableEvents: {
                ...prev.commissionableEvents,
                [key]: checked,
            },
            commissionValues: {
                ...prev.commissionValues,
                [key]: checked ? '' : prev.commissionValues[key],
            },
        }));
    };

    const handleRadioChange = (field: string, value: string) => {
        console.log('Opening Modal with details:', campaignDetails);
        setCampaignDetails((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const [isModalOpen, setModalOpen] = useState(false);

    const handleSubmit = () => {
        setModalOpen(true);
    };

    const handleModalClose = () => {
        
        setModalOpen(false);
        setScreen("status"); // Navigate to CampaignStatus screen
    };

    return (
        <motion.div
            className="screen-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="card">
            {!connectedStatus && ( 
                <p>To proceed, we need you to connect your Telegram wallet</p>)}
                <div className="navigation-buttons">
                {connectedStatus && ( 
                    <p className="message status-active">
                    Following Wallet is Connected:
                </p>
                  )}
                    <TonConnectButton />
                </div>
                
                {connectedStatus && ( 
                    <div className="vertically-aligned">
                        
                        <div className="new-campaign">
                            <h1 className="headline">Create New Campaign</h1>
                            <div className="container-column">
                            {/* Campaign Type */}
                            <div className="card container-column">
                                <label className="label">Campaign Type:</label>
                                <div className="radio-group vertically-aligned">
                                    <label className='checkbox-group2'>
                                        <input
                                            
                                            type="radio"
                                            name="campaignType"
                                            checked={campaignDetails.campaignType === "public"}
                                            value="public"
                                            onChange={() => handleRadioChange('campaignType', 'public')}
                                        />
                                        Public campaign: any affiliate can refer users
                                    </label>
                                    <label className='checkbox-group2'>
                                        <input
                                            type="radio"
                                            name="campaignType"
                                            value="private"
                                            checked={campaignDetails.campaignType === "private"}
                                            onChange={() => handleRadioChange('campaignType', 'private')}
                                        />
                                        Private campaign: I need to approve each affiliate
                                    </label>
                                </div>
                            </div>

                            {/* Token Type */}
                            <div className="card container-column">
                                <label className="label">Token Type For Referral Payments:</label>
                                <div className="radio-group">
                                    <label>
                                        <input
                                            type="radio"
                                            name="tokenType"
                                            value="TON"
                                            checked={campaignDetails.tokenType === "TON"}
                                            onChange={() => handleRadioChange('tokenType', 'TON')}
                                        />
                                        TON
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name="tokenType"
                                            value="USDT"
                                            checked={campaignDetails.tokenType === "USDT"}
                                            onChange={() => handleRadioChange('tokenType', 'USDT')}
                                        />
                                        USDT
                                    </label>
                                </div>
                            </div>

                           



                             {/* Commissionable Events */}
                            <div className="card container-column">
                                <label className="label">Commissionable Events Fees:</label>
                                {Object.keys(campaignDetails.commissionableEvents).map((key) => (
                                    <div className="checkbox-group-grid" key={key}>
                                        <div className="event-left">
                                            <input
                                                type="checkbox"
                                                id={key}
                                                checked={campaignDetails.commissionableEvents[key as CommissionableEventKeys] }
                                                onChange={(e) => handleCheckboxChange(e, key as CommissionableEventKeys)}
                                            />
                                            <label htmlFor={key}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</label>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01" // Allows decimals (adjust as needed)
                                            min="0" // Prevents negative values
                                            className={`text-input event-right  ${!campaignDetails.commissionableEvents[key as CommissionableEventKeys] ? 'hidden' : ''}`}
                                            placeholder="Enter Fee value"
                                            value={campaignDetails.commissionValues[key as CommissionableEventKeys]}
                                            disabled={!campaignDetails.commissionableEvents[key as CommissionableEventKeys]}
                                            onChange={(e) =>
                                                setCampaignDetails((prev) => ({
                                                    ...prev,
                                                    commissionValues: {
                                                        ...prev.commissionValues,
                                                        [key as CommissionableEventKeys]: e.target.value,
                                                    },
                                                }))
                                            }
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Campaign Expiration Date */}
                            <div className="card container-column">
                                <label className="label">Campaign Expiration Date:
                                    <span className="tooltip-container">
                                        <a  className="tooltip-trigger"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleTooltip();
                                          }}>
                                        ?
                                        </a>
                                        <span className={`tooltip-content ${isTooltipVisible ? "visible" : ""}`}>
                                        If no date is selected, Unlimited will be used
                                        </span>
                                    </span>
                                </label>
                                <div className="checkbox-group">
                                    <input
                                    type="checkbox"
                                    id="expirationDateEnabled"
                                    checked={campaignDetails.expirationDateEnabled}
                                    onChange={(e) =>
                                        setCampaignDetails((prev) => ({
                                        ...prev,
                                        expirationDateEnabled: e.target.checked,
                                        expirationDate: e.target.checked ? prev.expirationDate : null,
                                        }))
                                    }
                                    />
                                    <label htmlFor="expirationDateEnabled">Set up Expiration Date</label>
                                
                                {campaignDetails.expirationDateEnabled && (
                                    <input
                                        className="text-input event-right"
                                        type="date"
                                        onChange={(e) =>
                                            handleRadioChange(
                                                'expirationDate',
                                                new Date(e.target.value).toLocaleDateString('en-GB')
                                            )
                                        }
                                    />
                                )}
                                </div>
                            </div>

                            {/* Approve Earnings */}
                            <div className="card">
                                <label className="label">
                                    One last question: Would you like to review and approve each
                                    affiliate's earnings before they can withdraw, or should affiliates be
                                    able to release their earnings independently?
                                </label>
                                <div className="radio-group">
                                    <label className='checkbox-group2'>
                                        <input
                                            type="radio"
                                            name="approveEarnings"
                                            value="yes"
                                            checked={campaignDetails.approveEarnings === "yes"}
                                            onChange={() => handleRadioChange('approveEarnings', 'yes')}
                                        />
                                        Yes, earnings must be approved by me
                                    </label>
                                    <label className='checkbox-group2'>
                                        <input
                                            type="radio"
                                            name="approveEarnings"
                                            value="no"
                                            checked={campaignDetails.approveEarnings === "no"}
                                            onChange={() => handleRadioChange('approveEarnings', 'no')}
                                        />
                                        No, my affiliates should get their earnings instantly
                                    </label>
                                </div>
                            </div>

                            </div>


                            <button className="nav-button full-width" onClick={handleSubmit}>
                                Submit New Campaign
                            </button>


                        </div>

                    </div>
                  )}
                
                
                {!connectedStatus && ( 
                <div className="expander">
                    <button
                        className="main-button expander-button"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? 'Hide Details' : 'Why is this needed?'}
                    </button>
                    {isExpanded && (
                        <motion.div
                            className="expander-content"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <p className="message">
                                TON affiliates’ smart contracts take care of everything for you: 
                                from setup of campaign to payment to affiliate, all on the TON 
                                blockchain. In order for the campaign to be live, campaign funds 
                                are charged by the Advertiser wallet and dispensed to the wallet 
                                of each affiliate, per commissionable events (affiliates would 
                                need to connect their wallet as well).
                            </p>
                        </motion.div>
                    )}
                </div>  )}  
                
                {/* {connected && (            
                <div className='Card'>
                    <b>Counter Address</b>
                    <div className='Hint'>{address?.slice(0, 30) + '...'}</div>
                
                    <div className='Card'>
                    <b>Counter Value</b>
                    <div>{value ?? 'Loading...'}</div>
                    </div>

                    <button
                    className={`Button ${connected ? 'Active' : 'Disabled'}`}
                    onClick={() => {
                        sendIncrement();
                    }}
                    >
                    Increment
                    </button>
                </div>)} */}
                    
            </div>


            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        {/* Close button in the top-right corner */}
                        <button
                            className="modal-close-top"
                            onClick={() => setModalOpen(false)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        <h2>Review Campaign Details</h2>
                        <div className="campaign-details">
                            <div className="detail-item">
                                <strong>Campaign Type: </strong>
                                {campaignDetails.campaignType}
                            </div>
                            <div className="detail-item">
                                <strong>Token Type: </strong>
                                {campaignDetails.tokenType}
                            </div>
                            <div className="detail-item">
                                <strong>Commissionable Events Fees:</strong>
                                <ul>
                                    {Object.entries(campaignDetails.commissionValues).map(
                                        ([key, value]) => (
                                            <li key={key}>
                                                {key.replace(/([A-Z])/g, " $1")}:{" "}
                                                {value || "N/A"}
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                            <div className="detail-item">
                                <strong>Expiration Date: </strong>
                                {campaignDetails.expirationDate ?? "Unlimited"}
                            </div>
                            <div className="detail-item">
                                <strong>Earnings Approval: </strong>
                                {campaignDetails.approveEarnings}
                            </div>
                        </div>

                        {/* Close button at the bottom */}
                        <button
                            className="nav-button margin-left"
                            onClick={() => setModalOpen(false)}
                        >
                            Close
                        </button>
                        <button
                            className="nav-button margin-left"
                            onClick={handleModalClose}
                        >
                            Create My Campaign
                        </button>
                    </div>
                </div>
            )}

            <div className="navigation-buttons">
                <button className="nav-button" onClick={() => setScreen('advertiser')}>Go Back</button>
                <button className="nav-button" onClick={() => setScreen('main')}>Go to Main Screen</button>
            </div>
        </motion.div>
    );
};

export default NewCampaign;