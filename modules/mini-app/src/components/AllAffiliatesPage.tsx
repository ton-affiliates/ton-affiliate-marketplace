import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useCampaignContract } from '../hooks/useCampaignContract';

// On-chain affiliate data type
import { AffiliateData, CampaignData } from '../contracts/Campaign';
import { advertiserRemoveAffiliate } from '../blockchain/campaign/advertiserRemoveAffiliate';
import { advertiserApproveAffiliate } from '../blockchain/campaign/advertiserApproveAffiliate';

// Suppose you have a hook or context providing userAccount
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';

// Sample models from your code
import { CampaignApiResponse, UserApiResponse } from '../models/models';

/**
 * Inline function to fetch paged affiliates from your server API.
 * e.g. GET /api/v1/campaign-roles/affiliates/paged/:campaignId?offset=X&limit=Y
 */
async function fetchPagedAffiliates(
  campaignId: string,
  offset: number,
  limit: number
): Promise<UserApiResponse[]> {
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const resp = await fetch(`/api/v1/campaign-roles/affiliates/paged/${campaignId}?${query}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch affiliates. Status ${resp.status}`);
  }
  return (await resp.json()) as UserApiResponse[];
}

/**
 * Displays all affiliates for a given campaign (paged),
 * combining data from both the DB and the blockchain.
 *
 * Also shows "Approve Affiliate" (for state=0) and "Remove Affiliate" 
 * for the campaign's advertiser (private campaigns only).
 */
export function AllAffiliatesPage() {
  // 1) Read the campaignId from the URL
  const { campaignId } = useParams<{ campaignId: string }>();

  // 2) Query params for offset & limit
  const [searchParams, setSearchParams] = useSearchParams();
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // 3) Local state
  const [campaign, setCampaign] = useState<CampaignApiResponse | null>(null);
  const [affiliates, setAffiliates] = useState<UserApiResponse[]>([]);
  const [chainData, setChainData] = useState<AffiliateData[]>([]);
  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);

  // Basic loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // from TonConnect to sign transactions
  const { userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();

  // 4) Fetch the campaign from the server
  useEffect(() => {
    if (!campaignId) return;

    async function fetchCampaign() {
      try {
        setLoading(true);
        setError(null);

        const resp = await fetch(`/api/v1/campaigns/${campaignId}`);
        if (!resp.ok) {
          throw new Error(`Error fetching campaign. Status ${resp.status}`);
        }
        const data: CampaignApiResponse = await resp.json();
        setCampaign(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaign();
  }, [campaignId]);

  // 5) Once we have the campaign, set up the on-chain contract
  const advertiserAddr = campaign?.advertiserAddress;
  const campaignIdBig = campaign?.id ? BigInt(campaign.id) : undefined;

  const { campaignContract, isLoading: contractLoading, error: contractError } =
    useCampaignContract(advertiserAddr, campaignIdBig);

  // 6) Load DB affiliates + chain data whenever offset/limit changes (and we have the contract)
  useEffect(() => {
    if (!campaignId || !campaignContract) return;

    async function loadAffiliates() {
      setLoading(true);
      setError(null);

      try {
        // (A) Fetch affiliates from the DB
        const dbAffiliates = await fetchPagedAffiliates(campaignId!, offset, limit);
        setAffiliates(dbAffiliates);

        // (B) On-chain range
        const fromIdx = BigInt(offset);
        const toIdx = BigInt(offset + limit - 1);

        // (C) Fetch on-chain data
        const onChainDataDict = await campaignContract!.getAffiliatesDataInRange(fromIdx, toIdx);
        const chainArray = Object.values(onChainDataDict) as AffiliateData[];
        setChainData(chainArray);

        const data = await campaignContract!.getCampaignData();
        setOnChainData(data);
      } catch (err: any) {
        console.error('Error loading affiliates:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAffiliates();
  }, [campaignId, campaignContract, offset, limit]);

  // 7) Determine if the connected user is the advertiser
  const isUserAdvertiser = useMemo(() => {
    if (!userAccount?.address || !advertiserAddr) return false;
    return userAccount.address.toLowerCase() === advertiserAddr.toLowerCase();
  }, [userAccount?.address, advertiserAddr]);

  // 8) Button handlers
  async function handleApprove(affiliateUserId: number) {
    try {
      if (!campaignContract || !sender) throw new Error('Contract or sender not ready');
      await advertiserApproveAffiliate(campaignContract, BigInt(affiliateUserId), sender);
      alert(`Approved affiliate ID: ${affiliateUserId}`);
      // Possibly re-fetch
    } catch (err) {
      console.error(err);
      alert(`Failed to approve affiliate: ${String(err)}`);
    }
  }

  async function handleRemove(affiliateUserId: number) {
    try {
      if (!campaignContract || !sender) throw new Error('Contract or sender not ready');
      await advertiserRemoveAffiliate(campaignContract, BigInt(affiliateUserId), sender);
      alert(`Removed affiliate ID: ${affiliateUserId}`);
      // Possibly re-fetch
    } catch (err) {
      console.error(err);
      alert(`Failed to remove affiliate: ${String(err)}`);
    }
  }

  // 9) Render
  if (!campaignId) {
    return <div>No campaignId in the URL!</div>;
  }
  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  const loadingState = loading || contractLoading;

  return (
    <div style={{ margin: '1rem' }}>
      <h1>All Affiliates for Campaign #{campaignId}</h1>

      {loadingState && <p>Loading...</p>}
      {contractError && <p style={{ color: 'red' }}>{contractError}</p>}

      {!loadingState && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>User ID</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Name</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>On-Chain Earnings</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>State</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Manage</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((user, idx) => {
              const chainItem = chainData[idx];
              if (!chainItem) {
                // If chainData is shorter or not aligned
                return (
                  <tr key={user.id}>
                    <td colSpan={5} style={{ border: '1px solid #ccc', padding: '8px' }}>
                      <Link to={`/campaign/${campaignId}/affiliate/${user.id}`}>
                        {user.id} - {user.firstName ?? ''} {user.lastName ?? ''}
                      </Link>{' '}
                      (No on-chain data)
                    </td>
                  </tr>
                );
              }

              const affiliateState = chainItem.state ?? -1n;
              let stateLabel = affiliateState.toString();
              if (affiliateState === 0n) stateLabel = 'Pending Approval';
              if (affiliateState === 1n) stateLabel = 'Active';

              const affiliateLink = `/campaign/${campaignId}/affiliate/${user.id}`;
              const showApproveButton =
                affiliateState === 0n &&
                isUserAdvertiser &&
                onChainData?.campaignDetails.isPublicCampaign === false;

              const showRemoveButton =
                isUserAdvertiser && onChainData?.campaignDetails.isPublicCampaign === false;

              return (
                <tr key={user.id}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <Link to={affiliateLink}>{user.id}</Link>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <Link to={affiliateLink}>
                      {user.firstName ?? ''} {user.lastName ?? ''}
                    </Link>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {chainItem.totalEarnings?.toString() || 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {stateLabel}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {showApproveButton && (
                      <button
                        style={{ marginRight: '0.5rem' }}
                        onClick={() => handleApprove(user.id)}
                      >
                        Approve
                      </button>
                    )}
                    {showRemoveButton && (
                      <button onClick={() => handleRemove(user.id)}>Remove</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Pagination controls */}
      <div style={{ marginTop: '1rem' }}>
        <button
          onClick={() => {
            const newOffset = Math.max(offset - limit, 0);
            setSearchParams({ offset: String(newOffset), limit: String(limit) });
          }}
          disabled={offset <= 0 || loadingState}
        >
          Previous
        </button>
        <button
          onClick={() => {
            setSearchParams({ offset: String(offset + limit), limit: String(limit) });
          }}
          disabled={loadingState}
        >
          Next
        </button>
        <span style={{ marginLeft: '1rem' }}>
          Showing {affiliates.length} affiliates (offset={offset}, limit={limit})
        </span>
      </div>
    </div>
  );
}
