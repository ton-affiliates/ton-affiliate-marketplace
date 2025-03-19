import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Address, Dictionary, fromNano } from '@ton/core';

import { useCampaignContract } from '../hooks/useCampaignContract';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';

import { advertiserRemoveAffiliate } from '../blockchain/advertiserRemoveAffiliate';
import { advertiserApproveAffiliate } from '../blockchain/advertiserApproveAffiliate';
import { affiliateWithdrawEarnings } from '../blockchain/affiliateWithdrawEarnings';

import { AffiliateData, CampaignData, UserActionStats } from '../contracts/Campaign';
import { CampaignApiResponse, UserApiResponse } from '@common/ApiResponses';
import { getEventNameByBlockchainOpCode } from "@common/BlockchainEventsConfig.ts"

// 1) fetch the single affiliate from DB
async function fetchSingleAffiliate(
  campaignId: string,
  affiliateId: string
): Promise<UserApiResponse> {
  const resp = await fetch(`/api/v1/campaign-roles/affiliates/${campaignId}/${affiliateId}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch affiliate. Status ${resp.status}`);
  }
  return (await resp.json()) as UserApiResponse;
}

// 2) fetch campaign from DB
async function fetchCampaign(campaignId: string): Promise<CampaignApiResponse> {
  const resp = await fetch(`/api/v1/campaigns/${campaignId}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch campaign. Status ${resp.status}`);
  }
  return (await resp.json()) as CampaignApiResponse;
}

export function AffiliatePage() {
  const { campaignId, affiliateId } = useParams<{ campaignId: string; affiliateId: string }>();
  const [campaign, setCampaign] = useState<CampaignApiResponse | null>(null);
  const [affiliateUser, setAffiliateUser] = useState<UserApiResponse | null>(null);
  const [affiliateChainData, setAffiliateChainData] = useState<AffiliateData | null>(null);
  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();

  // ----------------------------------------------------------------
  // 3) Fetch the campaign from DB => e.g. get campaignContractAddress
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);

    fetchCampaign(campaignId)
      .then((data) => {
        console.log('[AffiliatePage] DB campaign =>', data);
        setCampaign(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  // ----------------------------------------------------------------
  // 4) Now we have campaign?.contractAddress => pass to useCampaignContract
  // ----------------------------------------------------------------
  const campaignContractAddress = campaign?.contractAddress;
  const {
    campaignContract,
    isLoading: contractLoading,
    error: contractError,
  } = useCampaignContract(campaignContractAddress);

  // ----------------------------------------------------------------
  // 5) Once contract is ready, fetch affiliate data (DB + on-chain)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!campaignId || !affiliateId || !campaignContract) return;

    (async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // A) DB user info
        const dbUser = await fetchSingleAffiliate(campaignId, affiliateId);
        console.log('[AffiliatePage] DB affiliate user =>', dbUser);
        setAffiliateUser(dbUser);

        // B) On-chain affiliate data
        const affIdBn = BigInt(affiliateId);
        const chainData = await campaignContract.getAffiliateData(affIdBn);
        console.log('[AffiliatePage] onChain affiliate data =>', chainData);
        setAffiliateChainData(chainData);

        // C) Overall on-chain campaign data
        const cData = await campaignContract.getCampaignData();
        console.log('[AffiliatePage] onChain campaign data =>', cData);
        setOnChainData(cData);
      } catch (err: any) {
        console.error('Error loading affiliate data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignId, affiliateId, campaignContract]);

  // ----------------------------------------------------------------
  // 6) isUserAdvertiser => compare user wallet to onChainData.advertiser
  // ----------------------------------------------------------------
  const isUserAdvertiser = useMemo(() => {
    if (!userAccount?.address || !onChainData?.advertiser) return false;
    try {
      const userAddrStr = Address.parse(userAccount.address).toString();
      const advAddrStr = onChainData.advertiser.toString();
      return userAddrStr === advAddrStr;
    } catch {
      return false;
    }
  }, [userAccount?.address, onChainData?.advertiser]);

  // ----------------------------------------------------------------
  // 7) isUserTheAffiliate => compare user wallet to affiliateChainData.affiliate
  // ----------------------------------------------------------------
  const isUserTheAffiliate = useMemo(() => {
    if (!userAccount?.address || !affiliateChainData?.affiliate) return false;
    try {
      const userAddrParsed = Address.parse(userAccount.address).toString();
      const affAddrParsed = affiliateChainData.affiliate.toString();
      return userAddrParsed === affAddrParsed;
    } catch {
      return false;
    }
  }, [userAccount?.address, affiliateChainData]);

  // ----------------------------------------------------------------
  // 8) Approve / Remove / Withdraw logic
  // ----------------------------------------------------------------
  async function handleApprove() {
    if (!affiliateId || !campaignContract || !sender) {
      alert('Not ready to approve affiliate. Missing ID, contract, or sender.');
      return;
    }
    try {
      await advertiserApproveAffiliate(campaignContract, BigInt(affiliateId), sender);
      alert(`Approved affiliate ID: ${affiliateId}`);
    } catch (err) {
      console.error(err);
      alert(`Failed to approve affiliate: ${String(err)}`);
    }
  }

  async function handleRemove() {
    if (!affiliateId || !campaignContract || !sender) {
      alert('Not ready to remove affiliate. Missing ID, contract, or sender.');
      return;
    }
    try {
      await advertiserRemoveAffiliate(campaignContract, BigInt(affiliateId), sender);
      alert(`Removed affiliate ID: ${affiliateId}`);
    } catch (err) {
      console.error(err);
      alert(`Failed to remove affiliate: ${String(err)}`);
    }
  }

  async function handleWithdrawEarnings() {
    if (!affiliateId || !campaignContract || !sender) {
      alert('Not ready to withdraw earnings. Missing affiliateId, contract, or sender.');
      return;
    }
    try {
      await affiliateWithdrawEarnings(
        campaignContract,
        BigInt(affiliateId),
        sender,
        userAccount?.address
      );
      alert('Withdraw successful! (Refetch data to see new amounts.)');
    } catch (err) {
      console.error(err);
      alert(`Failed to withdraw earnings: ${String(err)}`);
    }
  }

  // ----------------------------------------------------------------
  // 9) Helper to render user stats from a dictionary
  // ----------------------------------------------------------------
  function renderUserActionStats(dict?: Dictionary<bigint, UserActionStats>) {
    if (!dict) return null;
    const entries: JSX.Element[] = [];

    for (const key of dict.keys()) {
      const stats = dict.get(key);
      if (!stats) continue;

      // Look up event name from config
      const eventName = getEventNameByBlockchainOpCode(Number(key));
      const actionLabel = eventName
        ? eventName
        : `Unknown Action (#${key.toString()})`;

      entries.push(
        <div key={key.toString()} style={{ marginBottom: '0.5rem' }}>
          <strong>{actionLabel}:</strong>
          <div style={{ marginLeft: '1rem' }}>
            numActions: {stats.numActions.toString()}
            <br />
            lastUserActionTimestamp: {new Date(Number(stats.lastUserActionTimestamp) * 1000).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
          </div>
        </div>
      );
    }
    return <div>{entries}</div>;
  }

  // ----------------------------------------------------------------
  // 10) Basic checks
  // ----------------------------------------------------------------
  if (!campaignId || !affiliateId) {
    return <div>Missing campaignId or affiliateId in the URL.</div>;
  }
  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }
  if (loading || contractLoading) {
    return <div>Loading...</div>;
  }
  if (contractError) {
    return <div style={{ color: 'red' }}>Contract error: {contractError}</div>;
  }

  // If neither DB nor chain data is found
  const notFound = !affiliateUser && !affiliateChainData;
  if (notFound) {
    return <div>Affiliate data not found in DB or on-chain.</div>;
  }

  // 11) Show affiliate state (0=pending, 1=active, else unknown)
  const affiliateState = affiliateChainData?.state ?? -1n;
  let stateDisplay;
  if (affiliateState === 0n) {
    stateDisplay = <span style={{ color: 'red' }}>Pending Approval</span>;
  } else if (affiliateState === 1n) {
    stateDisplay = <span style={{ color: 'green' }}>Active</span>;
  } else {
    stateDisplay = `Unknown State #${affiliateState.toString()}`;
  }

  // 12) If campaign is private => advertiser can Approve/Remove
  const isPrivate = onChainData?.campaignDetails?.isPublicCampaign === false;
  const advertiserApprovesWithdraws =
    onChainData?.campaignDetails?.requiresAdvertiserApprovalForWithdrawl === true;

  const showApproveButton = isUserAdvertiser && isPrivate && affiliateState === 0n;
  const showRemoveButton = isUserAdvertiser && isPrivate;
  const showWithdrawButton = isUserTheAffiliate;

  // 13) Build affiliate link
  const affiliateLink = `https://t.me/${import.meta.env.VITE_TON_AFFILIATES_BOT}/?start=${campaignId}_${affiliateId}`;
  function copyLink() {
    navigator.clipboard.writeText(affiliateLink).then(() => {
      alert('Affiliate link copied to clipboard!');
    });
  }

  return (
    <div style={{ margin: '1rem' }}>
      <h1>
        Affiliate #{affiliateId} for Campaign #{campaignId}
      </h1>

      {/* DB affiliate user info */}
      {affiliateUser ? (
        <section style={{ marginBottom: '2rem' }}>
          <h2>User Info</h2>
          <p><strong>User ID:</strong> {affiliateUser.id}</p>
          <p><strong>First Name:</strong> {affiliateUser.firstName}</p>
          <p><strong>Last Name:</strong> {affiliateUser.lastName}</p>
          <p><strong>Telegram Username:</strong> {affiliateUser.telegramUsername}</p>
          {affiliateUser.photoUrl && (
            <img
              src={affiliateUser.photoUrl}
              alt="Affiliate Avatar"
              style={{ width: '100px', height: '100px', objectFit: 'cover' }}
            />
          )}
        </section>
      ) : (
        <p>No DB affiliate user found.</p>
      )}

      {/* On-chain affiliate data */}
      {affiliateChainData ? (
        <section style={{ marginBottom: '2rem' }}>
          <h2>On-Chain Data</h2>
          <p><strong>Address:</strong> {affiliateChainData.affiliate.toString()}</p>
          <p><strong>State:</strong> {stateDisplay}</p>

          {advertiserApprovesWithdraws && (
            <p>
              <strong>Pending Approval Earnings:</strong>{' '}
              {affiliateChainData.pendingApprovalEarnings.toString()}
            </p>
          )}

          <p>
            <strong>Total Earnings (all-time):</strong>{' '}
            {fromNano(affiliateChainData.totalEarnings)}
          </p>

          <p>
            <strong>Withdraw Earnings:</strong> {fromNano(affiliateChainData.withdrawEarnings)}{' '}
            {showWithdrawButton && (
              <button onClick={handleWithdrawEarnings} style={{ marginLeft: '1rem' }}>
                Withdraw Now
              </button>
            )}
          </p>

          {/* Advertiser Management */}
          {(showApproveButton || showRemoveButton) && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Management</h3>
              {showApproveButton && (
                <button style={{ marginRight: '1rem' }} onClick={handleApprove}>
                  Approve Affiliate
                </button>
              )}
              {showRemoveButton && (
                <button onClick={handleRemove}>Remove Affiliate</button>
              )}
            </div>
          )}

          {/* If affiliate is active, show an affiliate link */}
          {affiliateState === 1n && (
            <div style={{ marginTop: '2rem' }}>
              <h3>Affiliate Link</h3>
              <p>
                <a href={affiliateLink} target="_blank" rel="noopener noreferrer">
                  {affiliateLink}
                </a>
              </p>
              <button onClick={copyLink} style={{ marginTop: '0.5rem' }}>
                Copy Link
              </button>
            </div>
          )}

          {/* Stats */}
          <div style={{ marginTop: '1rem' }}>
            <h3>User Actions Stats</h3>
            {renderUserActionStats(affiliateChainData.userActionsStats)}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <h3>Premium User Actions Stats</h3>
            {renderUserActionStats(affiliateChainData.premiumUserActionsStats)}
          </div>
        </section>
      ) : (
        <p>No on-chain data found for this affiliate.</p>
      )}
    </div>
  );
}
