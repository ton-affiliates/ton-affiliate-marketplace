import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Address, Dictionary, fromNano } from '@ton/core';

import { useCampaignContract } from '../hooks/useCampaignContract';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';
import { useTonClient } from '../hooks/useTonClient';

import { replenishWithTon } from '../blockchain/advertiserReplenishWithTon';
import { replenishWithUsdt } from '../blockchain/advertiserReplenishWithUsdt';
import { replenishGasFeesForUsdtCampaign } from '../blockchain/advertiserReplenishCampaignGasFees';
import { advertiserWithdrawFunds } from '../blockchain/advertiserWithdrawFunds';
import { advertiserApproveAffiliate } from '../blockchain/advertiserApproveAffiliate';
import { advertiserRemoveAffiliate } from '../blockchain/advertiserRemoveAffiliate';
import { affiliateCreateNewAffiliate } from '../blockchain/affiliateCreateNewAffiliate';

import { useAffiliateWebSocket } from '../hooks/useAffiliateWebSocket';

import {
  CampaignApiResponse,
  UserApiResponse,
  NotificationApiResponse,
  CampaignRoleApiResponse,
} from '@common/ApiResponses';
import { CampaignData, AffiliateData } from '../contracts/Campaign';

// --- NEW IMPORTS for dynamic event listing ---
import {
  getEventNameByOpCode,
  getEventDefinition,
} from '@common/UserEventsConfig';

import TransactionButton from '../components/TransactionButton';
import Spinner from '../components/Spinner';
import SuccessIcon from '../components/SuccessIcon';

//
// 1) A small blink for "Active" dot
//
const blinkingAnimation = `
@keyframes blinkActive {
  0%   { background-color: green; }
  50%  { background-color: #4cff4c; }
  100% { background-color: green; }
}
`;

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

  // 1) Basic loading + error for the campaign from DB
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2) Campaign from DB (includes canBotVerify, requiredPrivileges, etc.)
  const [campaign, setCampaign] = useState<CampaignApiResponse | null>(null);

  // 3) On-chain data (advertiser, isActive, etc.)
  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);

  const [topAffiliatesData, setTopAffiliatesData] = useState<
    { affiliateId: bigint; affiliateAddr: string; totalEarnings: bigint; state: bigint }[]
  >([]);

  // Advertiser user (from DB)
  const [advertiserUser, setAdvertiserUser] = useState<UserApiResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // For the contract, we get `campaignContractAddress` from the DB
  const campaignContractAddress = campaign?.contractAddress;
  const {
    campaignContract,
    isLoading: chainHookLoading,
    error: chainHookError,
  } = useCampaignContract(campaignContractAddress);

  // Are we the advertiser?
  const [advertiserAddr, setAdvertiserAddr] = useState<string | null>(null);
  const isUserAdvertiser = useMemo(() => {
    if (!userAccount?.address || !advertiserAddr) return false;
    try {
      return Address.parse(userAccount.address).toString() === advertiserAddr;
    } catch {
      return false;
    }
  }, [userAccount?.address, advertiserAddr]);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationApiResponse[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Affiliate creation states
  const [newAffiliateId, setNewAffiliateId] = useState<bigint | null>(null);
  const [waitingForTx, setWaitingForTx] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);
  const [txTimeout, setTxTimeout] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // "My affiliates"
  const [myAffiliates, setMyAffiliates] = useState<CampaignRoleApiResponse[]>([]);
  const [affiliatesLoading, setAffiliatesLoading] = useState(false);
  const [affiliatesError, setAffiliatesError] = useState<string | null>(null);

  //------------------------------------------------------------------
  // 1) Fetch the campaign from DB -> includes canBotVerify & requiredPrivileges
  //------------------------------------------------------------------
  useEffect(() => {
    if (!id) {
      setError('No campaign ID in URL!');
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

        // We might have 'advertiserAddress' from the combined object
        if (data.advertiserAddress) {
          setAdvertiserAddr(data.advertiserAddress);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  //------------------------------------------------------------------
  // 2) Once we know advertiserAddr => fetch advertiser user
  //------------------------------------------------------------------
  useEffect(() => {
    if (!advertiserAddr) return;
    setLoadingUser(true);
    (async () => {
      try {
        const resp = await fetch(`/api/v1/users/byWallet/${advertiserAddr}`);
        if (!resp.ok) {
          console.warn('No advertiser user found for address:', advertiserAddr);
          setLoadingUser(false);
          return;
        }
        // Assume the API returns an array of users
        const data: UserApiResponse[] = await resp.json();
        console.log("UserApiResponse: " + JSON.stringify(data));
        if (data && data.length > 0) {
          setAdvertiserUser(data[0]); // Set the first (and likely only) element
        } else {
          setAdvertiserUser(null);
        }
      } catch (err: any) {
        console.error('Error fetching advertiser user:', err);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, [advertiserAddr]);

  //------------------------------------------------------------------
  // 3) Once we have the contract, fetch on-chain data
  //------------------------------------------------------------------
  useEffect(() => {
    if (!campaignContract) return;
    (async () => {
      setChainLoading(true);
      setChainError(null);

      try {
        const cData = await campaignContract.getCampaignData();
        setOnChainData(cData);

        // fetch top affiliates
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

  //------------------------------------------------------------------
  // 4) Fetch notifications
  //------------------------------------------------------------------
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

  //------------------------------------------------------------------
  // 5) WebSocket for affiliate created
  //------------------------------------------------------------------
  useAffiliateWebSocket(
    userAccount?.address,
    (createdId) => {
      console.log('[CampaignView] AffiliateCreatedEvent arrived from server');
      setWaitingForTx(false);
      setTxSuccess(true);
      setTxFailed(false);
      setTxTimeout(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setNewAffiliateId(createdId);
      fetchMyAffiliates();
    },
    id
  );

  //------------------------------------------------------------------
  // 6) My affiliates
  //------------------------------------------------------------------
  async function fetchMyAffiliates() {
    if (!userAccount?.address) return;
    try {
      setAffiliatesLoading(true);
      setAffiliatesError(null);

      const encoded = Address.parse(userAccount.address).toString();
      const resp = await fetch(`/api/v1/campaign-roles/affiliates/by-wallet/${encoded}`);
      if (!resp.ok) {
        if (resp.status === 404) {
          setMyAffiliates([]);
          return;
        }
        throw new Error(`Error fetching affiliates: ${resp.status} ${resp.statusText}`);
      }
      const data: CampaignRoleApiResponse[] = await resp.json();
      // Filter roles by the current campaign ID.
      const relevant = data.filter((r) => r.campaignId === id);
      // Deduplicate the array by affiliateId.
      const unique = Array.from(
        new Map(relevant.map((role) => [role.affiliateId, role])).values()
      );
      setMyAffiliates(unique);
    } catch (err: any) {
      console.error('Error fetching my affiliates:', err);
      setAffiliatesError(err.message);
    } finally {
      setAffiliatesLoading(false);
    }
  }

  // If not advertiser => fetch affiliates
  useEffect(() => {
    if (!isUserAdvertiser && userAccount?.address) {
      fetchMyAffiliates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserAdvertiser, userAccount?.address]);

  //------------------------------------------------------------------
  // 7) Notification logic
  //------------------------------------------------------------------
  function handleToggleNotifications() {
    setShowNotifications((prev) => !prev);
  }

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

  //------------------------------------------------------------------
  // 8) Create affiliate
  //------------------------------------------------------------------
  async function handleCreateAffiliate() {
    if (!campaignContract || !sender || !userAccount?.address) return;

    setWaitingForTx(true);
    setTxSuccess(false);
    setTxFailed(false);
    setTxTimeout(false);
    setNewAffiliateId(null);

    // fallback if no WS event in 60s
    timeoutRef.current = window.setTimeout(() => {
      setTxTimeout(true);
      setWaitingForTx(false);
    }, 60_000);

    try {
      await affiliateCreateNewAffiliate(campaignContract, sender, userAccount.address);
      console.log('TX sent... waiting for WS event');
    } catch (err) {
      console.error('TX failed or canceled:', err);
      setWaitingForTx(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTxFailed(true);
    }
  }

  //------------------------------------------------------------------
  // 9) Refresh Bot Admin Status
  //------------------------------------------------------------------
  async function handleRefreshBotAdmin() {
    if (!id) return;
    try {
      // Call the refresh endpoint to update the Telegram asset for this campaign.
      await fetch(`/api/v1/campaigns/${id}/refresh-bot-admin`, {
        method: 'POST',
      });

      // After the refresh, re-fetch the updated campaign data.
      const resp = await fetch(`/api/v1/campaigns/${id}`);
      if (!resp.ok) {
        throw new Error(`Failed to refetch campaign. Status: ${resp.status}`);
      }
      const updatedCampaign: CampaignApiResponse = await resp.json();
      setCampaign(updatedCampaign);
    } catch (err: any) {
      console.error('Error re-checking bot admin privileges:', err);
      alert(`Error re-checking bot admin privileges: ${String(err)}`);
    }
  }

  //------------------------------------------------------------------
  // Helpers
  //------------------------------------------------------------------
  function formatTonFriendly(rawAddr: string): string {
    try {
      return Address.parse(rawAddr).toString({ bounceable: false, testOnly: true });
    } catch {
      return rawAddr;
    }
  }

  function formatDate(dStr?: string | null): string {
    if (!dStr) return '';
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // On-chain check for partial "active"
  const isCampaignOnChainActive = useMemo(() => {
    if (!onChainData) return false;
    const realTonBalance = Number(onChainData.contractTonBalance) / 1e9;
    const isUSDT = onChainData.campaignDetails.paymentMethod === 1n;
    const requiredGas = isUSDT ? 0.5 : 1;
    const hasSufficientGas = realTonBalance >= requiredGas;

    return (
      onChainData.isCampaignActive &&
      !onChainData.isCampaignPausedByAdmin &&
      !onChainData.isCampaignExpired &&
      hasSufficientGas
    );
  }, [onChainData]);

  // The bot’s canBotVerify property from DB
  const botCanVerify = campaign?.canBotVerify || false;

  // Final "Active" = onChain active && bot can verify
  const isFullyActive = isCampaignOnChainActive && botCanVerify;

  //------------------------------------------------------------------
  // Load checks
  //------------------------------------------------------------------
  if (loading) return <div>Loading campaign data...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!campaign) return <div>No campaign found</div>;

  // Paused or expired?
  const showPausedOrExpiredError =
    onChainData && (onChainData.isCampaignPausedByAdmin || onChainData.isCampaignExpired);
  let pausedOrExpiredMsg = '';
  if (onChainData?.isCampaignPausedByAdmin) {
    pausedOrExpiredMsg = 'This campaign is currently paused by an admin.';
  } else if (onChainData?.isCampaignExpired) {
    pausedOrExpiredMsg = 'This campaign has expired.';
  }

  function handleCopyInviteUrl() {
    const affiliateInviteUrl = window.location.href;
    navigator.clipboard.writeText(affiliateInviteUrl).then(
      () => alert('Copied invite link to clipboard!'),
      (err) => console.error('Failed to copy text: ', err)
    );
  }

  //------------------------------------------------------------------
  // Render
  //------------------------------------------------------------------
  return (
    <div style={{ margin: '1rem' }}>
      {/* Notification bell at top-left */}
      <div style={{ position: 'absolute', top: 10, left: 10 }}>
        <div
          style={{
            position: 'relative',
            cursor: 'pointer',
            fontSize: '1.5rem',
            border: '1px solid #ccc',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            textAlign: 'center',
            lineHeight: '40px',
            backgroundColor: '#f5f5f5',
          }}
          onClick={handleToggleNotifications}
        >
          🔔
          {notifications.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: 'red',
                color: '#fff',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '0.8rem',
                lineHeight: '20px',
                textAlign: 'center',
              }}
            >
              {notifications.length}
            </span>
          )}
        </div>

        {showNotifications && (
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: 0,
              width: '300px',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              zIndex: 999,
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {notifications.length === 0 ? (
              <div style={{ padding: '0.5rem' }}>No new notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{ padding: '0.5rem', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                  onClick={() => handleNotificationClick(n.id)}
                >
                  <p style={{ margin: 0 }}>{n.message}</p>
                  {n.link && (
                    <p style={{ margin: '0.25rem 0' }}>
                      <a
                        href={n.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'blue' }}
                      >
                        Open link
                      </a>
                    </p>
                  )}
                  <small style={{ color: '#999' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </small>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* If paused or expired */}
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

      {/* The page title and ID */}
      <h1 style={{ marginBottom: '0.5rem' }}>
        Campaign Page for: {campaign.assetName || '(Unnamed)'}
      </h1>
      <h2 style={{ marginBottom: '0.5rem' }}>Campaign ID: {campaign.id}</h2>
      <h2 style={{ marginBottom: '0.5rem' }}>Campaign Name: {campaign.name}</h2>

      {onChainData && (
        <h3 style={{ marginBottom: '1rem' }}>
          Campaign Contract Address: {formatTonFriendly(onChainData.contractAddress.toString())}
        </h3>
      )}

      {/* "Fully Active" dot at the top: must be on-chain active & bot can verify */}
      <div style={{ marginBottom: '2rem' }}>
        <ActiveStatusDot isActive={isFullyActive} />
      </div>

      {/* The row with Advertiser on left, main info on right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
        {/* LEFT: Advertiser info & affiliate invites */}
        <div style={{ flex: '0 0 300px' }}>
          <h3>Advertiser</h3>
          {loadingUser ? (
            <p>Loading owner data...</p>
          ) : advertiserUser ? (
            <div style={{ border: '1px solid #ccc', padding: '0.5rem', borderRadius: '4px' }}>
              <p>
                <strong>Telegram Username:</strong> {advertiserUser.telegramUsername}
              </p>
              <p>
                <strong>Ton Address:</strong> {advertiserAddr}
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

          {isUserAdvertiser && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
              <h3>Invite New Affiliates</h3>
              <p>Share this link with potential affiliates:</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  style={{ flex: 1, border: '1px solid #ccc', borderRadius: '4px', padding: '0.4rem' }}
                  value={window.location.href}
                />
                <button onClick={handleCopyInviteUrl}>Copy Link</button>
              </div>

              <p style={{ marginTop: '1rem' }}>
                <Link to={`/campaign/${campaign.id}/affiliates`}>View All Affiliates</Link>
              </p>
            </div>
          )}

          {/* If user is not advertiser => show affiliate creation / listing */}
          {!isUserAdvertiser &&
            isCampaignOnChainActive && // Only show if on-chain is active (bot privileges don't matter for affiliates)
            campaignContract &&
            sender && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
                <h3>Become an Affiliate</h3>
                {onChainData?.campaignDetails.isPublicCampaign ? (
                  <p>Generate your affiliate referral link in this campaign:</p>
                ) : (
                  <p>Request permission to join this private campaign:</p>
                )}

                {waitingForTx && !txTimeout && !txSuccess && (
                  <div style={{ marginBottom: '1rem' }}>
                    <Spinner />
                    <p>Waiting for server confirmation... (can take up to 1 minute)</p>
                  </div>
                )}
                {txTimeout && !txSuccess && (
                  <div style={{ marginBottom: '1rem', color: 'red' }}>
                    Timed out waiting for the server event. The transaction might still be pending...
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
                  {onChainData?.campaignDetails.isPublicCampaign
                    ? 'Generate Referral Link'
                    : 'Ask to Join Campaign'}
                </button>

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
                      <th style={{ border: '1px solid #ccc', padding: '4px' }}>Created At</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px' }}>Link</th>
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
                          <Link to={`/campaign/${campaign.id}/affiliate/${role.affiliateId?.toString()}`}>
                            View Affiliate
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: main campaign info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {/* Campaign image */}
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

            {/* Expiration logic */}
            {onChainData.campaignDetails.campaignValidForNumDays != null ? (
              (() => {
                const days = Number(onChainData.campaignDetails.campaignValidForNumDays);
                const startSec = Number(onChainData.campaignStartTimestamp);
                if (startSec > 0) {
                  const expirationSec = startSec + days * 86400;
                  const expireDate = new Date(expirationSec * 1000);
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
                      <strong>Valid For (days):</strong> {days} (hasn’t started yet)
                    </p>
                  );
                }
              })()
            ) : (
              <p>
                <strong>Valid For (days):</strong> No expiration
              </p>
            )}

            {/* Show events & commissions in a table */}
            {(() => {
              const dictReg = onChainData.campaignDetails.regularUsersCostPerAction;
              const dictPrem = onChainData.campaignDetails.premiumUsersCostPerAction;

              // Gather a unique set of all opCodes from both dictionaries
              const allOpCodes = new Set<bigint>([...dictReg.keys(), ...dictPrem.keys()]);

              if (allOpCodes.size === 0) {
                return (
                  <div style={{ marginTop: '1rem' }}>
                    <h3>Events &amp; Commission</h3>
                    <p>No events defined in this campaign.</p>
                  </div>
                );
              }

              const rows: JSX.Element[] = [];
              for (const opCode of allOpCodes) {
                const regBn = dictReg.get(opCode) || 0n;
                const premBn = dictPrem.get(opCode) || 0n;
                const currency = onChainData.campaignDetails.paymentMethod === 0n ? 'TON' : 'USDT';

                const eventName = getEventNameByOpCode(opCode);
                const eventDef = eventName ? getEventDefinition(eventName) : undefined;
                const displayName = eventDef?.eventName || `Unknown (#${opCode.toString()})`;
                const displayDesc = eventDef?.description || '';

                rows.push(
                  <tr key={opCode.toString()}>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                      <strong>{displayName}</strong>
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                      {displayDesc}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                      {fromNano(regBn)} {currency}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                      {fromNano(premBn)} {currency}
                    </td>
                  </tr>
                );
              }

              return (
                <div style={{ marginTop: '1rem' }}>
                  <h3>Events &amp; Commission</h3>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #ccc', padding: '6px' }}>Event</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px' }}>Description</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px' }}>Regular User CPA</th>
                        <th style={{ border: '1px solid #ccc', padding: '6px' }}>Premium User CPA</th>
                      </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                  </table>
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

              return (
                <>
                  {/* Sufficient funds to pay affiliates */}
                  <StatusDot
                    label="Sufficient Funds"
                    value={onChainData.campaignHasSufficientFundsToPayMaxCpa}
                  />
                  {/* Enough TON for gas fees */}
                  <StatusDot label="Sufficient Ton for Gas Fees" value={hasSufficientGas} />
                  {/* Bot can verify events? (from DB campaign.canBotVerify) */}
                  <StatusDot label="Bot can verify events" value={botCanVerify} />

                  {/* If bot can't verify, show required privileges + button to recheck */}
                  {!botCanVerify && isUserAdvertiser && (
                    <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                      <p>
                        <strong>Needed Privileges:</strong>{' '}
                        {campaign.requiredPrivileges && campaign.requiredPrivileges.length > 0
                          ? campaign.requiredPrivileges.join(', ')
                          : '(none listed)'}
                      </p>
                      <button onClick={handleRefreshBotAdmin}>
                        I updated the bot’s admin privileges. Re-check
                      </button>
                    </div>
                  )}

                  {/* Add Funds (advertiser only) */}
                  {isUserAdvertiser && (
                    <div style={{ marginLeft: '1rem', marginTop: '1rem' }}>
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

                  {/* Add TON for Gas Fees (advertiser only) */}
                  {isUserAdvertiser && (
                    <div style={{ marginLeft: '1rem', marginTop: '1rem' }}>
                      <TransactionButton
                        buttonLabel="Add TON for Gas Fees"
                        showAmountField
                        defaultAmount={1}
                        onTransaction={async (amount) => {
                          if (!amount) throw new Error('Invalid amount');
                          if (isUSDT) {
                            await replenishGasFeesForUsdtCampaign(campaignContract, amount, sender);
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
              const isTON = onChainData.campaignDetails.paymentMethod === 0n;
              if (isTON) {
                return (
                  <>
                    <p>
                      <strong>Campaign Balance (TON):</strong>{' '}
                      {fromNano(onChainData.campaignBalance)}
                    </p>
                    <p>
                      <strong>Campaign Contract Ton Balance:</strong>{' '}
                      {fromNano(onChainData.contractTonBalance)}
                    </p>
                  </>
                );
              } else {
                // USDT
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
              <strong>Advertiser Fee (%):</strong>{' '}
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

          {/* Right: Advertiser actions */}
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
                    await advertiserWithdrawFunds(
                      campaignContract,
                      amount,
                      sender,
                      userAccount?.address
                    );
                  }}
                />
              </div>

              {/* Approve/Remove (private) */}
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
    </div>
  );
}
