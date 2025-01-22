import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { CampaignData, AffiliateData } from '../contracts/Campaign';
import { Address, fromNano, Dictionary } from '@ton/core';
import { BOT_OP_CODE_USER_CLICK } from '@common/constants';
import { useTonConnectFetchContext } from './TonConnectProvider';

import { replenishWithTon } from '../blockchain/campaign/advertiserReplenishWithTon';
import { replenishWithUsdt } from '../blockchain/campaign/advertiserReplenishWithUsdt';
import { replenishGasFeesForUsdtCampaign } from '../blockchain/campaign/advertiserReplenishCampaignGasFees';
import { advertiserWithdrawFunds } from '../blockchain/campaign/advertiserWithdrawFunds';
import { advertiserApproveAffiliate } from '../blockchain/campaign/advertiserApproveAffiliate';
import { advertiserRemoveAffiliate } from '../blockchain/campaign/advertiserRemoveAffiliate';

import { useTonWalletConnect } from '../hooks/useTonConnect';
import { useTonClient } from '../hooks/useTonClient';
import TransactionButton from '../components/TransactionButton';

import {NotificationApiResponse, CampaignApiResponse, UserApiResponse} from "../models/models";

// Simple blink for "Active" dot
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

function StatusDot({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();
  const client = useTonClient();

  // (1) Campaign data from /api/v1/campaigns/:id
  const [campaign, setCampaign] = useState<CampaignApiResponse | null>(null);

  // (2) On-chain data
  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);

  // (3) Top affiliates local state
  const [topAffiliatesData, setTopAffiliatesData] = useState<
    Array<{
      affiliateId: bigint;
      affiliateAddr: string;
      totalEarnings: bigint;
      state: bigint;
    }>
  >([]);

  // (4) Advertiser user record
  const [advertiserUser, setAdvertiserUser] = useState<UserApiResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(false);

  // (5) Notifications
  const [notifications, setNotifications] = useState<NotificationApiResponse[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);


  //
  // 1) Fetch the campaign from the DB
  //
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
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  //
  // 2) Hook up on-chain contract
  //
  const advertiserAddr = campaign?.advertiserAddress;
  const campaignIdBigInt = campaign?.id ? BigInt(campaign.id) : undefined;

  const {
    campaignContract,
    isLoading: chainHookLoading,
    error: chainHookError,
  } = useCampaignContract(advertiserAddr, campaignIdBigInt);

  //
  // 3) Once the campaign is loaded, fetch the advertiser user record
  //
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
        const user: UserApiResponse = await resp.json();
        setAdvertiserUser(user);
      } catch (err) {
        console.error('Error fetching advertiser user:', err);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, [advertiserAddr]);

  //
  // 4) Once contract is loaded, fetch on-chain data + top affiliates
  //
  useEffect(() => {
    if (!campaignContract) return;

    (async () => {
      setChainLoading(true);
      setChainError(null);
      try {
        const data = await campaignContract.getCampaignData();
        setOnChainData(data);

        // Gather top affiliates
        const topAffiliatesDict: Dictionary<bigint, bigint> = data.topAffiliates;
        const affArray: Array<{
          affiliateId: bigint;
          affiliateAddr: string;
          totalEarnings: bigint;
          state: bigint;
        }> = [];

        for (const [affiliateId] of topAffiliatesDict) {
          const affData: AffiliateData | null = await campaignContract.getAffiliateData(affiliateId);
          if (affData) {
            affArray.push({
              affiliateId,
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

  //
  // 5) Fetch unread notifications if we have a user ID
  //    Suppose your user ID is userAccount?.id or something similar
  //
  useEffect(() => {
    const walletAddr = userAccount?.address;  // Or wherever your user ID is stored
    if (!id || !walletAddr) return;

    async function fetchNotifications() {
      try {
        const resp = await fetch(`/api/v1/campaigns/${id}/notifications?walletAddress=${walletAddr}`);
        if (!resp.ok) {
          console.warn('No notifications or error fetching them');
          return;
        }
        const data = await resp.json();
        setNotifications(data);

      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    }

    fetchNotifications();
  }, [id, userAccount?.address]);

  // Toggle notifications dropdown
  function handleToggleNotifications() {
    setShowNotifications(!showNotifications);
  }

  // A small helper to parse addresses
  function formatTonFriendly(rawAddr: string): string {
    try {
      const addr = Address.parse(rawAddr);
      return addr.toString({ bounceable: false, testOnly: true });
    } catch {
      return rawAddr;
    }
  }

  // Helper to format date
  function formatDate(dStr?: string | null): string {
    if (!dStr) return '';
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // Check if the currently connected user is the advertiser
  const isUserAdvertiser = React.useMemo(() => {
    if (!userAccount?.address || !advertiserAddr) return false;
    try {
      const userAddrParsed = Address.parse(userAccount.address);
      const advertiserParsed = Address.parse(advertiserAddr);
      return userAddrParsed.toString() === advertiserParsed.toString();
    } catch {
      return false;
    }
  }, [userAccount?.address, advertiserAddr]);

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

  const affiliateInviteUrl = window.location.href;
  function handleCopyInviteUrl() {
    navigator.clipboard.writeText(affiliateInviteUrl).then(
      () => alert('Copied invite link to clipboard!'),
      (err) => console.error('Failed to copy text: ', err)
    );
  }

  async function handleMarkAsRead(notifId: number) {
    try {
      // 1) Send PATCH request to the server
      const resp = await fetch(`/api/v1/campaigns/${id}/notifications/${notifId}/read`, {
        method: 'PATCH',
      });
      if (!resp.ok) {
        throw new Error(`Failed to mark notification as read. Code: ${resp.status}`);
      }
      const updated = await resp.json();
      console.log("Notification: " + notifId + " updates: " + updated);

      // 2) Update local state. 
      //    For example, remove from notifications array or update readAt locally.
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notifId)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  return (
    <div style={{ margin: '1rem' }}>
      {/* 
         1) A "notifications bell" in the top-right corner, 
         with a badge for unread count 
      */}
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

      {/* If showNotifications is true, show a dropdown box */}
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
                style={{
                  padding: '0.5rem',
                  borderBottom: '1px solid #eee',
                }}
              >
                <p style={{ margin: 0 }}>{n.message}</p>
                <small style={{ color: '#999' }}>
                  {new Date(n.createdAt).toLocaleString()}
                </small>

                {/* Mark as Read */}
                <button
                  style={{ marginLeft: '0.5rem' }}
                  onClick={() => handleMarkAsRead(n.id)}
                >
                  Mark as Read
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>

      {/* Show top-level warnings if paused or expired */}
      {showPausedOrExpiredError && (
        <div style={{ backgroundColor: '#fdd', color: '#900', padding: '0.8rem', marginBottom: '1rem' }}>
          <strong>{pausedOrExpiredMsg}</strong> It is therefore not active.
        </div>
      )}

      <h1 style={{ marginBottom: '0.5rem' }}>
        Campaign Page for: {campaign.assetName || '(Unnamed)'}
      </h1>
      <h2 style={{ marginBottom: '1rem' }}>Campaign ID: {campaign.id}</h2>
      <h2 style={{ marginBottom: '1rem' }}>Campaign Name: {campaign.campaignName}</h2>

      {/* 
        The row with CampaignOwner on the left and main info on the right 
      */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
        {/* Owner info */}
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
        </div>

        {/* Main campaign info (right) */}
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
                    objectFit: 'cover',
                    borderRadius: '4px',
                  }}
                />
              ) : (
                <img
                  src="/images/default-campaign.png"
                  alt="No campaign photo"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                  }}
                />
              )}
            </div>

            {/* Basic info text */}
            <div>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Description:</strong> {campaign.assetDescription || 'N/A'}
              </p>
              {campaign.inviteLink && (
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Invite Link:</strong>{' '}
                  <a href={campaign.inviteLink} target="_blank" rel="noopener noreferrer">
                    {campaign.inviteLink}
                  </a>
                </p>
              )}
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Created: {formatDate(campaign.createdAt)} | Updated: {formatDate(campaign.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal divider */}
      <hr style={{ margin: '2rem 0' }} />

      {/* The 3 columns: Campaign Details, Campaign Status, Campaign Data */}
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
              {onChainData.campaignDetails.isPublicCampaign ? 'Public Campaign' : 'Private Campaign'}
            </p>

            {/* Valid For / Expiration */}
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
            <ActiveStatusDot
              isActive={
                onChainData.isCampaignActive &&
                !onChainData.isCampaignPausedByAdmin &&
                !onChainData.isCampaignExpired
              }
            />

            {/* Sufficient Funds for Max CPA */}
            <StatusDot
              label="Sufficient Funds"
              value={onChainData.campaignHasSufficientFundsToPayMaxCpa}
            />
            {/* Add Funds button */}
            {isUserAdvertiser && (
              <div style={{ marginLeft: '1rem', marginBottom: '1rem' }}>
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
            )}

            {/* Sufficient Ton Gas Fees */}
            <StatusDot
              label="Sufficient Ton for Gas Fees"
              value={onChainData.campaignHasSufficientTonToPayGasFees}
            />
            {isUserAdvertiser && (
              <div style={{ marginLeft: '1rem' }}>
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
            )}
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
            {onChainData.campaignDetails.paymentMethod === 0n ? (
              <p>
                <strong>Campaign Balance (TON):</strong> {fromNano(onChainData.campaignBalance)}
              </p>
            ) : (
              <p>
                <strong>Campaign Balance (USDT):</strong> {fromNano(onChainData.campaignBalance)}
              </p>
            )}

            <p>
              <strong># Affiliates:</strong> {onChainData.numAffiliates.toString()}
            </p>

            <p>
              <strong>Campaign Contract Ton Balance:</strong>{' '}
              {fromNano(onChainData.contractTonBalance)}
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

      {/* HORIZONTAL LINE to separate from bottom section */}
      <hr style={{ margin: '2rem 0' }} />

      {onChainData && (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
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

          {/* Right: Actions & Invite Section */}
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

              <div style={{ marginBottom: '1rem' }}>
                <TransactionButton
                  buttonLabel="Withdraw Funds"
                  showAmountField
                  onTransaction={async (amount) => {
                    if (!amount) throw new Error('Invalid withdraw amount');
                    await advertiserWithdrawFunds(campaignContract, amount, sender);
                  }}
                />
              </div>

              {/* Private campaign affiliate management */}
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

              {/* 5) Invite New Affiliates Section */}
              <div
                style={{
                  marginTop: '2rem',
                  borderTop: '1px solid #ccc',
                  paddingTop: '1rem',
                }}
              >
                <h3>Invite New Affiliates</h3>
                <p>
                  Share this link with potential affiliates. When they visit, they can register as
                  your affiliate:
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="text"
                    readOnly
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                    value={`
${affiliateInviteUrl}`}
                  />
                  <button onClick={handleCopyInviteUrl}>Copy Link</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
