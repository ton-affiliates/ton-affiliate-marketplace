import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { CampaignData } from '../contracts/Campaign';
import { Address, fromNano } from '@ton/core';
import { BOT_OP_CODE_USER_CLICK } from '@common/constants';
import { useTonConnectFetchContext } from './TonConnectProvider';

// Replenish scripts
import { replenishWithTon } from '../blockchain/campaign/advertiserReplenishWithTon';
import { replenishWithUsdt } from '../blockchain/campaign/advertiserReplenishWithUsdt';
import { replenishGasFeesForUsdtCampaign } from '../blockchain/campaign/advertiserReplenishCampaignGasFees';

// Advertiser-only scripts
import { advertiserWithdrawFunds } from '../blockchain/campaign/advertiserWithdrawFunds';
import { advertiserApproveAffiliate } from '../blockchain/campaign/advertiserApproveAffiliate';
import { advertiserRemoveAffiliate } from '../blockchain/campaign/advertiserRemoveAffiliate';

import { useTonWalletConnect } from '../hooks/useTonConnect';
import { useTonClient } from '../hooks/useTonClient';

// Our generic TransactionButton
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

export default function CampaignView() {
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();
  const client = useTonClient();

  const [campaign, setCampaign] = useState<{
    id: string;
    advertiserAddress: string;
    assetType?: string;
    assetTitle?: string;
    assetDescription?: string;
    inviteLink?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null>(null);

  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);

  // 1) Fetch from DB
  useEffect(() => {
    if (!id) {
      setError('No campaign ID in URL!');
      setLoading(false);
      return;
    }

    async function fetchFromAPI() {
      try {
        const resp = await fetch(`/api/v1/campaigns/${id}`);
        if (!resp.ok) {
          throw new Error(`Fetch error. Status ${resp.status} ${resp.statusText}`);
        }
        const data = await resp.json();
        setCampaign(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFromAPI();
  }, [id]);

  // 2) Hook up on-chain contract
  const advertiserAddr = campaign?.advertiserAddress || undefined;
  const campaignIdBigInt = campaign?.id ? BigInt(campaign.id) : undefined;

  const {
    campaignContract,
    isLoading: chainHookLoading,
    error: chainHookError,
  } = useCampaignContract(advertiserAddr, campaignIdBigInt);

  // 3) Once contract is loaded, fetch on-chain data
  useEffect(() => {
    if (!campaignContract) return;
    async function fetchOnChain() {
      setChainLoading(true);
      setChainError(null);
      try {
        const data = await campaignContract!.getCampaignData();
        setOnChainData(data);
      } catch (err: any) {
        setChainError(err.message || 'On-chain fetch error');
      } finally {
        setChainLoading(false);
      }
    }
    fetchOnChain();
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

  if (loading) return <div>Loading campaign data...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!campaign) return <div>No campaign found</div>;

  return (
    <div style={{ margin: '1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Campaign Page for ID: {campaign.id}</h1>
      <p>
        <strong>Advertiser Address:</strong> {formatTonFriendly(campaign.advertiserAddress)}
      </p>
      <p>
        <strong>Asset Type:</strong> {campaign.assetType || 'N/A'}
      </p>
      <p>
        <strong>Title:</strong> {campaign.assetTitle || 'N/A'}
      </p>
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

      <hr style={{ margin: '1.5rem 0' }} />

      <h2>On-Chain Campaign Data</h2>
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
          {/* Column 1: Campaign Details (left side) */}
          <div
            style={{
              flex: '0 0 220px',
              borderRight: '1px solid #ccc',
              paddingRight: '1rem',
              marginRight: '1rem',
            }}
          >
            <h3>Campaign Details</h3>
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
              flex: '0 0 270px', // increased width from 220px to 270px
              borderRight: '1px solid #ccc',
              paddingRight: '1rem',
              marginRight: '1rem',
            }}
          >
            <h3>Campaign Status</h3>

            {/* Active */}
            <StatusDot label="Active" value={onChainData.isCampaignActive} big />

            {/* Sufficient Funds row + Add Funds button */}
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
                        // TON-based
                        await replenishWithTon(campaignContract, amount, sender);
                      } else {
                        // USDT-based
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

            {/* Paused by Admin */}
            <StatusDot
              label="Paused by Admin"
              value={onChainData.isCampaignPausedByAdmin}
              invertColorForFalse
            />

            {/* Sufficient Ton Gas Fees row + button */}
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
                        await replenishGasFeesForUsdtCampaign(campaignContract, amount, sender);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Expired */}
            <StatusDot
              label="Expired"
              value={onChainData.isCampaignExpired}
              invertColorForFalse
            />
          </div>

          {/* Column 3: Campaign Data (right side) */}
          <div style={{ flex: 1 }}>
            <h3>Campaign Data</h3>

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
              <strong>Campaign Contract Address:</strong>{' '}
              {formatTonFriendly(onChainData.contractAddress.toString())}
            </p>
            <p>
              <strong>Campaign Ton Balance:</strong> {fromNano(onChainData.contractTonBalance)}
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
      ) : (
        !chainLoading && <p>No on-chain data yet.</p>
      )}

      {/* 5) ACTIONS SECTION */}
      {isUserAdvertiser && onChainData && (
        <div style={{ marginTop: '2rem' }}>
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
  );
}
