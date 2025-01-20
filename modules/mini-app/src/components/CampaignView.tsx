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

function StatusDot({
  label,
  value,
  invertColorForFalse = false,
  big = false,
}: {
  label: string;
  value: boolean;
  invertColorForFalse?: boolean;
  big?: boolean;
}) {
  let color = 'red';
  if (invertColorForFalse) {
    color = value ? 'red' : 'green';
  } else {
    color = value ? 'green' : 'red';
  }

  const dotSize = big ? '16px' : '12px';
  const fontSize = big ? '1.2rem' : '1rem';

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.4rem', fontSize }}>
      <span
        style={{
          display: 'inline-block',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: color,
          marginRight: '0.5rem',
          flexShrink: 0,
        }}
      />
      {label}: <strong style={{ marginLeft: '0.25rem' }}>{String(value)}</strong>
    </div>
  );
}

// The API shape for the campaign from /api/v1/campaigns/:id
interface CampaignApiResponse {
  id: string;
  advertiserAddress: string;
  campaignName: string;
  assetName: string;
  assetType?: string;
  assetTitle?: string;
  assetDescription?: string;
  inviteLink?: string;
  createdAt?: string;
  updatedAt?: string;
  assetPhotoBase64?: string;
}

// The shape of your User record from /users/byWallet/:address
interface UserRecord {
  id: number;
  telegramUsername: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  // etc...
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
      affiliateAddr: string; // e.g. "EQDabc..."
      totalEarnings: bigint;
      state: bigint;
    }>
  >([]);

  // (4) Advertiser user record
  const [advertiserUser, setAdvertiserUser] = useState<UserRecord | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(false);

  // 1) Fetch the campaign from the DB
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

  // 2) Hook up on-chain contract
  const advertiserAddr = campaign?.advertiserAddress;
  const campaignIdBigInt = campaign?.id ? BigInt(campaign.id) : undefined;

  const {
    campaignContract,
    isLoading: chainHookLoading,
    error: chainHookError,
  } = useCampaignContract(advertiserAddr, campaignIdBigInt);

  // 3) Once the campaign is loaded, fetch the advertiser user record
  useEffect(() => {
    if (!advertiserAddr) return;
    setLoadingUser(true);

    (async () => {
      try {
        // /users/byWallet/EQABC...
        const resp = await fetch(`/api/v1/users/byWallet/${advertiserAddr}`);
        if (!resp.ok) {
          // not necessarily an error, could be 404
          console.warn('No advertiser user found for address:', advertiserAddr);
          setLoadingUser(false);
          return;
        }
        const user: UserRecord = await resp.json();
        setAdvertiserUser(user);
      } catch (err) {
        console.error('Error fetching advertiser user:', err);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, [advertiserAddr]);

  // 4) Once contract is loaded, fetch on-chain data + top affiliates
  useEffect(() => {
    if (!campaignContract) return;

    (async () => {
      setChainLoading(true);
      setChainError(null);
      try {
        // 4a) Get general campaign data
        const data = await campaignContract.getCampaignData();
        setOnChainData(data);

        // 4b) Gather top affiliates
        const topAffiliatesDict: Dictionary<bigint, bigint> = data.topAffiliates;
        const affArray: Array<{
          affiliateId: bigint;
          affiliateAddr: string;
          totalEarnings: bigint;
          state: bigint;
        }> = [];

        for (const [affiliateId] of topAffiliatesDict) {
          // For each affiliate ID, fetch more details
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

  function formatTonFriendly(rawAddr: string): string {
    try {
      const addr = Address.parse(rawAddr);
      return addr.toString({ bounceable: false, testOnly: true });
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

  // Loading states
  if (loading) return <div>Loading campaign data...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!campaign) return <div>No campaign found</div>;

  // Render the main UI
  return (
    <div style={{ margin: '1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>
        Campaign Page for: {campaign.assetName || '(Unnamed)'}
      </h1>
      <h2 style={{ marginBottom: '1rem' }}>Campaign ID: {campaign.id}</h2>

      {/* Top-level container with 2 columns:
          LEFT: "CampaignOwner" data
          RIGHT: The existing "3 columns" layout for details/status/data
      */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* LEFT COLUMN: Advertiser / CampaignOwner data */}
        <div
          style={{
            flex: '0 0 220px',
            borderRight: '1px solid #ccc',
            paddingRight: '1rem',
          }}
        >
          <h3>Campaign Owner</h3>
          {loadingUser ? (
            <p>Loading owner data...</p>
          ) : advertiserUser ? (
            <div>
              <p>
                <strong>Telegram Username:</strong> {advertiserUser.telegramUsername}
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
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                />
              )}
            </div>
          ) : (
            <p>No advertiser user data found.</p>
          )}
        </div>

        {/* RIGHT COLUMN: The “3 columns” (photo + campaign details, status, data) */}
        <div style={{ flex: 1 }}>
          {/* 1) Show image if present */}
          {campaign.assetPhotoBase64 ? (
            <div style={{ marginBottom: '1rem' }}>
              <img
                src={`data:image/png;base64,${campaign.assetPhotoBase64}`}
                alt="Campaign"
                style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              <img
                src="/images/default-campaign.png"
                alt="No campaign photo"
                style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
              />
            </div>
          )}

          <p>
            <strong>Description:</strong> {campaign.assetDescription || 'N/A'}
          </p>
          {campaign.inviteLink && (
            <p>
              <strong>Invite Link:</strong>{' '}
              <a href={campaign.inviteLink} target="_blank" rel="noopener noreferrer">
                {campaign.inviteLink}
              </a>
            </p>
          )}

          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Created: {formatDate(campaign.createdAt)} | Updated: {formatDate(campaign.updatedAt)}
          </p>

          {/* If we have onChainData, show the 3 sub-columns */}
          {chainHookLoading && <p>Loading contract hook...</p>}
          {chainHookError && <p style={{ color: 'red' }}>Hook error: {chainHookError}</p>}
          {chainLoading && <p>Fetching on-chain data...</p>}
          {chainError && <p style={{ color: 'red' }}>{chainError}</p>}

          {onChainData ? (
            <>
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
                    borderRight: '1px solid #ccc',
                    paddingRight: '1rem',
                  }}
                >
                  <h3>Campaign Details</h3>
                  <p>
                    <strong>Payment Method:</strong>{' '}
                    {onChainData.campaignDetails.paymentMethod === 0n ? 'TON' : 'USDT'}
                  </p>

                  <p>
                    <strong>Campaign Type:</strong>{' '}
                    {onChainData.campaignDetails.isPublicCampaign
                      ? 'Public Campaign'
                      : 'Private Campaign'}
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
                    flex: '0 0 270px',
                    borderRight: '1px solid #ccc',
                    paddingRight: '1rem',
                  }}
                >
                  <h3>Campaign Status</h3>
                  <StatusDot label="Active" value={onChainData.isCampaignActive} big />
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <StatusDot
                      label="Sufficient Funds for Max CPA"
                      value={onChainData.campaignHasSufficientFundsToPayMaxCpa}
                    />
                    {isUserAdvertiser && (
                      <div style={{ marginLeft: 'auto' }}>
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
                  </div>

                  <StatusDot
                    label="Paused by Admin"
                    value={onChainData.isCampaignPausedByAdmin}
                    invertColorForFalse
                  />

                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <StatusDot
                      label="Sufficient Ton Gas Fees"
                      value={onChainData.campaignHasSufficientTonToPayGasFees}
                    />
                    {isUserAdvertiser && (
                      <div style={{ marginLeft: 'auto' }}>
                        <TransactionButton
                          buttonLabel="Add TON for Gas Fees"
                          showAmountField
                          defaultAmount={1}
                          onTransaction={async (amount) => {
                            if (!amount) throw new Error('Invalid amount');
                            if (onChainData.campaignDetails.paymentMethod === 0n) {
                              await replenishWithTon(campaignContract, amount, sender);
                            } else {
                              await replenishGasFeesForUsdtCampaign(
                                campaignContract,
                                amount,
                                sender
                              );
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <StatusDot
                    label="Expired"
                    value={onChainData.isCampaignExpired}
                    invertColorForFalse
                  />
                </div>

                {/* Column 3: Campaign Data */}
                <div style={{ flex: 1 }}>
                  <h3>Campaign Data</h3>
                  {onChainData.campaignDetails.paymentMethod === 0n ? (
                    <p>
                      <strong>Campaign Balance (TON):</strong>{' '}
                      {fromNano(onChainData.campaignBalance)}
                    </p>
                  ) : (
                    <p>
                      <strong>Campaign Balance (USDT):</strong>{' '}
                      {fromNano(onChainData.campaignBalance)}
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
                    <strong>Max CPA Value:</strong> {fromNano(onChainData.maxCpaValue)}
                    {onChainData.campaignDetails.paymentMethod === 0n ? ' TON' : ' USDT'}
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
            </>
          ) : (
            !chainLoading && <p>No on-chain data yet.</p>
          )}
        </div>
      </div>

      {/* HORIZONTAL LINE to separate from bottom section */}
      <hr style={{ margin: '2rem 0' }} />

      {/* BOTTOM SECTION: Two side-by-side columns: Top Affiliates | Actions */}
      {onChainData && (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          {/* Left: Top Affiliates */}
          <div
            style={{
              flex: '0 0 50%',
              borderRight: '1px solid #ccc',
              paddingRight: '1rem',
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
                      <td style={{ border: '1px solid #ccc', padding: '4px' }}>{aff.state.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Right: Actions */}
          {isUserAdvertiser && (
            <div style={{ flex: 1 }}>
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
                  <h4>Private Campaign Affiliate Management</h4>
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
