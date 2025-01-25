// src/components/CampaignView.tsx

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Address, Dictionary, fromNano } from '@ton/core';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';
import { useTonClient } from '../hooks/useTonClient';

// Blockchain scripts
import { replenishWithTon } from '../blockchain/campaign/advertiserReplenishWithTon';
import { replenishWithUsdt } from '../blockchain/campaign/advertiserReplenishWithUsdt';
import { replenishGasFeesForUsdtCampaign } from '../blockchain/campaign/advertiserReplenishCampaignGasFees';
import { advertiserWithdrawFunds } from '../blockchain/campaign/advertiserWithdrawFunds';
import { advertiserApproveAffiliate } from '../blockchain/campaign/advertiserApproveAffiliate';
import { advertiserRemoveAffiliate } from '../blockchain/campaign/advertiserRemoveAffiliate';
import { affiliateCreateNewAffiliate } from '../blockchain/campaign/affiliateCreateNewAffiliate';
import { useAffiliateWebSocket } from '../hooks/useAffiliateWebSocket';

// Models
import {
  CampaignApiResponse,
  UserApiResponse,
  NotificationApiResponse,
  CampaignRoleApiResponse,
} from '../models/models';
import { CampaignData, AffiliateData } from '../contracts/Campaign';
import { BOT_OP_CODE_USER_CLICK } from '@common/constants';

// UI components
import TransactionButton from '../components/TransactionButton';
import Spinner from '../components/Spinner';
import SuccessIcon from '../components/SuccessIcon';

// Simple blink animation for the "Active" dot
const blinkingAnimation = `
  @keyframes blinkActive {
    0%   { background-color: green; }
    50%  { background-color: #4cff4c; }
    100% { background-color: green; }
  }
`;

/** A simple "active/inactive" dot with blinking animation if active. */
function ActiveStatusDot({ isActive }: { isActive: boolean }) {
  const dotColor = isActive ? 'green' : 'red';
  const dotAnimation = isActive ? 'blinkActive 1s infinite' : 'none';

  return (
    <div style={{ marginBottom: '1rem' }}>
      <style>{blinkingAnimation}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '1.2rem',
          marginBottom: '0.4rem',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            marginRight: '0.5rem',
            backgroundColor: dotColor,
            animation: dotAnimation,
          }}
        />
        <span>Active:</span>
        <strong style={{ marginLeft: '0.25rem' }}>{String(isActive)}</strong>
      </div>
    </div>
  );
}

/** A small "dot" status indicator. Green= true, red=false. */
function StatusDot({ label, value }: { label: string; value: boolean }) {
  const dotColor = value ? 'green' : 'red';
  const dotSize = '12px';

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.4rem' }}>
      <span
        style={{
          display: 'inline-block',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: dotColor,
          marginRight: '0.5rem',
          flexShrink: 0,
        }}
      />
      {label}: <strong style={{ marginLeft: '0.25rem' }}>{String(value)}</strong>
    </div>
  );
}

export default function CampaignView() {
  const { id } = useParams<{ id: string }>();
  const { userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();
  const client = useTonClient();

  // Basic loading/error states for fetching the campaign
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The campaign from /api/v1/campaigns/:id
  const [campaign, setCampaign] = useState<CampaignApiResponse | null>(null);

  // Once we connect on-chain, we fetch the campaign's on-chain data
  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);

  // "Top affiliates" from on-chain
  const [topAffiliatesData, setTopAffiliatesData] = useState<
    {
      affiliateId: bigint;
      affiliateAddr: string;
      totalEarnings: bigint;
      state: bigint;
    }[]
  >([]);

  // Advertiser user record
  const [advertiserUser, setAdvertiserUser] = useState<UserApiResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // The contract from useCampaignContract
  const advertiserAddr = campaign?.advertiserAddress;
  const campaignIdBigInt = campaign?.id ? BigInt(campaign.id) : undefined;
  const {
    campaignContract,
    isLoading: chainHookLoading,
    error: chainHookError,
  } = useCampaignContract(advertiserAddr, campaignIdBigInt);

  // Determine if the current user is the advertiser
  const isUserAdvertiser = useMemo(() => {
    if (!userAccount?.address || !advertiserAddr) return false;
    try {
      return (
        Address.parse(userAccount.address).toString() ===
        Address.parse(advertiserAddr).toString()
      );
    } catch {
      return false;
    }
  }, [userAccount?.address, advertiserAddr]);

  // Notifications (and auto-mark-as-read on click)
  const [notifications, setNotifications] = useState<NotificationApiResponse[]>([]);

  // AFFILIATE creation states
  const [newAffiliateId, setNewAffiliateId] = useState<bigint | null>(null);
  const [waitingForTx, setWaitingForTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);
  const [txTimeout, setTxTimeout] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // "My Affiliates" array
  const [myAffiliates, setMyAffiliates] = useState<CampaignRoleApiResponse[]>([]);
  const [affiliatesLoading, setAffiliatesLoading] = useState(false);
  const [affiliatesError, setAffiliatesError] = useState<string | null>(null);

  /*******************************************************
   * 1) Fetch the campaign from the DB
   *******************************************************/
  useEffect(() => {
    if (!id) {
      setError('No campaign ID in the URL!');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const resp = await fetch(`/api/v1/campaigns/${id}`);
        if (!resp.ok) {
          throw new Error(`Fetch error. Status ${resp.status} ${resp.statusText}`);
        }
        const data: CampaignApiResponse = await resp.json();
        setCampaign(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /*******************************************************
   * 2) Once we have advertiserAddr, fetch the advertiser user
   *******************************************************/
  useEffect(() => {
    if (!advertiserAddr) return;
    setLoadingUser(true);
    (async () => {
      try {
        const resp = await fetch(`/api/v1/users/byWallet/${advertiserAddr}`);
        if (!resp.ok) {
          console.warn('No advertiser user found:', advertiserAddr);
          setLoadingUser(false);
          return;
        }
        const data: UserApiResponse = await resp.json();
        setAdvertiserUser(data);
      } catch (err) {
        console.error('Error fetching advertiser user:', err);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, [advertiserAddr]);

  /*******************************************************
   * 3) Once the contract is loaded, fetch on-chain data
   *******************************************************/
  useEffect(() => {
    if (!campaignContract) return;
    (async () => {
      setChainLoading(true);
      setChainError(null);
      try {
        const cData = await campaignContract.getCampaignData();
        setOnChainData(cData);

        // Gather top affiliates from the on-chain dictionary
        const dict: Dictionary<bigint, bigint> = cData.topAffiliates;
        const affArray: {
          affiliateId: bigint;
          affiliateAddr: string;
          totalEarnings: bigint;
          state: bigint;
        }[] = [];
        for (const [affId] of dict) {
          const affData: AffiliateData | null = await campaignContract.getAffiliateData(affId);
          if (affData) {
            affArray.push({
              affiliateId: affId,
              affiliateAddr: affData.affiliate.toString(),
              totalEarnings: affData.totalEarnings,
              state: affData.state,
            });
          }
        }
        setTopAffiliatesData(affArray);
      } catch (err: any) {
        setChainError(err.message || 'On-chain fetch error');
      } finally {
        setChainLoading(false);
      }
    })();
  }, [campaignContract]);

  /*******************************************************
   * 4) Fetch unread notifications for this wallet/campaign
   *******************************************************/
  useEffect(() => {
    const walletAddr = userAccount?.address;
    if (!id || !walletAddr) return;
    (async () => {
      try {
        const resp = await fetch(`/api/v1/campaigns/${id}/notifications?walletAddress=${walletAddr}`);
        if (!resp.ok) {
          console.warn('No notifications or error fetching them');
          return;
        }
        const data: NotificationApiResponse[] = await resp.json();
        setNotifications(data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    })();
  }, [id, userAccount?.address]);

  /*******************************************************
   * 5) Listen for AffiliateCreatedEvent => sets newAffiliateId
   *******************************************************/
  useAffiliateWebSocket(
    userAccount?.address,
    (createdId) => {
      console.log('AffiliateCreatedEvent from server arrived.');
      setWaitingForTx(false);
      setTxSuccess(true);
      setTxFailed(false);
      setTxTimeout(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setNewAffiliateId(createdId);

      // Also fetch "my affiliates" again
      fetchMyAffiliates();
    },
    id
  );

  /*******************************************************
   * 6) “My Affiliates” for this user in this campaign
   *******************************************************/
  async function fetchMyAffiliates() {
    if (!userAccount?.address) return;
    try {
      setAffiliatesLoading(true);
      setAffiliatesError(null);

      const encoded = Address.parse(userAccount.address).toString();
      const resp = await fetch(`/api/v1/campaign-roles/affiliates/by-wallet/${encoded}`);

      if (!resp.ok) {
        if (resp.status === 404) {
          // no affiliates found
          setMyAffiliates([]);
          return;
        }
        throw new Error(`Error fetching affiliates: ${resp.status} ${resp.statusText}`);
      }
      const data: CampaignRoleApiResponse[] = await resp.json();
      // Filter to roles for *this* campaign
      const relevant = data.filter((r) => r.campaignId === id);
      setMyAffiliates(relevant);
    } catch (err: any) {
      console.error('Error fetching my affiliates:', err);
      setAffiliatesError(err.message);
    } finally {
      setAffiliatesLoading(false);
    }
  }

  // If the user is not the advertiser, we auto-fetch “My Affiliates”
  useEffect(() => {
    if (!isUserAdvertiser && userAccount?.address) {
      fetchMyAffiliates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserAdvertiser, userAccount?.address]);

  /*******************************************************
   * Mark a notification as read automatically on click
   *******************************************************/
  async function handleNotificationClick(notifId: number) {
    try {
      const resp = await fetch(`/api/v1/campaigns/${id}/notifications/${notifId}/read`, {
        method: 'PATCH',
      });
      if (!resp.ok) {
        throw new Error(`Failed to mark notification as read. Code: ${resp.status}`);
      }
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  /*******************************************************
   * Create an affiliate: the user flow with a 60s fallback
   *******************************************************/
  async function handleCreateAffiliate() {
    if (!campaignContract || !sender || !userAccount?.address) return;

    setWaitingForTx(true);
    setTxSuccess(false);
    setTxFailed(false);
    setTxTimeout(false);
    setNewAffiliateId(null);

    // Start a 60s timer in case no server event arrives
    timeoutRef.current = window.setTimeout(() => {
      setTxTimeout(true);
      setWaitingForTx(false);
    }, 60_000);

    try {
      await affiliateCreateNewAffiliate(campaignContract, sender, userAccount.address);
      // We wait for the WebSocket event to confirm newAffiliateId
      console.log('affiliateCreateNewAffiliate transaction sent...');
    } catch (err) {
      console.error('Transaction failed or canceled:', err);
      setWaitingForTx(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTxFailed(true);
    }
  }

  /** Helper to parse a TON address safely. */
  function formatTonFriendly(rawAddr: string): string {
    try {
      return Address.parse(rawAddr).toString({ bounceable: false, testOnly: true });
    } catch {
      return rawAddr;
    }
  }

  /** Helper to format date strings. */
  function formatDate(dStr?: string | null): string {
    if (!dStr) return '';
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) return <div>Loading campaign data...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!campaign) return <div>No campaign found</div>;

  // Possibly paused or expired?
  const showPausedOrExpiredError =
    onChainData &&
    (onChainData.isCampaignPausedByAdmin === true || onChainData.isCampaignExpired === true);

  let pausedOrExpiredMsg = '';
  if (onChainData?.isCampaignPausedByAdmin) {
    pausedOrExpiredMsg = 'This campaign is currently paused by an admin.';
  } else if (onChainData?.isCampaignExpired) {
    pausedOrExpiredMsg = 'This campaign has expired.';
  }

  /*******************************************************
   * Copy the campaign link for inviting new affiliates
   *******************************************************/
  function handleCopyInviteUrl() {
    const affiliateInviteUrl = window.location.href;
    navigator.clipboard.writeText(affiliateInviteUrl).then(
      () => alert('Copied invite link to clipboard!'),
      (err) => console.error('Failed to copy text: ', err)
    );
  }

  return (
    <div style={{ margin: '1rem' }}>
      {/* If paused or expired, show a warning */}
      {showPausedOrExpiredError && (
        <div
          style={{
            backgroundColor: '#fdd',
            color: '#900',
            padding: '0.8rem',
            marginBottom: '1rem',
          }}
        >
          <strong>{pausedOrExpiredMsg}</strong> It is therefore not active.
        </div>
      )}

      <h1 style={{ marginBottom: '0.5rem' }}>
        Campaign Page for: {campaign.assetName || '(Unnamed)'}
      </h1>
      <h2 style={{ marginBottom: '0.5rem' }}>Campaign ID: {campaign.id}</h2>
      <h2 style={{ marginBottom: '0.5rem' }}>Campaign Name: {campaign.campaignName}</h2>

      {/* If onChainData is loaded, show contract address */}
      {onChainData && (
        <h3 style={{ marginBottom: '1rem' }}>
          Campaign Contract Address: {formatTonFriendly(onChainData.contractAddress.toString())}
        </h3>
      )}

      {/* The row with Merchant on the left, main info on the right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
        {/* Left column: Merchant info */}
        <div style={{ flex: '0 0 300px' }}>
          <h3>Merchant</h3>
          {loadingUser ? (
            <p>Loading owner data...</p>
          ) : advertiserUser ? (
            <div style={{ border: '1px solid #ccc', padding: '0.5rem', borderRadius: '4px' }}>
              <p>
                <strong>Telegram Username:</strong> {advertiserUser.telegramUsername}
              </p>
              <p>
                <strong>Ton Address:</strong> {campaign.advertiserAddress}
              </p>
              <p>
                <strong>First Name:</strong> {advertiserUser.firstName}
              </p>
              <p>
                <strong>Last Name:</strong> {advertiserUser.lastName}
              </p>
              {advertiserUser.photoUrl && (
                <img
                  src={advertiserUser.photoUrl}
                  alt="Owner Avatar"
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    marginTop: '0.5rem',
                    borderRadius: '4px',
                  }}
                />
              )}
            </div>
          ) : (
            <p>No advertiser user data found.</p>
          )}

          {/* If user is advertiser => show "Invite New Affiliates" */}
          {isUserAdvertiser && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
              <h3>Invite New Affiliates</h3>
              <p>
                Share this link with potential affiliates. When they visit, they can register as your
                affiliate:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  style={{ flex: 1, border: '1px solid #ccc', borderRadius: '4px', padding: '0.4rem' }}
                  value={window.location.href}
                />
                <button onClick={handleCopyInviteUrl}>Copy Link</button>
              </div>
            </div>
          )}

          {/* If user is not advertiser => show "Become an Affiliate" */}
          {!isUserAdvertiser && campaignContract && sender && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
              <h3>Become an Affiliate</h3>
              <p>Generate your affiliate ID in this campaign:</p>

              {/* If waiting for TX or success/fail states */}
              {waitingForTx && !txTimeout && !txSuccess && (
                <div style={{ marginBottom: '1rem' }}>
                  <Spinner />
                  <p>Waiting for server confirmation... (can take up to 1 minute)</p>
                </div>
              )}
              {txTimeout && !txSuccess && (
                <div style={{ marginBottom: '1rem', color: 'red' }}>
                  Timed out waiting for event. The transaction might still be pending...
                </div>
              )}
              {txSuccess && (
                <div style={{ marginBottom: '1rem' }}>
                  <SuccessIcon />
                  <p>Affiliate created successfully!</p>
                </div>
              )}
              {txFailed && (
                <div style={{ marginBottom: '1rem', color: 'red' }}>
                  Transaction failed or was canceled.
                </div>
              )}

              <button
                onClick={handleCreateAffiliate}
                disabled={waitingForTx || txSuccess}
                style={{ marginBottom: '1rem' }}
              >
                Create Affiliate
              </button>

              {/* If new affiliate minted, show the link */}
              {newAffiliateId !== null && (
                <div
                  style={{
                    border: '1px solid #ccc',
                    padding: '0.5rem',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <strong>Your new Affiliate ID:</strong> {newAffiliateId.toString()}
                  <br />
                  <strong>Your affiliate page: </strong>
                  <Link to={`/campaign/${campaign.id}/affiliate/${newAffiliateId.toString()}`}>
                    {`/campaign/${campaign.id}/affiliate/${newAffiliateId.toString()}`}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* My Affiliates if I'm not the advertiser */}
          {!isUserAdvertiser && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
              <h3>My Affiliates in This Campaign</h3>
              {affiliatesLoading && <p>Loading your affiliates...</p>}
              {affiliatesError && <p style={{ color: 'red' }}>{affiliatesError}</p>}
              {!affiliatesLoading && !affiliatesError && myAffiliates.length === 0 && (
                <p>No affiliates found for your wallet in this campaign.</p>
              )}
              {myAffiliates.length > 0 && (
                <table style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: '4px' }}>Affiliate ID</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px' }}>Active?</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px' }}>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAffiliates.map((role) => (
                      <tr key={role.id}>
                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                          {role.affiliateId}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                          {formatDate(role.createdAt)}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                          {
                          <Link to={`/campaign/${campaign.id}/affiliate/${role.affiliateId!.toString()}`}>
                            {`View Affiliate Page`}
                          </Link>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Right column: main campaign info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {/* Campaign Image */}
            <div>
              {campaign.assetPhotoBase64 ? (
                <img
                  src={`data:image/png;base64,${campaign.assetPhotoBase64}`}
                  alt="Campaign"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <img
                  src="/images/default-campaign.png"
                  alt="No campaign photo"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                  }}
                />
              )}
            </div>

            {/* Basic campaign text info */}
            <div>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Description:</strong> {campaign.assetDescription || 'N/A'}
              </p>
              {campaign.inviteLink && (
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Telegram Link:</strong>{' '}
                  <a href={campaign.inviteLink} target="_blank" rel="noopener noreferrer">
                    {campaign.inviteLink}
                  </a>
                </p>
              )}
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Created: {formatDate(campaign.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr style={{ margin: '2rem 0' }} />

      {/* On-chain data columns */}
      {chainHookLoading && <p>Loading contract hook...</p>}
      {chainHookError && <p style={{ color: 'red' }}>Hook error: {chainHookError}</p>}
      {chainLoading && <p>Fetching on-chain data...</p>}
      {chainError && <p style={{ color: 'red' }}>{chainError}</p>}

      {onChainData ? (
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'flex-start',
            marginTop: '1rem',
            marginBottom: '2rem',
          }}
        >
          {/* Column 1: Campaign Details */}
          <div
            style={{
              flex: '0 0 220px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '0.8rem',
            }}
          >
            <h3 style={{ marginBottom: '0.8rem' }}>Campaign Details</h3>
            <p>
              <strong>Payment Method:</strong>{' '}
              {onChainData.campaignDetails.paymentMethod === 0n ? 'TON' : 'USDT'}
            </p>
            <p>
              <strong>Campaign Type:</strong>{' '}
              {onChainData.campaignDetails.isPublicCampaign ? 'Public' : 'Private'}
            </p>

            {/* Expiration */}
            {onChainData.campaignDetails.campaignValidForNumDays != null ? (
              (() => {
                const days = Number(onChainData.campaignDetails.campaignValidForNumDays);
                const startSec = Number(onChainData.campaignStartTimestamp);
                if (startSec > 0) {
                  const expireSec = startSec + days * 86400;
                  const expireDate = new Date(expireSec * 1000);
                  return (
                    <p>
                      <strong>Valid For (days):</strong> {days}
                      <br />
                      <strong>Expires on:</strong>{' '}
                      {expireDate.toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  );
                } else {
                  return (
                    <p>
                      <strong>Valid For (days):</strong> {days} (not started yet)
                    </p>
                  );
                }
              })()
            ) : (
              <p>
                <strong>Valid For (days):</strong> No expiration
              </p>
            )}

            {/* Cost per action */}
            {(() => {
              const dictReg = onChainData.campaignDetails.regularUsersCostPerAction;
              const dictPrem = onChainData.campaignDetails.premiumUsersCostPerAction;
              const regCostBn = dictReg.get(BOT_OP_CODE_USER_CLICK) || 0n;
              const premCostBn = dictPrem.get(BOT_OP_CODE_USER_CLICK) || 0n;
              return (
                <div style={{ marginTop: '1rem' }}>
                  <p>
                    <strong>Regular CPC:</strong> {fromNano(regCostBn)} TON
                  </p>
                  <p>
                    <strong>Premium CPC:</strong> {fromNano(premCostBn)} TON
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Column 2: Campaign Status */}
          <div
            style={{
              flex: '0 0 220px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '0.8rem',
            }}
          >
            <h3 style={{ marginBottom: '0.8rem' }}>Campaign Status</h3>
            {(() => {
              const realTonBalance = Number(onChainData.contractTonBalance) / 1e9;
              const isUSDT = onChainData.campaignDetails.paymentMethod === 1n;
              const requiredGas = isUSDT ? 0.5 : 1; 
              const hasSufficientGas = realTonBalance >= requiredGas;

              const isReallyActive =
                onChainData.isCampaignActive &&
                !onChainData.isCampaignPausedByAdmin &&
                !onChainData.isCampaignExpired &&
                hasSufficientGas;

              return (
                <>
                  <ActiveStatusDot isActive={isReallyActive} />

                  <StatusDot
                    label="Sufficient Funds"
                    value={onChainData.campaignHasSufficientFundsToPayMaxCpa}
                  />

                  {/* Add Funds (only if advertiser) */}
                  {isUserAdvertiser && (
                    <div style={{ marginLeft: '1rem', marginBottom: '1rem' }}>
                      <TransactionButton
                        buttonLabel="Add Funds"
                        showAmountField
                        defaultAmount={1}
                        onTransaction={async (amount) => {
                          if (!amount) throw new Error('Invalid amount');
                          if (isUSDT) {
                            await replenishWithUsdt(
                              campaignContract,
                              amount,
                              sender,
                              userAccount?.address,
                              client
                            );
                          } else {
                            await replenishWithTon(campaignContract, amount, sender);
                          }
                        }}
                      />
                    </div>
                  )}

                  <StatusDot label="Sufficient Ton for Gas Fees" value={hasSufficientGas} />

                  {/* Add TON for Gas Fees (only if advertiser) */}
                  {isUserAdvertiser && (
                    <div style={{ marginLeft: '1rem' }}>
                      <TransactionButton
                        buttonLabel="Add TON for Gas Fees"
                        showAmountField
                        defaultAmount={1}
                        onTransaction={async (amount) => {
                          if (!amount) throw new Error('Invalid amount');
                          if (isUSDT) {
                            await replenishGasFeesForUsdtCampaign(
                              campaignContract,
                              amount,
                              sender
                            );
                          } else {
                            await replenishWithTon(campaignContract, amount, sender);
                          }
                        }}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Column 3: Campaign Data */}
          <div
            style={{
              flex: 1,
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '0.8rem',
            }}
          >
            <h3 style={{ marginBottom: '0.8rem' }}>Campaign Data</h3>
            {(() => {
              // For TON-based campaigns: "0.5" displayed as the "campaign balance" and "1" as the contract's Ton balance
              // For USDT campaigns: show real fromNano(...) values
              const isTON = onChainData.campaignDetails.paymentMethod === 0n;
              const displayCampaignBalance = isTON ? '0.5' : fromNano(onChainData.campaignBalance);
              const displayContractTonBalance = isTON ? '1' : fromNano(onChainData.contractTonBalance);

              if (isTON) {
                return (
                  <>
                    <p>
                      <strong>Campaign Balance (TON):</strong> {displayCampaignBalance}
                    </p>
                    <p>
                      <strong>Campaign Contract Ton Balance:</strong> {displayContractTonBalance}
                    </p>
                  </>
                );
              } else {
                return (
                  <>
                    <p>
                      <strong>Campaign Balance (USDT):</strong>{' '}
                      {fromNano(onChainData.campaignBalance)}
                    </p>
                    <p>
                      <strong>Campaign Contract Ton Balance:</strong>{' '}
                      {fromNano(onChainData.contractTonBalance)}
                    </p>
                  </>
                );
              }
            })()}

            <p>
              <strong># Affiliates:</strong> {onChainData.numAffiliates.toString()}
            </p>

            {onChainData.campaignStartTimestamp !== 0n ? (
              <p>
                <strong>Campaign Start Date:</strong>{' '}
                {new Date(Number(onChainData.campaignStartTimestamp) * 1000).toLocaleDateString(
                  'en-US',
                  { day: 'numeric', month: 'short', year: 'numeric' }
                )}
              </p>
            ) : (
              <p>Campaign has not started yet</p>
            )}

            {onChainData.lastUserActionTimestamp === 0n ? (
              <p>
                <strong>Last User Action Date:</strong> No user actions yet
              </p>
            ) : (
              <p>
                <strong>Last User Action Date:</strong>{' '}
                {new Date(Number(onChainData.lastUserActionTimestamp) * 1000).toLocaleDateString(
                  'en-US',
                  { day: 'numeric', month: 'short', year: 'numeric' }
                )}
              </p>
            )}

            <p>
              <strong># User Actions:</strong> {onChainData.numUserActions.toString()}
            </p>
            <p>
              <strong>Merchant Fee (%):</strong>{' '}
              {(Number(onChainData.advertiserFeePercentage) / 100).toFixed(2)}%
            </p>
            <p>
              <strong>Affiliate Fee (%):</strong>{' '}
              {(Number(onChainData.affiliateFeePercentage) / 100).toFixed(2)}%
            </p>
          </div>
        </div>
      ) : (
        !chainLoading && <p>No on-chain data yet.</p>
      )}

      <hr style={{ margin: '2rem 0' }} />

      {/* If we have onChainData, show Top Affiliates + Advertiser actions */}
      {onChainData && (
        <div style={{ display: 'flex', gap: '2rem' }}>
          {/* Left: Top Affiliates */}
          <div
            style={{
              flex: '0 0 50%',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '0.8rem',
            }}
          >
            <h2>Top Affiliates</h2>
            {topAffiliatesData.length === 0 ? (
              <p>No top affiliates found.</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ccc', padding: '4px' }}>Affiliate ID</th>
                    <th style={{ border: '1px solid #ccc', padding: '4px' }}>Address</th>
                    <th style={{ border: '1px solid #ccc', padding: '4px' }}>Total Earnings</th>
                    <th style={{ border: '1px solid #ccc', padding: '4px' }}>State</th>
                  </tr>
                </thead>
                <tbody>
                  {topAffiliatesData.map((aff) => (
                    <tr key={aff.affiliateId.toString()}>
                      <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                        {aff.affiliateId.toString()}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                        {formatTonFriendly(aff.affiliateAddr)}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                        {fromNano(aff.totalEarnings)} TON
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                        {aff.state.toString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Right: Advertiser Actions */}
          {isUserAdvertiser && (
            <div
              style={{
                flex: 1,
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '0.8rem',
              }}
            >
              <h2>Actions</h2>

              {/* Add Funds */}
              <div style={{ marginBottom: '1rem' }}>
                <TransactionButton
                  buttonLabel="Add Funds"
                  showAmountField
                  defaultAmount={1}
                  onTransaction={async (amount) => {
                    if (!amount) throw new Error('Invalid amount');
                    if (onChainData.campaignDetails.paymentMethod === 0n) {
                      await replenishWithTon(campaignContract, amount, sender);
                    } else {
                      await replenishWithUsdt(
                        campaignContract,
                        amount,
                        sender,
                        userAccount?.address,
                        client
                      );
                    }
                  }}
                />
              </div>

              {/* Add TON for Gas Fees */}
              <div style={{ marginBottom: '1rem' }}>
                <TransactionButton
                  buttonLabel="Add TON for Gas Fees"
                  showAmountField
                  defaultAmount={1}
                  onTransaction={async (amount) => {
                    if (!amount) throw new Error('Invalid amount');
                    if (onChainData.campaignDetails.paymentMethod === 0n) {
                      await replenishWithTon(campaignContract, amount, sender);
                    } else {
                      await replenishGasFeesForUsdtCampaign(campaignContract, amount, sender);
                    }
                  }}
                />
              </div>

              {/* Withdraw Funds */}
              <div style={{ marginBottom: '1rem' }}>
                <TransactionButton
                  buttonLabel="Withdraw Funds"
                  showAmountField
                  onTransaction={async (amount) => {
                    if (!amount) throw new Error('Invalid withdraw amount');
                    await advertiserWithdrawFunds(campaignContract, amount, sender, userAccount?.address);
                  }}
                />
              </div>

              {/* Approve/Remove affiliates if private */}
              {!onChainData.campaignDetails.isPublicCampaign && (
                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    style={{ marginRight: '1rem' }}
                    onClick={async () => {
                      const affIdStr = prompt('Enter affiliate ID to approve:');
                      if (!affIdStr) return;
                      const affIdBn = BigInt(affIdStr);
                      await advertiserApproveAffiliate(campaignContract, affIdBn, sender);
                      alert(`Approved affiliate ID: ${affIdStr}`);
                    }}
                  >
                    Approve Affiliate
                  </button>
                  <button
                    onClick={async () => {
                      const affIdStr = prompt('Enter affiliate ID to remove:');
                      if (!affIdStr) return;
                      const affIdBn = BigInt(affIdStr);
                      await advertiserRemoveAffiliate(campaignContract, affIdBn, sender);
                      alert(`Removed affiliate ID: ${affIdStr}`);
                    }}
                  >
                    Remove Affiliate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Render notifications, auto-mark-as-read on click */}
      {notifications.length > 0 && (
        <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
          <h3>Notifications</h3>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{ padding: '0.5rem', borderBottom: '1px solid #eee', cursor: 'pointer' }}
              onClick={() => handleNotificationClick(n.id)}
            >
              <p style={{ margin: 0 }}>{n.message}</p>
              <small style={{ color: '#999' }}>
                {new Date(n.createdAt).toLocaleString()}
              </small>
            </div>
          ))}
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
            Click a notification to mark it as read.
          </p>
        </div>
      )}
    </div>
  );
}
