import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { CampaignData } from '../contracts/Campaign';
import { Address, fromNano } from '@ton/core';
import { BOT_OP_CODE_USER_CLICK } from '@common/constants'; // 0 => user click

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
  // Decide color:
  // - Normally `true` => green, `false` => red
  // - If invertColorForFalse is set, `true` => red, `false` => green
  let color = 'red';
  if (invertColorForFalse) {
    color = value ? 'red' : 'green';
  } else {
    color = value ? 'green' : 'red';
  }

  // Make dots a bit bigger so they aren’t squished:
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

  // DB-level campaign data
  const [campaign, setCampaign] = useState<{
    id: string;
    walletAddress: string;
    assetType?: string;
    assetTitle?: string;
    assetDescription?: string;
    inviteLink?: string;
    createdAt?: string;
    updatedAt?: string;
    // ... plus any other fields
  } | null>(null);

  // On-chain data
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

  // 2) Hook up the contract
  const advertiserAddr = campaign?.walletAddress || undefined;
  const campaignIdBigInt = campaign?.id ? BigInt(campaign.id) : undefined;

  const { campaignContract, isLoading: chainHookLoading, error: chainHookError } =
    useCampaignContract(advertiserAddr, campaignIdBigInt);

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

  // Helper for TON-friendly address
  function formatTonFriendly(rawAddr: string): string {
    try {
      const addr = Address.parse(rawAddr);
      // Return non-bounceable testnet form, for example:
      return addr.toString({ bounceable: false, testOnly: true });
    } catch {
      return rawAddr; // fallback
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

  // 4) Render states
  if (loading) return <div>Loading campaign data...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!campaign) return <div>No campaign found</div>;

  return (
    <div style={{ margin: '1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Campaign Page for ID: {campaign.id}</h1>
      <p>
        <strong>Advertiser Address:</strong> {formatTonFriendly(campaign.walletAddress)}
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
            {/* Payment method first */}
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
              borderRight: '1px solid #ccc',
              paddingRight: '1rem',
              marginRight: '1rem',
            }}
          >
            <h3>Campaign Status</h3>
            {/* Make “Active” bigger */}
            <StatusDot label="Active" value={onChainData.isCampaignActive} big />
            <StatusDot
              label="Sufficient Funds for Max CPA"
              value={onChainData.campaignHasSufficientFundsToPayMaxCpa}
            />
            {/* invertColorForFalse => green if false */}
            <StatusDot
              label="Paused by Admin"
              value={onChainData.isCampaignPausedByAdmin}
              invertColorForFalse
            />
            <StatusDot
              label="Sufficient Ton Gas Fees"
              value={onChainData.campaignHasSufficientTonToPayGasFees}
            />
            <StatusDot
              label="Expired"
              value={onChainData.isCampaignExpired}
              invertColorForFalse
            />
          </div>

          {/* Column 3: Campaign Data (right side) */}
          <div style={{ flex: 1 }}>
            <h3>Campaign Data</h3>

            {/* Campaign Balance first */}
            {onChainData.campaignDetails.paymentMethod === 0n ? (
              <p>
                <strong>Campaign Balance (TON):</strong>{' '}
                {fromNano(onChainData.campaignBalance)}
              </p>
            ) : (
              <p>
                <strong>Campaign Balance (USDT):</strong>{' '}
                {onChainData.campaignBalance.toString()}
              </p>
            )}

            <p>
              <strong># Affiliates:</strong> {onChainData.numAffiliates.toString()}
            </p>

            {/* Possibly skip total affiliate earnings if not needed */}
            <p>
              <strong>Total Affiliate Earnings:</strong> {fromNano(onChainData.totalAffiliateEarnings)} TON
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

            {/* Show max CPA */}
            <p>
              <strong>Max CPA Value:</strong>{' '}
              {fromNano(onChainData.maxCpaValue)}
              {onChainData.campaignDetails.paymentMethod === 0n ? ' TON' : ' (nanoUSDT?)'}
            </p>

            {/* Fees */}
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
    </div>
  );
}
