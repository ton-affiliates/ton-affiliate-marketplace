import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';

// TON-related imports
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';

// Commission events
import { doc, getBlockchainOpCodeByEventName, getTelegramOpCodesByOpCode } from '@common/BlockchainEventsConfig';

// On-chain setter
import { advertiserSetCampaignDetails } from '../blockchain/advertiserSetCampaignDetails';
import { Dictionary } from '@ton/core';

// The custom hook that loads the contract
import { useCampaignContract } from '../hooks/useCampaignContract';

// Instead of the WebSocket hook, we import our SSE hook:
import { useCampaignSSE } from '../hooks/useCampaignSSE';

// Utility types
import { CampaignApiResponse } from '@common/ApiResponses';

import { TelegramCategory } from "../models/Models";

// Optional UI components (spinner, success icons, etc.)
import Spinner from './Spinner';

interface CommissionValuesState {
  regularUsers: Record<string, string>;
  premiumUsers: Record<string, string>;
}

/**
 * For this version, we only support 'public' channels/groups.
 * We remove private asset logic entirely.
 */
type AssetType = 'channel' | 'group';

function WizardSetupCampaign() {
  // Bot name from environment variable
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
  const [assetType, setAssetType] = useState<AssetType>('channel');

  // We only support 'public'
  // const assetVisibility = 'public';

  // For step 1, user must provide a link / @username
  const [chatIdentifier, setChatIdentifier] = useState('');
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

  // Advertiser sets whether to verify user with a CAPTCHA on referral
  const [verifyUserIsHumanOnReferral, setVerifyUserIsHumanOnReferral] = useState(false);

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

  // 5) Use the SSE hook for real-time events
  useCampaignSSE(
    userAccount,
    campaignId!,
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ------------------------------------------------------
  // Step 1: Collect Basic Info & Load Telegram Info (PUBLIC ONLY)
  // ------------------------------------------------------
  async function handleLoadTelegramInfo() {
    if (!userAccount?.address || !connected) {
      setErrorMessage('Please connect your TON wallet first.');
      return;
    }

    // Must supply link/username for a public channel/group
    if (!chatIdentifier) {
      setErrorMessage('Please provide a link or username for public channels/groups.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      // We'll POST to /api/v1/campaigns/telegram-asset with the chatIdentifier
      const resp = await fetch('/api/v1/campaigns/telegram-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteLink: chatIdentifier }),
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
  // Step 2: Commissionable Events
  // ------------------------------------------------------
  const hasCommission = useMemo(() => {
    const regular = Object.values(commissionValues.regularUsers).some(
      (val) => val.trim() !== '' && Number(val) > 0
    );
    const premium = Object.values(commissionValues.premiumUsers).some(
      (val) => val.trim() !== '' && Number(val) > 0
    );
    return regular || premium;
  }, [commissionValues]);

  async function handleApproveTelegramDetails() {
    if (!campaignId) {
      setErrorMessage('No campaignId in the URL.');
      return;
    }
    if (!chatIdentifier) {
      setErrorMessage('No chat identifier found.');
      return;
    }
    if (!userAccount?.address) {
      setErrorMessage('Please connect your TON wallet first.');
      return;
    }
    if (!hasCommission) {
      setErrorMessage('Please add commission values for at least one event.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    const regularDict = buildCommissionDictionary(commissionValues.regularUsers);
    const premiumDict = buildCommissionDictionary(commissionValues.premiumUsers);

    const regularUsersSet: Set<number> = new Set(
      Array.from(regularDict.keys(), (key) => Number(key))
    );
    const premiumUsersSet: Set<number> = new Set(
      Array.from(premiumDict.keys(), (key) => Number(key))
    );
    const combinedSet = new Set<number>([...regularUsersSet, ...premiumUsersSet]);

    const telegramEventsOpCodesSet = new Set<number>();
    for (const blockchainOpCode of combinedSet) {
      const telegramOpCodes = getTelegramOpCodesByOpCode(blockchainOpCode);
      if (telegramOpCodes) {
        telegramOpCodes.forEach((code) => telegramEventsOpCodesSet.add(code));
      }
    }

    const telegramEventsOpCodesArray = Array.from(telegramEventsOpCodesSet);
    console.log('telegramEventsOpCodesArray:', telegramEventsOpCodesArray);

    const bodyData = {
      campaignId,
      campaignName,
      category,
      inviteLink: chatIdentifier,
      telegramEventsOpCodesArray,
      verifyUserIsHumanOnReferral,
    };

    try {
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

      const partialCampaign = (await resp.json()) as CampaignApiResponse;
      let fullCampaign: CampaignApiResponse;

      try {
        fullCampaign = await fetchCampaignById(partialCampaign.id);
      } catch (err) {
        console.error('[WizardSetupCampaign] Could not fetch full campaign after creation.', err);
        fullCampaign = partialCampaign;
      }

      console.log('Campaign object:', fullCampaign);
      setCreatedCampaign(fullCampaign);
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve Telegram details.');
    } finally {
      setIsLoading(false);
    }
  }

  function buildCommissionDictionary(costRecord: Record<string, string>) {
    const dict = Dictionary.empty<bigint, string>();
    for (const [keyStr, costStr] of Object.entries(costRecord)) {
      if (!costStr || costStr === '0') continue;
      console.log(`Processing event key "${keyStr}" with cost "${costStr}"`);

      const opCode = getBlockchainOpCodeByEventName(keyStr);
      if (opCode !== undefined) {
        dict.set(BigInt(opCode), costStr);
      } else {
        throw Error('Cannot find op code for: ' + keyStr);
      }
    }
    return dict;
  }

  // ------------------------------------------------------
  // Step 3: Bot Verification
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

      if (updatedCampaign.canBotVerify) {
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

      console.log('[WizardSetupCampaign] On-chain tx broadcast. Waiting for SSE ack...');
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
  // Render the Wizard
  // ------------------------------------------------------
  return (
    <motion.div className="screen-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        <h2>Campaign Wizard Setup (4 Steps, Public Only)</h2>
        <p>
          <strong>Current Step:</strong> {step}
        </p>

        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

        {/* STEP 1: Basic Campaign Info, ONLY PUBLIC Option */}
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
              <label>Asset Type (Public Only):</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
              >
                <option value="channel">Channel</option>
                <option value="group">Group</option>
              </select>
            </div>

            {/* We hide the 'private' option entirely */}
            <p>
              <strong>Note:</strong> This platform only supports <em>public</em> assets. Make sure
              your channel/group is public (has a username).
            </p>

            <div className="form-group">
              <label>
                Public Link or Username (e.g., https://t.me/MyChannel or @MyChannel):
              </label>
              <input
                type="text"
                value={chatIdentifier}
                onChange={(e) => setChatIdentifier(e.target.value)}
                placeholder="https://t.me/MyChannel or @MyChannel"
              />
            </div>

            <button
              disabled={!campaignName || !category || !chatIdentifier || isLoading}
              onClick={handleLoadTelegramInfo}
            >
              {isLoading ? 'Loading...' : 'Load Telegram Info'}
            </button>

            {/* If we have a loaded telegram asset, show details */}
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
                  <strong>Visibility:</strong>{' '}
                  {telegramAsset.isPublic ? 'Public' : 'Private'}
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

                {/* If the backend says it's private, show an error */}
                {!telegramAsset.isPublic && (
                  <p style={{ color: 'red' }}>
                    This asset is detected as private. We do not support private channels/groups.
                  </p>
                )}

                <button
                  style={{ marginTop: '0.5rem' }}
                  onClick={handleApproveTelegramInfo}
                  disabled={!telegramAsset.isPublic}
                >
                  Approve Telegram Info
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: Commissionable Events */}
        {step === 2 && (
          <>
            <h3>Commissionable Events</h3>
            <p>Specify how much to pay for each event (in TON). Leave blank or 0 to pay nothing.</p>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>
                <input
                  type="checkbox"
                  checked={verifyUserIsHumanOnReferral}
                  onChange={(e) => setVerifyUserIsHumanOnReferral(e.target.checked)}
                />{' '}
                Verify user with a CAPTCHA on referral?
              </label>
            </div>

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
                  {doc.blockchainEvents.map((evt) => {
                    const regVal = commissionValues.regularUsers[evt.eventName] || '';
                    const premVal = commissionValues.premiumUsers[evt.eventName] || '';
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

            <button
              style={{ marginTop: '1rem' }}
              disabled={isLoading || !hasCommission}
              onClick={handleApproveTelegramDetails}
            >
              {isLoading ? 'Saving...' : 'Approve & Create Campaign'}
            </button>
          </>
        )}

        {/* STEP 3: Bot Verification */}
        {step === 3 && createdCampaign && (
          <>
            <h3>Bot Verification</h3>
            <p>
              Please add this bot: <strong>{botName}</strong> to your <strong>public</strong>{' '}
              Telegram asset.
            </p>

            <table style={{ borderCollapse: 'collapse', width: '100%', margin: '1rem 0' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '6px' }}>Asset Type</th>
                  <th style={{ border: '1px solid #ccc', padding: '6px' }}>Visibility</th>
                  <th style={{ border: '1px solid #ccc', padding: '6px' }}>
                    Required Bot Privileges
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                    {createdCampaign.assetType
                      ? createdCampaign.assetType.replace('_', ' ')
                      : 'Unknown'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                    {createdCampaign.isAssetPublic ? 'Public' : 'Private'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                    {createdCampaign.requiresAdminPrivileges &&
                    createdCampaign.requiredPrivileges &&
                    createdCampaign.requiredPrivileges.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                        {createdCampaign.requiredPrivileges.map((priv, index) => (
                          <li key={index}>{priv}</li>
                        ))}
                      </ul>
                    ) : (
                      'None (Just add the bot as an admin with no privileges)'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* If the bot cannot verify events yet, show error */}
            {!createdCampaign.canBotVerify && (
              <p style={{ color: 'red' }}>
                {createdCampaign.requiresAdminPrivileges
                  ? createdCampaign.requiredPrivileges && createdCampaign.requiredPrivileges.length > 0
                    ? `Bot does not have sufficient privileges. Please add ${botName} as an admin with the required privileges.`
                    : `Please add ${botName} as an admin with no privileges.`
                  : `Bot is not a member. Please add ${botName} as a member of the Telegram asset.`}
              </p>
            )}

            <button style={{ marginTop: '1rem' }} disabled={isLoading} onClick={handleRefreshBotAdmin}>
              {isLoading ? 'Verifying...' : 'Verify Bot Privileges'}
            </button>
          </>
        )}

        {/* STEP 4: On-Chain Setup */}
        {step === 4 && (
          <>
            <h3>On-Chain Campaign Settings</h3>
            {contractLoading && <p>Loading contract...</p>}
            {contractError && <p style={{ color: 'red' }}>Contract error: {contractError}</p>}

            <div>
                <label>Campaign Visibility</label>
                <br />
                <label>
                  <input
                    type="radio"
                    checked={isPublicCampaign}
                    onChange={() => setIsPublicCampaign(true)}
                  />
                  Public (Anyone can become an affiliate)
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    checked={!isPublicCampaign}
                    onChange={() => setIsPublicCampaign(false)}
                  />
                  Private (Only approved affiliates can join)
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

        {/* Spinner / TX Feedback */}
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
            <p>Transaction successful!</p>
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
