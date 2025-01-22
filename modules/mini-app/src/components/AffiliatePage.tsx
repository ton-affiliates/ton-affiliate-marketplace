import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Dictionary } from '@ton/core';
import { useCampaignContract } from '../hooks/useCampaignContract';

import { advertiserRemoveAffiliate } from '../blockchain/campaign/advertiserRemoveAffiliate';
import { advertiserApproveAffiliate } from '../blockchain/campaign/advertiserApproveAffiliate';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';

// ---------- Types from your code -----------
import { AffiliateData, CampaignData, UserActionStats } from '../contracts/Campaign';
import { CampaignApiResponse, UserApiResponse } from '../models/models';

async function fetchSingleAffiliate(campaignId: string, affiliateId: string): Promise<UserApiResponse> {
  const resp = await fetch(`/api/v1/campaign-roles/affiliates/${campaignId}/${affiliateId}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch affiliate. Status ${resp.status}`);
  }
  return (await resp.json()) as UserApiResponse;
}

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

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    fetchCampaign(campaignId)
      .then((data) => {
        setCampaign(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const advertiserAddr = campaign?.advertiserAddress;
  const campaignIdBig = campaign?.id ? BigInt(campaign.id) : undefined;

  const {
    campaignContract,
    isLoading: contractLoading,
    error: contractError,
  } = useCampaignContract(advertiserAddr, campaignIdBig);

  useEffect(() => {
    if (!campaignId || !affiliateId || !campaignContract) return;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const dbUser = await fetchSingleAffiliate(campaignId!, affiliateId!);
        setAffiliateUser(dbUser);

        const affIdBn = BigInt(affiliateId!);
        const chainData = await campaignContract!.getAffiliateData(affIdBn);
        setAffiliateChainData(chainData);

        const data = await campaignContract!.getCampaignData();
        setOnChainData(data);
      } catch (err: any) {
        console.error('Error loading affiliate data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [campaignId, affiliateId, campaignContract]);

  // Are we the advertiser?
  const isUserAdvertiser = useMemo(() => {
    if (!userAccount?.address || !advertiserAddr) return false;
    return userAccount.address.toLowerCase() === advertiserAddr.toLowerCase();
  }, [userAccount?.address, advertiserAddr]);

  // Handlers
  async function handleApprove() {
    if (!affiliateId) return;
    if (!campaignContract || !sender) {
      alert('Not ready to approve affiliate. Missing contract or sender.');
      return;
    }
    try {
      await advertiserApproveAffiliate(campaignContract, BigInt(affiliateId), sender);
      alert(`Approved affiliate ID: ${affiliateId}`);
      // Optionally re-fetch chain data
    } catch (err) {
      console.error(err);
      alert(`Failed to approve affiliate: ${String(err)}`);
    }
  }

  async function handleRemove() {
    if (!affiliateId) return;
    if (!campaignContract || !sender) {
      alert('Not ready to remove affiliate. Missing contract or sender.');
      return;
    }
    try {
      await advertiserRemoveAffiliate(campaignContract, BigInt(affiliateId), sender);
      alert(`Removed affiliate ID: ${affiliateId}`);
      // Optionally re-fetch chain data
    } catch (err) {
      console.error(err);
      alert(`Failed to remove affiliate: ${String(err)}`);
    }
  }

  function renderUserActionStats(dict?: Dictionary<bigint, UserActionStats>) {
    if (!dict) return null;

    const entries: JSX.Element[] = [];
    for (const key of dict.keys()) {
      const stats = dict.get(key);
      if (!stats) continue;

      entries.push(
        <div key={key.toString()} style={{ marginBottom: '0.5rem' }}>
          <strong>OpCode {key.toString()}:</strong>
          <div style={{ marginLeft: '1rem' }}>
            numActions: {stats.numActions.toString()}
            <br />
            lastUserActionTimestamp: {stats.lastUserActionTimestamp.toString()}
          </div>
        </div>
      );
    }
    return <div>{entries}</div>;
  }

  // Render
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

  const notFound = !affiliateUser && !affiliateChainData;
  if (notFound) {
    return <div>Affiliate data not found in DB or on-chain.</div>;
  }

  const affiliateState = affiliateChainData?.state ?? -1n;
  let stateLabel = affiliateState.toString();
  if (affiliateState === 0n) stateLabel = 'Pending Approval';
  if (affiliateState === 1n) stateLabel = 'Active';

  const isPrivate = onChainData!.campaignDetails.isPublicCampaign === false; 

  const showApproveButton =
    isUserAdvertiser && isPrivate && affiliateState === 0n;
  const showRemoveButton =
    isUserAdvertiser && isPrivate;

  return (
    <div style={{ margin: '1rem' }}>
      <h1>
        Affiliate #{affiliateId} for Campaign #{campaignId}
      </h1>

      <div style={{ marginBottom: '1rem' }}>
        <Link to={`/campaign/${campaignId}/affiliates`}>&larr; Back to All Affiliates</Link>
      </div>

      {/* DB user info */}
      {affiliateUser ? (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Affiliate User Info (DB)</h2>
          <p>
            <strong>User ID:</strong> {affiliateUser.id}
          </p>
          <p>
            <strong>First Name:</strong> {affiliateUser.firstName}
          </p>
          <p>
            <strong>Last Name:</strong> {affiliateUser.lastName}
          </p>
          <p>
            <strong>Telegram Username:</strong> {affiliateUser.telegramUsername}
          </p>
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
          <h2>Affiliate On-Chain Data</h2>
          <p>
            <strong>Affiliate Address:</strong> {affiliateChainData.affiliate.toString()}
          </p>
          <p>
            <strong>State:</strong> {stateLabel}
          </p>
          <p>
            <strong>Pending Approval Earnings:</strong>{' '}
            {affiliateChainData.pendingApprovalEarnings.toString()}
          </p>
          <p>
            <strong>Total Earnings:</strong> {affiliateChainData.totalEarnings.toString()}
          </p>
          <p>
            <strong>Withdraw Earnings:</strong> {affiliateChainData.withdrawEarnings.toString()}
          </p>

          {/* Approve/Remove Buttons */}
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
