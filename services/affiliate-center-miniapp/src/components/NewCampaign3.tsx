// import React, { useState } from 'react';

// const NewCampaign3: React.FC = () => {
//     const [campaignDetails, setCampaignDetails] = useState({
//         campaignType: '',
//         tokenType: '',
//         commissionableEvents: {
//             userReferred: '',
//             premiumUserReferred: '',
//             userRetained: '',
//             userActive: '',
//         },
//         expirationDate: '',
//         approveEarnings: '',
//     });

//     const handleRadioChange = (field: string, value: string) => {
//         setCampaignDetails((prev) => ({
//             ...prev,
//             [field]: value,
//         }));
//     };

//     const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, key: string) => {
//         const { checked, value } = event.target;
//         setCampaignDetails((prev) => ({
//             ...prev,
//             commissionableEvents: {
//                 ...prev.commissionableEvents,
//                 [key]: checked ? value : '',
//             },
//         }));
//     };

//     return (
//         <div className="new-campaign">
//             <h1 className="headline">Create New Campaign</h1>
            
//             {/* Campaign Type */}
//             <div className="card">
//                 <label className="label">Campaign Type:</label>
//                 <div className="radio-group">
//                     <label>
//                         <input
//                             type="radio"
//                             name="campaignType"
//                             value="public"
//                             onChange={() => handleRadioChange('campaignType', 'public')}
//                         />
//                         Public campaign: any affiliate can refer users
//                     </label>
//                     <label>
//                         <input
//                             type="radio"
//                             name="campaignType"
//                             value="private"
//                             onChange={() => handleRadioChange('campaignType', 'private')}
//                         />
//                         Private campaign: I need to approve each affiliate
//                     </label>
//                 </div>
//             </div>

//             {/* Token Type */}
//             <div className="card">
//                 <label className="label">Token Type For Referral Payments:</label>
//                 <div className="radio-group">
//                     <label>
//                         <input
//                             type="radio"
//                             name="tokenType"
//                             value="TON"
//                             onChange={() => handleRadioChange('tokenType', 'TON')}
//                         />
//                         TON
//                     </label>
//                     <label>
//                         <input
//                             type="radio"
//                             name="tokenType"
//                             value="USDT"
//                             onChange={() => handleRadioChange('tokenType', 'USDT')}
//                         />
//                         USDT
//                     </label>
//                 </div>
//             </div>

//             {/* Commissionable Events */}
//             <div className="card">
//                 <label className="label">Commissionable Events:</label>
//                 <div className="checkbox-group">
//                     {[
//                         { label: 'User referred', key: 'userReferred' },
//                         { label: 'Premium user referred', key: 'premiumUserReferred' },
//                         { label: 'User retained 14 day', key: 'userRetained' },
//                         { label: 'User active (comment/like)', key: 'userActive' },
//                     ].map(({ label, key }) => (
//                         <div key={key} className="checkbox-item">
//                             <label>
//                                 <input
//                                     type="checkbox"
//                                     onChange={(e) =>
//                                         handleCheckboxChange(e, key)
//                                     }
//                                 />
//                                 {label}
//                             </label>
//                             <input
//                                 type="text"
//                                 placeholder="Amount"
//                                 disabled={!campaignDetails.commissionableEvents[key]}
//                                 onChange={(e) =>
//                                     handleCheckboxChange(
//                                         {
//                                             target: {
//                                                 checked: true,
//                                                 value: e.target.value,
//                                             },
//                                         },
//                                         key
//                                     )
//                                 }
//                             />
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             {/* Campaign Expiration Date */}
//             <div className="card">
//                 <label className="label">Campaign Expiration Date:</label>
//                 <input
//                     type="date"
//                     onChange={(e) =>
//                         handleRadioChange(
//                             'expirationDate',
//                             new Date(e.target.value).toLocaleDateString('en-GB')
//                         )
//                     }
//                 />
//             </div>

//             {/* Approve Earnings */}
//             <div className="card">
//                 <label className="label">
//                     One last question: Would you like to review and approve each
//                     affiliate's earnings before they can withdraw, or should affiliates be
//                     able to release their earnings independently?
//                 </label>
//                 <div className="radio-group">
//                     <label>
//                         <input
//                             type="radio"
//                             name="approveEarnings"
//                             value="yes"
//                             onChange={() => handleRadioChange('approveEarnings', 'yes')}
//                         />
//                         Yes, earnings must be approved by me
//                     </label>
//                     <label>
//                         <input
//                             type="radio"
//                             name="approveEarnings"
//                             value="no"
//                             onChange={() => handleRadioChange('approveEarnings', 'no')}
//                         />
//                         No, my affiliates should get their earnings instantly
//                     </label>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default NewCampaign3;
