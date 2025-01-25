import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { AffiliateData, CampaignData } from '../contracts/Campaign';
import { advertiserRemoveAffiliate } from '../blockchain/campaign/advertiserRemoveAffiliate';
import { advertiserApproveAffiliate } from '../blockchain/campaign/advertiserApproveAffiliate';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';
import { Dictionary } from '@ton/core';

// Suppose your DB returns a structure with affiliateId (e.g. from your own API).
export interface UserAffiliateRecord {
  affiliateId: number;         // The ID that matches on-chain
  id: number;                  // The user ID
  firstName?: string;
  lastName?: string;
  // ... any other DB fields
}

// For demonstration: fetchPagedAffiliates returns an array of user affiliates from the DB.
async function fetchPagedAffiliates(
  campaignId: string,
  offset: number,
  limit: number
): Promise<UserAffiliateRecord[]> {
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const resp = await fetch(`/api/v1/campaign-roles/affiliates/paged/${campaignId}?${query}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch affiliates. Status ${resp.status}`);
  }
  return await resp.json();
}

export function AllAffiliatesPage() {
  const { campaignId } = useParams<{ campaignId: string }>();

  // offset & limit from query params
  const [searchParams, setSearchParams] = useSearchParams();
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // DB affiliates in a map: affiliateId -> DB record
  const [dbMap, setDbMap] = useState<Map<bigint, UserAffiliateRecord>>(new Map());

  // Contract on-chain data in a map: affiliateId -> AffiliateData
  // (uses string-based keys to satisfy React state)
  const [chainMap, setChainMap] = useState<Record<string, AffiliateData>>({});

  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set up Ton
  const { userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();

  // 1) Hook up the campaign contract from ID
  const advertiserAddr = onChainData?.advertiser.toString(); 
  const campaignIdBig = campaignId ? BigInt(campaignId) : undefined;

  const {
    campaignContract,
    isLoading: contractLoading,
    error: contractError,
  } = useCampaignContract(advertiserAddr, campaignIdBig);

  // 2) Fetch the DB affiliates (paged) and store them in a Map
  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);

    fetchPagedAffiliates(campaignId, offset, limit)
      .then((dbAffs) => {
        // Build a map: affiliateId => DB record
        const newMap = new Map<bigint, UserAffiliateRecord>();
        for (const rec of dbAffs) {
          // Convert the numeric affiliateId to bigint
          newMap.set(BigInt(rec.affiliateId), rec);
        }
        setDbMap(newMap);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [campaignId, offset, limit]);

  // 3) Fetch on-chain affiliate data and campaign data in the same range
  useEffect(() => {
    if (!campaignContract || !campaignId) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // We read affiliates in the same offset..limit range
        const fromIdx = BigInt(offset);
        const toIdx = BigInt(offset + limit - 1);

        // getAffiliatesDataInRange => Dictionary<bigint, AffiliateData>
        const dictionary: Dictionary<bigint, AffiliateData> =
          await campaignContract.getAffiliatesDataInRange(fromIdx, toIdx);

        // Convert Dictionary<bigint, AffiliateData> => Record<string, AffiliateData>
        const chainObj: Record<string, AffiliateData> = {};
        for (const key of dictionary.keys()) {
          const data = dictionary.get(key);
          if (data) {
            chainObj[key.toString()] = data;
          }
        }
        setChainMap(chainObj);

        // Also fetch the overall campaign data
        const cData = await campaignContract.getCampaignData();
        setOnChainData(cData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignContract, campaignId, offset, limit]);

  // 4) Check if the user is the advertiser (optional logic)
  const isUserAdvertiser = useMemo(() => {
    if (!userAccount?.address || !advertiserAddr) return false;
    return userAccount.address.toLowerCase() === advertiserAddr.toLowerCase();
  }, [userAccount?.address, advertiserAddr]);

  // 5) Approve/Remove affiliate on-chain
  async function handleApprove(affId: bigint) {
    if (!campaignContract || !sender) {
      alert('Not ready to approve affiliate. Missing contract or sender.');
      return;
    }
    try {
      await advertiserApproveAffiliate(campaignContract, affId, sender);
      alert(`Approved affiliate ID: ${affId.toString()}`);
      // Optionally re-fetch on-chain data here if needed
    } catch (err: any) {
      console.error(err);
      alert(`Failed to approve affiliate: ${String(err)}`);
    }
  }

  async function handleRemove(affId: bigint) {
    if (!campaignContract || !sender) {
      alert('Not ready to remove affiliate. Missing contract or sender.');
      return;
    }
    try {
      await advertiserRemoveAffiliate(campaignContract, affId, sender);
      alert(`Removed affiliate ID: ${affId.toString()}`);
      // Optionally re-fetch on-chain data here if needed
    } catch (err: any) {
      console.error(err);
      alert(`Failed to remove affiliate: ${String(err)}`);
    }
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  const loadingState = loading || contractLoading;

  // Create a combined list of affiliate IDs (union DB + chain)
  const allAffIds = new Set<bigint>([
    ...dbMap.keys(),
    ...Object.keys(chainMap).map((k) => BigInt(k)),
  ]);
  const sortedAffIds = Array.from(allAffIds).sort((a, b) => Number(a - b));

  // Example usage: if the campaign is private, we show 'Approve' / 'Remove' buttons
  const isPrivate = onChainData?.campaignDetails.isPublicCampaign === false;

  return (
    <div style={{ margin: '1rem' }}>
      <h1>All Affiliates for Campaign #{campaignId}</h1>

      {loadingState && <p>Loading...</p>}
      {contractError && <p style={{ color: 'red' }}>{contractError}</p>}

      {!loadingState && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Affiliate ID</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>DB User Info</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>On-chain Earnings</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>State</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Manage</th>
            </tr>
          </thead>
          <tbody>
            {sortedAffIds.map((affId) => {
              const dbRec = dbMap.get(affId) || null;
              const chainItem = chainMap[affId.toString()] || null;

              let stateLabel = 'Unknown';
              if (chainItem?.state === 0n) stateLabel = 'Pending Approval';
              if (chainItem?.state === 1n) stateLabel = 'Active';

              const totalEarnings = chainItem?.totalEarnings?.toString() || 'N/A';
              const affLink = `/campaign/${campaignId}/affiliate/${affId.toString()}`;

              // Only advertisers on private campaigns can Approve/Remove
              const showApprove =
                isUserAdvertiser && isPrivate && chainItem?.state === 0n;
              const showRemove = isUserAdvertiser && isPrivate;

              return (
                <tr key={affId.toString()}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <Link to={affLink}>{affId.toString()}</Link>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {dbRec ? (
                      <>
                        <p>UserID: {dbRec.id}</p>
                        <p>
                          Name: {dbRec.firstName} {dbRec.lastName}
                        </p>
                      </>
                    ) : (
                      <p>(No DB record found for affiliateId={affId.toString()})</p>
                    )}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {totalEarnings}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {chainItem ? stateLabel : '(No chain data)'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {showApprove && (
                      <button
                        style={{ marginRight: '0.5rem' }}
                        onClick={() => handleApprove(affId)}
                      >
                        Approve
                      </button>
                    )}
                    {showRemove && (
                      <button onClick={() => handleRemove(affId)}>Remove</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Simple pagination controls */}
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
          Showing {dbMap.size} DB affiliates (offset={offset}, limit={limit})
        </span>
      </div>
    </div>
  );
}
