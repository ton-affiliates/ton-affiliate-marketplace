// src/components/AllAffiliatesPage.tsx
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

  // DB + chain affiliate data
  const [dbMap, setDbMap] = useState<Map<bigint, CampaignRoleApiResponse>>(new Map());
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
        setCampaignContractAddress(dbCampaign.campaignContractAddress); // a string
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

        const newMap = new Map<bigint, CampaignRoleApiResponse>();
        for (const role of roles) {
          if (role.affiliateId !== null) {
            newMap.set(BigInt(role.affiliateId), role);
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
      const advAddrStr = onChainData.advertiser.toString(); // from `Address => string`
      return userAddrStr === advAddrStr;
    } catch {
      return false;
    }
  }, [userAccount?.address, onChainData?.advertiser]);

  // Approve / Remove
  async function handleApprove(affId: bigint) {
    if (!campaignContract || !sender) {
      alert('Not ready to approve affiliate. Missing contract or sender.');
      return;
    }
    try {
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
      await advertiserRemoveAffiliate(campaignContract, affId, sender);
      alert(`Removed affiliate ID: ${affId.toString()}`);
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

  // Merge DB + chain affiliates
  const allAffIds = new Set<bigint>([
    ...dbMap.keys(),
    ...Object.keys(chainMap).map((k) => BigInt(k)),
  ]);
  const sortedAffIds = Array.from(allAffIds).sort((a, b) => Number(a - b));

  // Check if the campaign is private => advertiser must Approve
  const isPrivate = onChainData?.campaignDetails?.isPublicCampaign === false;

  return (
    <div style={{ margin: '1rem' }}>
      <h1>All Affiliates for Campaign #{campaignId}</h1>
      {contractError && <p style={{ color: 'red' }}>{contractError}</p>}

      {/* Table of affiliates */}
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
              const affLink = `/campaign/${campaignId}/affiliate/${affId.toString()}`;

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
                      <button onClick={() => handleRemove(affId)}>
                        Remove
                      </button>
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
          Showing {dbMap.size} DB affiliates (offset={offset}, limit={limit})
        </span>
      </div>
    </div>
  );
}
