import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Dictionary, Address } from '@ton/core';

import { useCampaignContract } from '../hooks/useCampaignContract';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';

import { advertiserRemoveAffiliate } from '../blockchain/campaign/advertiserRemoveAffiliate';
import { advertiserApproveAffiliate } from '../blockchain/campaign/advertiserApproveAffiliate';
import { affiliateWithdrawEarnings } from '../blockchain/campaign/affiliateWithdrawEarnings';

import { AffiliateData, CampaignData, UserActionStats } from '../contracts/Campaign';
import { CampaignApiResponse, UserApiResponse } from '../models/apiResponses';

import { BOT_ACTION_LABELS } from '@common/constants';

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
      .then((data) => setCampaign(data))
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

        const cData = await campaignContract!.getCampaignData();
        setOnChainData(cData);
      } catch (err: any) {
        console.error('Error loading affiliate data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [campaignId, affiliateId, campaignContract]);

  const isUserAdvertiser = useMemo(() => {
    if (!userAccount?.address || !advertiserAddr) return false;
    return userAccount.address.toLowerCase() === advertiserAddr.toLowerCase();
  }, [userAccount?.address, advertiserAddr]);

  const isUserTheAffiliate = useMemo(() => {
    if (!userAccount?.address || !affiliateChainData) return false;
    try {
      const userAddrParsed = Address.parse(userAccount.address).toString();
      const affAddrParsed = affiliateChainData.affiliate.toString();
      return userAddrParsed === affAddrParsed;
    } catch {
      return false;
    }
  }, [userAccount?.address, affiliateChainData]);

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

  function renderUserActionStats(dict?: Dictionary<bigint, UserActionStats>) {
    if (!dict) return null;
    const entries: JSX.Element[] = [];
    for (const key of dict.keys()) {
      const stats = dict.get(key);
      if (!stats) continue;
  
      // Use BOT_ACTION_LABELS to get a friendly name
      const actionLabel = BOT_ACTION_LABELS.get(key) ?? `Unknown Action (#${key.toString()})`;
  
      entries.push(
        <div key={key.toString()} style={{ marginBottom: '0.5rem' }}>
          <strong>{actionLabel}:</strong>
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

  /** 
   *  We'll display the state in color:
   *    - 'Pending Approval' = red
   *    - 'Active' = green
   *    - Otherwise fallback to affiliateState
   */
  let stateDisplay;
  if (affiliateState === 0n) {
    stateDisplay = <span style={{ color: 'red' }}>Pending Approval</span>;
  } else if (affiliateState === 1n) {
    stateDisplay = <span style={{ color: 'green' }}>Active</span>;
  } else {
    // Fallback for unexpected states
    stateDisplay = `Unknown State #${affiliateState.toString()}`;
  }

  const isPrivate = onChainData?.campaignDetails?.isPublicCampaign === false;
  const advertiserApprovesWithdraws =
    onChainData?.campaignDetails?.requiresAdvertiserApprovalForWithdrawl === true;

  const showApproveButton = isUserAdvertiser && isPrivate && affiliateState === 0n;
  const showRemoveButton = isUserAdvertiser && isPrivate;
  const showWithdrawButton = isUserTheAffiliate;

  const affiliateLink = `https://${import.meta.env.VITE_TON_AFFILIATES_VERIFIER_BOT}/${campaignId}_${affiliateId}`;

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

      {affiliateUser ? (
        <section style={{ marginBottom: '2rem' }}>
          <h2>User Info</h2>
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

      {affiliateChainData ? (
        <section style={{ marginBottom: '2rem' }}>
          <h2>On-Chain Data</h2>
          <p>
            <strong>Address:</strong> {affiliateChainData.affiliate.toString()}
          </p>
          <p>
            <strong>State:</strong> {stateDisplay}
          </p>

          {advertiserApprovesWithdraws && (
            <p>
              <strong>Pending Approval Earnings:</strong>{' '}
              {affiliateChainData.pendingApprovalEarnings.toString()}
            </p>
          )}

          <p>
            <strong>Total Earnings (all-time):</strong>{' '}
            {affiliateChainData.totalEarnings.toString()}
          </p>

          <p>
            <strong>Withdraw Earnings:</strong> {affiliateChainData.withdrawEarnings.toString()}{' '}
            {showWithdrawButton && (
              <button onClick={handleWithdrawEarnings} style={{ marginLeft: '1rem' }}>
                Withdraw Now
              </button>
            )}
          </p>

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
