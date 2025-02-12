// src/components/WizardSetupCampaign.tsx

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';

// TON-related imports
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';

// Commission events
import { blockchainEvents, getBlockchainOpCodeByEventName, getTelegramOpCodesByEventName } from '@common/BlockchainEventsConfig';
import { BlockchainEventType } from "@common/Enums";

// On-chain setter
import { advertiserSetCampaignDetails } from '../blockchain/advertiserSetCampaignDetails';
import { Dictionary } from '@ton/core';

// The custom hook that loads the contract
import { useCampaignContract } from '../hooks/useCampaignContract';

// Instead of the WebSocket hook, we import our SSE hook:
import { useCampaignSSE } from '../hooks/useCampaignSSE';

// Utility types
import { CampaignApiResponse } from '@common/ApiResponses';

// Optional UI components (spinner, success icons, etc.)
import Spinner from './Spinner';
// import SuccessIcon from './SuccessIcon';

// Define Telegram categories
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
  // Bot name from environment variable.
  const botName = import.meta.env.VITE_TON_AFFILIATES_BOT;

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

  // Step 3 => final campaign object with bot admin info and required privileges
  const [createdCampaign, setCreatedCampaign] = useState<CampaignApiResponse | null>(null);

  // Step 4 => on-chain details
  const [isPublicCampaign, setIsPublicCampaign] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<bigint>(0n);
  const [expirationDateEnabled, setExpirationDateEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');

  // Spinner-based states
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

  // 5) Use the SSE hook for real-time events.
  // Pass in the userAccount, campaignId (from URL), and the setters.
  useCampaignSSE(
    userAccount,
    campaignId!, // Now we pass the campaignId so that the SSE endpoint can filter events for this campaign.
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

  // ------------------------------------------------------
  // Refresh Bot Admin / Verify Bot Privileges (Step 3)
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

      // Proceed to next step only if the bot can verify events.
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
  // Step 2: Approve & Create the Campaign
  // ------------------------------------------------------
  // Compute a flag that indicates if at least one commission event was set (non-zero).
  const hasCommission = useMemo(() => {
    const regular = Object.values(commissionValues.regularUsers).some(val => val.trim() !== '' && Number(val) > 0);
    const premium = Object.values(commissionValues.premiumUsers).some(val => val.trim() !== '' && Number(val) > 0);
    return regular || premium;
  }, [commissionValues]);

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

    // --- Validation Check (should be unreachable if button is disabled) ---
    if (!hasCommission) {
      setErrorMessage("Please insert commission values for at least one event before proceeding.");
      return;
    }
    // ------------------------

    setErrorMessage(null);
    setIsLoading(true);

    // Build dictionaries from the commission values
    const regularUsersDict = buildCommissionDictionary(commissionValues.regularUsers);
    const premiumUsersDict = buildCommissionDictionary(commissionValues.premiumUsers);

   // Convert dictionaries to Sets of numbers (using opCodes as numbers)
    const regularUsersSet: Set<number> = new Set(
      Array.from(regularUsersDict.keys(), key => Number(key))
    );
    const premiumUsersSet: Set<number> = new Set(
      Array.from(premiumUsersDict.keys(), key => Number(key))
    );

    // Merge the two sets of blockchain op codes
    const combinedSet = new Set<number>([...regularUsersSet, ...premiumUsersSet]);

    // Now, map each blockchain op code to its corresponding telegram op codes.
    const telegramEventsOpCodesSet = new Set<number>();

    for (const blockchainOpCode of combinedSet) {
      // Since your enum is numeric, cast the blockchain op code to BlockchainEventType
      const telegramOpCodes = getTelegramOpCodesByEventName(blockchainOpCode as BlockchainEventType);
      if (telegramOpCodes && telegramOpCodes.length > 0) {
        telegramOpCodes.forEach((code) => telegramEventsOpCodesSet.add(code as number));
      } else {
        console.warn(`No telegram op codes found for blockchain op code: ${blockchainOpCode}`);
      }
    }

    const telegramEventsOpCodesArray = Array.from(telegramEventsOpCodesSet);

    console.log("telegramEventsOpCodesArray:", telegramEventsOpCodesArray);

    const bodyData = {
      campaignId,
      campaignName,
      category,
      inviteLink,
      telegramEventsOpCodesArray,
    };

    console.log("body:", JSON.stringify(bodyData));


    try {
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

      // 2) Partial campaign from response
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
      setStep(3); // Next => Step 3: Bot Admin Check
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve Telegram details.');
    } finally {
      setIsLoading(false);
    }
  }

  // ------------------------------------------------------
  // Helper: Get a Unique List of Commissionable Event Names (Step 2)
  // ------------------------------------------------------
  function getCommissionableEventNames(): string[] {
    const regular = Object.keys(commissionValues.regularUsers);
    const premium = Object.keys(commissionValues.premiumUsers);
    return Array.from(new Set([...regular, ...premium])).filter((name) => name.trim() !== '');
  }

  // ------------------------------------------------------
  // Step 4: On-Chain Setup
  // ------------------------------------------------------
  function buildCommissionDictionary(costRecord: Record<string, string>) {
    const dict = Dictionary.empty<bigint, string>();
    for (const [keyStr, costStr] of Object.entries(costRecord)) {
      // Only include events with a non-empty, non-zero commission value
      if (!costStr || costStr === '0') continue;
      
      console.log(`Processing event key "${keyStr}" with cost "${costStr}"`);

      let blockchainEvent: BlockchainEventType = BlockchainEventType[keyStr as keyof typeof BlockchainEventType];
      console.log("blockchainEvent: " + blockchainEvent);

      // Now use the number as the enum value
      const opCode = getBlockchainOpCodeByEventName(blockchainEvent);
      if (opCode !== undefined) {
        dict.set(BigInt(opCode), costStr);
      } else {
        throw Error("Cannot find op code for: " + keyStr);
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

      console.log('[WizardSetupCampaign] On-chain tx broadcast. Waiting for SSE ack or final event...');
      // The SSE event "AdvertiserSignedCampaignDetailsEvent" should set txSuccess(true)
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
  // Render the Wizard Steps
  // ------------------------------------------------------
  return (
    <motion.div className="screen-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        <h2>Campaign Wizard Setup (4 Steps)</h2>
        <p>
          <strong>Current Step:</strong> {step}
        </p>

        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

        {/* ---------------- Step 1 ---------------- */}
        {step === 1 && (
          <>
            <div className="form-group">
              <label>Campaign Name:</label>
              <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Category:</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as TelegramCategory)}>
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
              <label>Invite Link:</label>
              <input
                type="text"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="https://t.me/MyChannel"
              />
            </div>

            <button disabled={!campaignName || !category || !inviteLink || isLoading} onClick={handleLoadTelegramInfo}>
              {isLoading ? 'Loading...' : 'Load Telegram Info'}
            </button>

            {telegramAsset && (
              <div style={{ border: '1px solid #ccc', marginTop: '1rem', padding: '1rem' }}>
                <p>
                  <strong>Chat ID:</strong> {telegramAsset.chatId}
                </p>
                <p>
                  <strong>Handle:</strong> {telegramAsset.handle}
                </p>
                <p>
                  <strong>Type:</strong> {telegramAsset.type}
                </p>
                <p>
                  <strong>Name:</strong> {telegramAsset.name}
                </p>
                <p>
                  <strong>Description:</strong> {telegramAsset.description}
                </p>
                <p>
                  <strong>Members:</strong> {telegramAsset.memberCount}
                </p>
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
                  {blockchainEvents.map((evt) => {
                    const regVal = commissionValues.regularUsers[evt.eventName] || '';
                    const premVal = commissionValues.premiumUsers[evt.eventName] || '';
                    return (
                      <tr key={evt.eventName}>
                        <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                          <strong>{evt.eventName}</strong>
                          {evt.description && (
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{evt.description}</div>
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
                              setCommissionValues((prev) => ({
                                ...prev,
                                regularUsers: {
                                  ...prev.regularUsers,
                                  [evt.eventName]: val,
                                },
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
                              setCommissionValues((prev) => ({
                                ...prev,
                                premiumUsers: {
                                  ...prev.premiumUsers,
                                  [evt.eventName]: val,
                                },
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

            {/* Button is enabled only if at least one commission value > 0 exists */}
            <button
              style={{ marginTop: '1rem' }}
              disabled={isLoading || !hasCommission}
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
            <p>
              Please add this bot: <strong>{botName}</strong> as an admin in your Telegram asset.
            </p>
            <p>
              The bot must have the following privileges to verify the commissionable events:
            </p>
            <div style={{ margin: '1rem 0' }}>
              <strong>Commissionable Events:</strong>
              <ul>
                {getCommissionableEventNames().map((evtName) => (
                  <li key={evtName}>{evtName}</li>
                ))}
              </ul>
            </div>
            {createdCampaign.requiredPrivileges && createdCampaign.requiredPrivileges.length > 0 && (
              <div style={{ margin: '1rem 0' }}>
                <strong>Required Admin Privileges for Bot:</strong>
                <ul>
                  {createdCampaign.requiredPrivileges.map((priv, index) => (
                    <li key={index}>{priv}</li>
                  ))}
                </ul>
              </div>
            )}
            {!createdCampaign.canBotVerify && (
              <p style={{ color: 'red' }}>
                Bot does not have sufficient privileges. Please add the bot <strong>{botName}</strong> as an admin in Telegram with the required privileges.
              </p>
            )}
            <button style={{ marginTop: '1rem' }} disabled={isLoading} onClick={handleRefreshBotAdmin}>
              {isLoading ? 'Verifying...' : 'Verify Bot Privileges'}
            </button>
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
                <input type="radio" checked={isPublicCampaign} onChange={() => setIsPublicCampaign(true)} />
                Public
              </label>
              <br />
              <label>
                <input type="radio" checked={!isPublicCampaign} onChange={() => setIsPublicCampaign(false)} />
                Private
              </label>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>Payment Method:</label>
              <br />
              <label>
                <input type="radio" checked={paymentMethod === 0n} onChange={() => setPaymentMethod(0n)} />
                TON
              </label>
              <br />
              <label>
                <input type="radio" checked={paymentMethod === 1n} onChange={() => setPaymentMethod(1n)} />
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
                  <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
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
            <p>Transaction successful! (Received SSE ack)</p>
          </div>
        )}

        {txFailed && (
          <div style={{ marginTop: '1rem', background: '#f8d7da', padding: '1rem' }}>
            <p>{errorMessage ? errorMessage : 'Transaction failed or canceled. Please try again.'}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default WizardSetupCampaign;
