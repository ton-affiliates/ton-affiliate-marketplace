import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Dictionary, Address } from '@ton/core';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { advertiserApproveAffiliate } from '../blockchain/campaign/advertiserApproveAffiliate';
import { advertiserRemoveAffiliate } from '../blockchain/campaign/advertiserRemoveAffiliate';
import { AffiliateData, CampaignData } from '../contracts/Campaign';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';
import { CampaignRoleApiResponse } from '../models/apiResponses';

async function fetchPagedAffiliates(
  campaignId: string,
  offset: number,
  limit: number
): Promise<CampaignRoleApiResponse[]> {
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const resp = await fetch(`/api/v1/campaign-roles/affiliates/paged/${campaignId}?${query}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch affiliates. Status ${resp.status}`);
  }
  const data = await resp.json();
  console.log('[fetchPagedAffiliates] raw data from server:', data);
  return data;
}

export function AllAffiliatesPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const [dbMap, setDbMap] = useState<Map<bigint, CampaignRoleApiResponse>>(new Map());
  const [chainMap, setChainMap] = useState<Record<string, AffiliateData>>({});
  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();

  const campaignIdBig = useMemo<bigint | null>(() => {
    if (!campaignId) return null;
    try {
      return BigInt(campaignId);
    } catch (err) {
      console.error('[AllAffiliatesPage] Invalid campaignId, cannot parse as BigInt:', campaignId);
      return null;
    }
  }, [campaignId]);

  if (!campaignId || campaignIdBig === null) {
    return (
      <div style={{ color: 'red', margin: '1rem' }}>
        <h1>Invalid or missing campaign ID in URL</h1>
      </div>
    );
  }

  // Advertiser address (populated once we fetch the DB campaign or chain data)
  const advertiserAddr = useMemo(() => {
    if (onChainData?.advertiser) {
      return onChainData.advertiser.toString();
    }
    return null;
  }, [onChainData]);

  // 1) fetch advertiserAddress from DB
  useEffect(() => {
    async function fetchAdvertiserAddress() {
      try {
        setLoading(true);
        setError(null);

        console.log('[AllAffiliatesPage] Fetching campaign from DB for ID:', campaignId);
        const resp = await fetch(`/api/v1/campaigns/${campaignId}`);
        if (!resp.ok) {
          throw new Error(`Failed to load campaign from DB. Status: ${resp.status}`);
        }
        const dbCampaign = await resp.json();
        console.log('[AllAffiliatesPage] DB campaign record:', dbCampaign);

        if (!dbCampaign.advertiserAddress) {
          throw new Error('No advertiserAddress in DB campaign data');
        }

        // Construct partial onChainData
        setOnChainData((prev) => ({
          ...prev,
          advertiser: Address.parse(dbCampaign.advertiserAddress),
        } as unknown as CampaignData));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAdvertiserAddress();
  }, [campaignId]);

  // 2) instantiate the contract
  const {
    campaignContract,
    isLoading: contractLoading,
    error: contractError,
  } = useCampaignContract(advertiserAddr || undefined, campaignIdBig);

  // 3) once contract is ready, fetch campaign data + affiliate dictionary
  useEffect(() => {
    if (!campaignContract) {
      console.log('[AllAffiliatesPage] No campaignContract yet, skipping chain fetch');
      return;
    }
    setLoading(true);
    setError(null);

    (async () => {
      try {
        console.log('[AllAffiliatesPage] Fetching getCampaignData() from chain...');
        const cData = await campaignContract.getCampaignData();
        console.log('[AllAffiliatesPage] onChainData =>', cData);
        setOnChainData(cData);

        const fromIdx = BigInt(offset);
        const toIdx = BigInt(offset + limit - 1);
        console.log(
          `[AllAffiliatesPage] Calling getAffiliatesDataInRange(${fromIdx}, ${toIdx})...`
        );
        const dictionary: Dictionary<bigint, AffiliateData> =
          await campaignContract.getAffiliatesDataInRange(fromIdx, toIdx);

        const chainObj: Record<string, AffiliateData> = {};
        for (const key of dictionary.keys()) {
          const data = dictionary.get(key);
          if (data) {
            chainObj[key.toString()] = data;
          }
        }
        console.log('[AllAffiliatesPage] chainMap =>', chainObj);
        setChainMap(chainObj);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignContract, offset, limit]);

  // 4) fetch DB affiliates for the same range
  useEffect(() => {
    console.log('[AllAffiliatesPage] fetchPagedAffiliates => offset:', offset, 'limit:', limit);
    setLoading(true);
    setError(null);

    fetchPagedAffiliates(String(campaignIdBig), offset, limit)
      .then((roles) => {
        console.log('[AllAffiliatesPage] Roles from DB =>', roles);
        const newMap = new Map<bigint, CampaignRoleApiResponse>();
        for (const role of roles) {
          if (role.affiliateId !== null) {
            newMap.set(BigInt(role.affiliateId), role);
          }
        }
        console.log('[AllAffiliatesPage] Built dbMap =>', newMap);
        setDbMap(newMap);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [campaignIdBig, offset, limit]);

  // Check if user is advertiser
  const isUserAdvertiser = useMemo(() => {
    if (!userAccount?.address || !advertiserAddr) {
      return false;
    }
    try {
      const userAddrStr = Address.parse(userAccount.address).toString();
      const advAddrStr = Address.parse(advertiserAddr).toString();
      return userAddrStr === advAddrStr;
    } catch {
      return false;
    }
  }, [userAccount?.address, advertiserAddr]);

  // Approve / Remove
  async function handleApprove(affId: bigint) {
    if (!campaignContract || !sender) {
      alert('Not ready to approve affiliate. Missing contract or sender.');
      return;
    }
    try {
      console.log('[AllAffiliatesPage] Approving affiliate ID:', affId.toString());
      await advertiserApproveAffiliate(campaignContract, affId, sender);
      alert(`Approved affiliate ID: ${affId.toString()}`);
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
      console.log('[AllAffiliatesPage] Removing affiliate ID:', affId.toString());
      await advertiserRemoveAffiliate(campaignContract, affId, sender);
      alert(`Removed affiliate ID: ${affId.toString()}`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to remove affiliate: ${String(err)}`);
    }
  }

  // If there's any error
  if (error) {
    console.error('[AllAffiliatesPage] error =>', error);
    return (
      <div style={{ margin: '1rem', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  const loadingState = loading || contractLoading;

  // Combine IDs
  const allAffIds = new Set<bigint>([
    ...dbMap.keys(),
    ...Object.keys(chainMap).map((k) => BigInt(k)),
  ]);
  const sortedAffIds = Array.from(allAffIds).sort((a, b) => Number(a - b));

  const isPrivate = onChainData?.campaignDetails?.isPublicCampaign === false;

  // Print final data sets before rendering
  console.log('[AllAffiliatesPage] Final chainMap =>', chainMap);
  console.log('[AllAffiliatesPage] Final dbMap =>', dbMap);
  console.log('[AllAffiliatesPage] allAffIds =>', sortedAffIds);

  return (
    <div style={{ margin: '1rem' }}>
      <h1>All Affiliates for Campaign #{campaignIdBig.toString()}</h1>
      {(loadingState || !onChainData) && <p>Loading data...</p>}
      {contractError && <p style={{ color: 'red' }}>{contractError}</p>}

      {/* Table */}
      {!loadingState && onChainData && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Affiliate ID</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>DB Info</th>
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

              const totalEarnings = chainItem ? chainItem.totalEarnings.toString() : 'N/A';
              const affLink = `/campaign/${campaignIdBig.toString()}/affiliate/${affId.toString()}`;

              const showApprove = isUserAdvertiser && isPrivate && chainItem?.state === 0n;
              const showRemove = isUserAdvertiser && isPrivate;

              return (
                <tr key={affId.toString()}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <Link to={affLink}>{affId.toString()}</Link>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {dbRec ? (
                      <>
                        <p>DB ID: {dbRec.id}</p>
                        <p>Wallet: {dbRec.walletAddress}</p>
                      </>
                    ) : (
                      <em style={{ color: '#666' }}>No DB record</em>
                    )}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{totalEarnings}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{stateLabel}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {showApprove && (
                      <button style={{ marginRight: '0.5rem' }} onClick={() => handleApprove(affId)}>
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

      {/* Pagination */}
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
