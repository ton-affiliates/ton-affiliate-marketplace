// src/components/AllAffiliatesPage.tsx
import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Dictionary, Address, fromNano } from '@ton/core';

import { useCampaignContract } from '../hooks/useCampaignContract';
import { advertiserApproveAffiliate } from '../blockchain/advertiserApproveAffiliate';
import { advertiserRemoveAffiliate } from '../blockchain/advertiserRemoveAffiliate';
import { AffiliateData, CampaignData } from '../contracts/Campaign';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useTonWalletConnect } from '../hooks/useTonConnect';
import { CampaignRoleApiResponse } from '@common/ApiResponses';

/** 1) DB call: fetch paged affiliates */
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
  return await resp.json();
}

/** 2) DB call: fetch the campaign => campaign.campaignContractAddress */
async function fetchCampaign(campaignId: string) {
  const resp = await fetch(`/api/v1/campaigns/${campaignId}`);
  if (!resp.ok) {
    throw new Error(`Failed to load campaign from DB. Status: ${resp.status}`);
  }
  return resp.json();
}

export function AllAffiliatesPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // The campaign’s *string* address from DB
  const [campaignContractAddress, setCampaignContractAddress] = useState<string | undefined>();

  // On-chain data (has advertiser: Address)
  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);

  // DB + chain affiliate data (using string keys for DB map)
  const [dbMap, setDbMap] = useState<Map<string, CampaignRoleApiResponse>>(new Map());
  const [chainMap, setChainMap] = useState<Record<string, AffiliateData>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();

  // 1) Validate
  if (!campaignId) {
    return (
      <div style={{ color: 'red', margin: '1rem' }}>
        <h1>Missing campaignId in URL</h1>
      </div>
    );
  }

  // 2) On mount, fetch from DB => get campaignContractAddress
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const dbCampaign = await fetchCampaign(campaignId);
        console.log('[AllAffiliatesPage] DB campaign =>', dbCampaign);
        setCampaignContractAddress(dbCampaign.contractAddress); // a string
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignId]);

  // 3) Use the contract hook with campaignContractAddress
  const {
    campaignContract,
    isLoading: contractLoading,
    error: contractError
  } = useCampaignContract(campaignContractAddress);

  // 4) Once we have the contract, fetch on-chain data
  useEffect(() => {
    if (!campaignContract) return;
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const cData = await campaignContract.getCampaignData();
        console.log('[AllAffiliatesPage] onChainData =>', cData);
        setOnChainData(cData);

        // fetch affiliates in offset..limit from chain
        const fromIdx = BigInt(offset);
        const toIdx = BigInt(offset + limit - 1);
        const dict: Dictionary<bigint, AffiliateData> =
          await campaignContract.getAffiliatesDataInRange(fromIdx, toIdx);

        const chainObj: Record<string, AffiliateData> = {};
        for (const key of dict.keys()) {
          const data = dict.get(key);
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

  // 5) Also fetch the DB affiliates for offset..limit
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const roles = await fetchPagedAffiliates(campaignId, offset, limit);
        console.log('[AllAffiliatesPage] Roles from DB =>', roles);

        const newMap = new Map<string, CampaignRoleApiResponse>();
        for (const role of roles) {
          if (role.affiliateId !== null && role.affiliateId !== undefined) {
            newMap.set(String(role.affiliateId), role);
          }
        }
        setDbMap(newMap);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignId, offset, limit]);

  // 6) isUserAdvertiser => compare user address with onChainData.advertiser (Address)
  const isUserAdvertiser = useMemo(() => {
    if (!userAccount?.address || !onChainData?.advertiser) return false;
    try {
      const userAddrStr = Address.parse(userAccount.address).toString(); // normalize
      const advAddrStr = onChainData.advertiser.toString(); // from Address to string
      return userAddrStr === advAddrStr;
    } catch {
      return false;
    }
  }, [userAccount?.address, onChainData?.advertiser]);

  // Determine if this is a private campaign.
  // Modified so that if campaignDetails.isPublicCampaign is not explicitly true, we assume it is private.
  const isPrivate = onChainData?.campaignDetails?.isPublicCampaign !== true;

  // Approve / Remove
  async function handleApprove(affId: number) {
    if (!campaignContract || !sender) {
      alert('Not ready to approve affiliate. Missing contract or sender.');
      return;
    }
    try {
      await advertiserApproveAffiliate(campaignContract, BigInt(affId), sender);
      alert(`Approved affiliate ID: ${affId}`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to approve affiliate: ${String(err)}`);
    }
  }

  async function handleRemove(affId: number) {
    if (!campaignContract || !sender) {
      alert('Not ready to remove affiliate. Missing contract or sender.');
      return;
    }
    try {
      await advertiserRemoveAffiliate(campaignContract, BigInt(affId), sender);
      alert(`Removed affiliate ID: ${affId}`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to remove affiliate: ${String(err)}`);
    }
  }

  // If there's an error
  if (error) {
    return (
      <div style={{ margin: '1rem', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  const loadingState = loading || contractLoading;

  // If still loading and we don't have onChainData yet => show a message
  if (loadingState && !onChainData) {
    return <p style={{ margin: '1rem' }}>Loading data...</p>;
  }

  // Merge DB + chain affiliates by converting DB keys (strings) to numbers.
  const allAffIds = new Set<number>([
    ...Array.from(dbMap.keys()).map((idStr) => Number(idStr)),
    ...Object.keys(chainMap).map((k) => Number(k)),
  ]);
  const sortedAffIds = Array.from(allAffIds).sort((a, b) => a - b);

  // Compute a flag to indicate if at least one affiliate row will have a manage action.
  const hasManageActions = sortedAffIds.some((affId) => {
    const chainItem = chainMap[String(affId)] || null;
    const showApprove = isUserAdvertiser && isPrivate && chainItem?.state === 0n;
    const showRemove = isUserAdvertiser && isPrivate;
    return showApprove || showRemove;
  });

  return (
    <div style={{ margin: '1rem' }}>
      <h1>All Affiliates for Campaign #{campaignId}</h1>
      {contractError && <p style={{ color: 'red' }}>{contractError}</p>}

      {/* Table of affiliates */}
      {!loadingState && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Affiliate ID</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>DB Info</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>On-chain Earnings</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>State</th>
              {hasManageActions && (
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Manage</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedAffIds.map((affId) => {
              // Look up using string keys
              const dbRec = dbMap.get(String(affId)) || null;
              const chainItem = chainMap[String(affId)] || null;

              let stateLabel = 'Unknown';
              if (chainItem?.state === 0n) stateLabel = 'Pending Approval';
              if (chainItem?.state === 1n) stateLabel = 'Active';

              const totalEarnings = chainItem ? fromNano(chainItem.totalEarnings) : 'N/A';
              const affLink = `/campaign/${campaignId}/affiliate/${affId}`;

              // Show approve only if the affiliate is pending (state 0) and this is a private campaign.
              const showApprove = isUserAdvertiser && isPrivate && chainItem?.state === 0n;
              // Remove button should always show for a private campaign if the current user is the advertiser.
              const showRemove = isUserAdvertiser && isPrivate;

              return (
                <tr key={affId}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <Link to={affLink}>{affId}</Link>
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
                  {hasManageActions && (
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                      {showApprove && (
                        <button style={{ marginRight: '0.5rem' }} onClick={() => handleApprove(affId)}>
                          Approve
                        </button>
                      )}
                      {showRemove && (
                        <button onClick={() => handleRemove(affId)}>
                          Remove
                        </button>
                      )}
                    </td>
                  )}
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
          Showing {dbMap.size} DB affiliates (offset={offset}, limit={limit})
        </span>
      </div>
    </div>
  );
}
