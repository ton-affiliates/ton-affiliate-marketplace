// src/components/WizardSetupCampaign.tsx

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';

// TON-related imports
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';

// Commission events
import { eventsConfig, getOpCodeByEventName } from '@common/UserEventsConfig';

// On-chain setter
import { advertiserSetCampaignDetails } from '../blockchain/advertiserSetCampaignDetails';
import { Dictionary } from '@ton/core';

// The custom hook that loads the contract
import { useCampaignContract } from '../hooks/useCampaignContract';

// WebSocket hook if you want to replicate the spinner approach:
import { useCampaignWebSocket } from '../hooks/useCampaignWebSocket';

// Utility types
import { CampaignApiResponse } from '@common/ApiResponses';

// Optional UI components (spinner, success icons, etc.)
import Spinner from './Spinner';
// import SuccessIcon from './SuccessIcon';

export enum TelegramCategory {
  GAMING = 'Gaming',
  CRYPTO = 'Crypto',
  TECHNOLOGY = 'Technology',
  LIFESTYLE = 'Lifestyle',
  EDUCATION = 'Education',
  HEALTH = 'Health',
  TRAVEL = 'Travel',
  FINANCE = 'Finance',
  ENTERTAINMENT = 'Entertainment',
  POLITICS = 'Politics',
  SOCIAL = 'Social',
  SPORTS = 'Sports',
  NEWS = 'News',
  SCIENCE = 'Science',
  ART = 'Art',
  MUSIC = 'Music',
  OTHER = 'Other',
}

interface CommissionValuesState {
  regularUsers: Record<string, string>;
  premiumUsers: Record<string, string>;
}

function WizardSetupCampaign() {
  // 1) Grab campaignId from the URL
  const { campaignId } = useParams<{ campaignId: string }>();

  // 2) Access the user’s wallet, connection
  const { userAccount } = useTonConnectFetchContext();
  const { connected, sender } = useTonWalletConnect();

  // 3) Basic wizard states
  const [step, setStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Step 1 data
  const [campaignName, setCampaignName] = useState('');
  const [category, setCategory] = useState<TelegramCategory | ''>('');
  const [inviteLink, setInviteLink] = useState('');
  const [telegramAsset, setTelegramAsset] = useState<any>(null);

  // Step 2 data (commission events)
  const [commissionValues, setCommissionValues] = useState<CommissionValuesState>({
    regularUsers: {},
    premiumUsers: {},
  });

  // Step 3 => final campaign object with bot admin info
  const [createdCampaign, setCreatedCampaign] = useState<CampaignApiResponse | null>(null);

  // Step 4 => on-chain details
  const [isPublicCampaign, setIsPublicCampaign] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<bigint>(0n);
  const [expirationDateEnabled, setExpirationDateEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');

  // Spinner-based states, if we want the “DeployEmptyCampaign” approach
  const [waitingForTx, setWaitingForTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);
  const [txTimeout, setTxTimeout] = useState(false);

  const timeoutRef = useRef<number | null>(null);

  // 4) Once we have a contractAddress, load the contract
  const contractAddress = createdCampaign?.contractAddress || undefined;
  const {
    campaignContract,
    isLoading: contractLoading,
    error: contractError,
  } = useCampaignContract(contractAddress);

  // 5) Optionally use your WebSocket hook, passing the same style signature
  useCampaignWebSocket(
    userAccount,
    campaignId, // pass your campaignId here
    setTxSuccess,
    setWaitingForTx,
    setTxFailed
  );

  // 6) A helper to fetch a campaign by ID from your backend
  async function fetchCampaignById(id: string): Promise<CampaignApiResponse> {
    const resp = await fetch(`/api/v1/campaigns/${id}`);
    if (!resp.ok) {
      let msg = 'Failed to fetch campaign.';
      try {
        const body = await resp.json();
        msg = body.error || body.message || msg;
      } catch {}
      throw new Error(msg);
    }
    return (await resp.json()) as CampaignApiResponse;
  }

  // Cleanup any timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ------------------------------------------------------
  // Step 1: Load Telegram Info
  // ------------------------------------------------------
  async function handleLoadTelegramInfo() {
    if (!userAccount?.address || !connected) {
      setErrorMessage('Please connect your TON wallet first.');
      return;
    }
    if (!inviteLink) {
      setErrorMessage('Invite link is required.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const resp = await fetch('/api/v1/campaigns/telegram-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteLink }),
      });
      if (!resp.ok) {
        let msg = 'Failed to load Telegram info.';
        try {
          const body = await resp.json();
          msg = body.error || body.message || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await resp.json();
      setTelegramAsset(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not load telegram info.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleApproveTelegramInfo() {
    if (!telegramAsset) {
      setErrorMessage('No Telegram Asset loaded. Please load first.');
      return;
    }
    setStep(2);
  }

  // ------------------------------------------------------
  // Step 2: Approve & Create the campaign
  // ------------------------------------------------------
  async function handleApproveTelegramDetails() {
    if (!campaignId) {
      setErrorMessage('No campaignId in the URL.');
      return;
    }
    if (!inviteLink) {
      setErrorMessage('Invite link is required.');
      return;
    }
    if (!userAccount?.address) {
      setErrorMessage('Please connect wallet first.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const bodyData = {
        campaignId,
        campaignName,
        category,
        inviteLink,
        commissionValues,
      };

      // 1) POST => /api/v1/campaigns
      const resp = await fetch('/api/v1/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      if (!resp.ok) {
        let msg = 'Could not create/update campaign.';
        try {
          const body = await resp.json();
          msg = body.error || body.message || msg;
        } catch {}
        throw new Error(msg);
      }

      // 2) partial campaign from response
      const partialCampaign = (await resp.json()) as CampaignApiResponse;

      // 3) Re-fetch for full fields
      let fullCampaign: CampaignApiResponse;
      try {
        fullCampaign = await fetchCampaignById(partialCampaign.id);
      } catch (err) {
        console.error('[WizardSetupCampaign] Could not fetch full campaign after creation.', err);
        fullCampaign = partialCampaign;
      }

      console.log('Campaign object:', fullCampaign);
      setCreatedCampaign(fullCampaign);
      setStep(3); // Next => step 3: bot admin check
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve Telegram details.');
    } finally {
      setIsLoading(false);
    }
  }

  // ------------------------------------------------------
  // Step 3: Bot Admin Check => refresh
  // ------------------------------------------------------
  async function handleRefreshBotAdmin() {
    if (!createdCampaign || !createdCampaign.id) {
      setErrorMessage('No campaign to refresh. Did you create it yet?');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const url = `/api/v1/campaigns/${createdCampaign.id}/refresh-bot-admin`;
      const resp = await fetch(url, { method: 'POST' });
      if (!resp.ok) {
        let msg = 'Failed to refresh bot admin.';
        try {
          const body = await resp.json();
          msg = body.error || body.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const updatedCampaign = (await resp.json()) as CampaignApiResponse;
      setCreatedCampaign(updatedCampaign);

      if (updatedCampaign.botIsAdmin) {
        setStep(4);
      } else {
        setErrorMessage('Bot is still not admin. Please check privileges in Telegram.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to refresh bot admin.');
    } finally {
      setIsLoading(false);
    }
  }

  // ------------------------------------------------------
  // Step 4: On-Chain Setup
  // ------------------------------------------------------
  function buildCommissionDictionary(costRecord: Record<string, string>) {
    const dict = Dictionary.empty<bigint, string>();
    for (const [eventName, costStr] of Object.entries(costRecord)) {
      const opCode = getOpCodeByEventName(eventName);
      if (opCode !== undefined) {
        dict.set(opCode, costStr);
      }
    }
    return dict;
  }

  async function handleOnChainSetup() {
    if (!campaignContract) {
      setErrorMessage(contractError || 'Contract not loaded yet.');
      return;
    }
    if (!createdCampaign?.id) {
      setErrorMessage('No campaign to finalize on-chain.');
      return;
    }
    if (!userAccount?.address || !connected) {
      setErrorMessage('Please connect wallet first.');
      return;
    }
    if (!sender) {
      setErrorMessage('Sender not available. Could not send transaction.');
      return;
    }

    // Start spinner/timer
    setErrorMessage(null);
    setIsLoading(true);
    setWaitingForTx(true);
    setTxSuccess(false);
    setTxFailed(false);
    setTxTimeout(false);

    // 60-second timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setTxTimeout(true);
      setWaitingForTx(false);
    }, 60_000);

    try {
      const regularDict = buildCommissionDictionary(commissionValues.regularUsers);
      const premiumDict = buildCommissionDictionary(commissionValues.premiumUsers);

      // Fire the chain transaction
      await advertiserSetCampaignDetails(
        campaignContract,
        sender,
        userAccount.address,
        {
          regularUsers: regularDict,
          premiumUsers: premiumDict,
        },
        isPublicCampaign,
        paymentMethod,
        expirationDateEnabled,
        expirationDate
      );

      console.log('[WizardSetupCampaign] On-chain tx broadcast. Waiting for WS ack or final event...');
      // The WS event "AdvertiserSignedCampaignDetailsEvent" should set txSuccess(true)
    } catch (err: any) {
      console.error('On-chain setup error:', err);
      setWaitingForTx(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      setTxFailed(true);
      setErrorMessage(err.message || 'Failed to set on-chain details.');
    } finally {
      setIsLoading(false);
    }
  }

  // ------------------------------------------------------
  // Render the wizard steps
  // ------------------------------------------------------
  return (
    <motion.div className="screen-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        <h2>Unified Wizard Setup (Steps 1-4, No Step 5)</h2>
        <p><strong>Current Step:</strong> {step}</p>

        {/* Display error if any */}
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

        {/* ---------------- Step 1 ---------------- */}
        {step === 1 && (
          <>
            <div className="form-group">
              <label>Campaign Name:</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Category:</label>
              <select
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
              <label>Invite Link:</label>
              <input
                type="text"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="https://t.me/MyChannel"
              />
            </div>

            <button
              disabled={!campaignName || !category || !inviteLink || isLoading}
              onClick={handleLoadTelegramInfo}
            >
              {isLoading ? 'Loading...' : 'Load Telegram Info'}
            </button>

            {/* If telegramAsset is loaded, show partial info */}
            {telegramAsset && (
              <div style={{ border: '1px solid #ccc', marginTop: '1rem', padding: '1rem' }}>
                <p><strong>Chat ID:</strong> {telegramAsset.chatId}</p>
                <p><strong>Handle:</strong> {telegramAsset.handle}</p>
                <p><strong>Type:</strong> {telegramAsset.type}</p>
                <p><strong>Name:</strong> {telegramAsset.name}</p>
                <p><strong>Desc:</strong> {telegramAsset.description}</p>
                <p><strong>Members:</strong> {telegramAsset.memberCount}</p>
                <button style={{ marginTop: '0.5rem' }} onClick={handleApproveTelegramInfo}>
                  Approve Telegram Info
                </button>
              </div>
            )}
          </>
        )}

        {/* ---------------- Step 2 ---------------- */}
        {step === 2 && (
          <>
            <h3>Commissionable Events</h3>
            <p>Specify how much to pay for each event (in TON). Leave blank or 0 to pay nothing.</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ccc', padding: '6px' }}>Event</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px' }}>Regular</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px' }}>Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsConfig.events.map((evt) => {
                    const regVal = commissionValues.regularUsers[evt.eventName] || "";
                    const premVal = commissionValues.premiumUsers[evt.eventName] || "";
                    return (
                      <tr key={evt.eventName}>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                          <strong>{evt.eventName}</strong>
                          {evt.description && (
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                              {evt.description}
                            </div>
                          )}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={{ width: '5rem' }}
                            value={regVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCommissionValues(prev => ({
                                ...prev,
                                regularUsers: {
                                  ...prev.regularUsers,
                                  [evt.eventName]: val
                                }
                              }));
                            }}
                          />
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={{ width: '5rem' }}
                            value={premVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCommissionValues(prev => ({
                                ...prev,
                                premiumUsers: {
                                  ...prev.premiumUsers,
                                  [evt.eventName]: val
                                }
                              }));
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              style={{ marginTop: '1rem' }}
              disabled={isLoading}
              onClick={handleApproveTelegramDetails}
            >
              {isLoading ? 'Saving...' : 'Approve & Create Campaign'}
            </button>
          </>
        )}

        {/* ---------------- Step 3 ---------------- */}
        {step === 3 && createdCampaign && (
          <>
            <h3>Bot Admin Check</h3>
            <p><strong>Campaign ID:</strong> {createdCampaign.id}</p>
            <p><strong>Bot Admin?:</strong> {createdCampaign.botIsAdmin ? 'Yes' : 'No'}</p>

            {/* Render required privileges if available */}
            {createdCampaign.requiredPrivileges && createdCampaign.requiredPrivileges.length > 0 && (
              <div style={{ margin: '1rem 0' }}>
                <strong>Required Privileges:</strong>
                <ul>
                  {createdCampaign.requiredPrivileges.map((priv, index) => (
                    <li key={index}>{priv}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Optionally, render adminPrivileges if you want to display all privileges */}
            {createdCampaign.adminPrivileges && createdCampaign.adminPrivileges.length > 0 && (
              <div style={{ margin: '1rem 0' }}>
                <strong>Admin Privileges:</strong>
                <ul>
                  {createdCampaign.adminPrivileges.map((priv, index) => (
                    <li key={index}>{priv}</li>
                  ))}
                </ul>
              </div>
            )}

            {!createdCampaign.botIsAdmin && (
              <>
                <p>Add the bot in Telegram with the required privileges, then click below.</p>
                <button disabled={isLoading} onClick={handleRefreshBotAdmin}>
                  {isLoading ? 'Verifying...' : 'I Added the Bot as Admin'}
                </button>
              </>
            )}
            {createdCampaign.botIsAdmin && (
              <button style={{ marginTop: '1rem' }} onClick={() => setStep(4)}>
                Next: On-Chain Settings
              </button>
            )}
          </>
        )}

        {/* ---------------- Step 4 ---------------- */}
        {step === 4 && (
          <>
            <h3>On-Chain Campaign Settings</h3>
            {contractLoading && <p>Loading contract...</p>}
            {contractError && <p style={{ color: 'red' }}>Contract error: {contractError}</p>}

            <div style={{ marginTop: '1rem' }}>
              <label>Public or Private?</label>
              <br />
              <label>
                <input
                  type="radio"
                  checked={isPublicCampaign}
                  onChange={() => setIsPublicCampaign(true)}
                />
                Public
              </label>
              <br />
              <label>
                <input
                  type="radio"
                  checked={!isPublicCampaign}
                  onChange={() => setIsPublicCampaign(false)}
                />
                Private
              </label>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>Payment Method:</label>
              <br />
              <label>
                <input
                  type="radio"
                  checked={paymentMethod === 0n}
                  onChange={() => setPaymentMethod(0n)}
                />
                TON
              </label>
              <br />
              <label>
                <input
                  type="radio"
                  checked={paymentMethod === 1n}
                  onChange={() => setPaymentMethod(1n)}
                />
                USDT
              </label>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>
                <input
                  type="checkbox"
                  checked={expirationDateEnabled}
                  onChange={(e) => setExpirationDateEnabled(e.target.checked)}
                />
                Enable Expiration Date
              </label>
              {expirationDateEnabled && (
                <div style={{ marginTop: '0.5rem' }}>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <button
              style={{ marginTop: '1rem' }}
              disabled={isLoading || contractLoading || !!contractError}
              onClick={handleOnChainSetup}
            >
              {isLoading ? 'Configuring On-Chain...' : 'Set On-Chain Details'}
            </button>
          </>
        )}

        {/* ---------------- Spinner / TX Feedback ---------------- */}
        {waitingForTx && !txTimeout && !txSuccess && !txFailed && (
          <div style={{ marginTop: '1rem', background: '#f2f2f2', padding: '1rem' }}>
            <Spinner />
            <p>Waiting for server ack... (up to 1 min)</p>
          </div>
        )}

        {txTimeout && !txSuccess && (
          <div style={{ marginTop: '1rem', background: '#fff3cd', padding: '1rem' }}>
            <p>No confirmation event yet. Possibly still processing. You can wait or refresh.</p>
          </div>
        )}

        {txSuccess && (
          <div style={{ marginTop: '1rem', background: '#d4edda', padding: '1rem' }}>
            {/* <SuccessIcon /> if available */}
            <p>Transaction successful! (Received WS ack)</p>
          </div>
        )}

        {txFailed && (
          <div style={{ marginTop: '1rem', background: '#f8d7da', padding: '1rem' }}>
            <p>Transaction failed or canceled. Please try again.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default WizardSetupCampaign;
