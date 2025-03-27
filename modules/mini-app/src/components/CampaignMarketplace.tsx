// ✅ CampaignMarketplace.tsx
import React, { useEffect, useState } from 'react';
import { CampaignApiResponse } from '@common/ApiResponses';
import { TelegramCategory } from '../models/Models';
import CampaignCard from './CampaignCard';
import { CampaignData } from '../contracts/Campaign';

export type EnrichedCampaign = CampaignApiResponse;

type SortOption = 'affiliates' | 'cpa' | 'actions' | 'balance';

const PAGE_LIMIT = 100;
const FRONT_PAGE_SIZE = 20;

const CampaignMarketplace: React.FC = () => {
  const [campaigns, setCampaigns] = useState<EnrichedCampaign[]>([]);
  const [onChainMap, setOnChainMap] = useState<Record<string, CampaignData>>({});
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [category, setCategory] = useState<TelegramCategory | ''>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption | ''>('');

  useEffect(() => {
    loadCampaigns(true);
  }, [category]);

  const loadCampaigns = async (reset: boolean = false) => {
    reset ? setLoading(true) : setIsFetchingMore(true);
    try {
      const params = new URLSearchParams();
      params.append('offset', String(reset ? 0 : offset));
      params.append('limit', String(PAGE_LIMIT));
      if (category) params.append('category', category);

      const res = await fetch(`/api/v1/campaigns/marketplace?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load campaigns: ${res.status}`);
      const baseData: CampaignApiResponse[] = await res.json();

      setCampaigns(prev => reset ? baseData : [...prev, ...baseData]);
      setOffset(prev => reset ? PAGE_LIMIT : prev + PAGE_LIMIT);
      setHasMore(baseData.length === PAGE_LIMIT);
      if (reset) setCurrentPage(0);
    } catch (err) {
      console.error('Failed to load marketplace campaigns:', err);
      alert(`Error: ${String(err)}`);
    } finally {
      reset ? setLoading(false) : setIsFetchingMore(false);
    }
  };

  const handleOnChainDataLoad = (id: string, data: CampaignData) => {
    setOnChainMap(prev => ({ ...prev, [id]: data }));
  };

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const aData = onChainMap[a.id];
    const bData = onChainMap[b.id];
    if (!aData || !bData) return 0;

    switch (sortOption) {
      case 'affiliates':
        return Number(bData.numAffiliates) - Number(aData.numAffiliates);
      case 'cpa':
        return Number(bData.maxCpaValue) - Number(aData.maxCpaValue);
      case 'actions':
        return Number(bData.numUserActions) - Number(aData.numUserActions);
      case 'balance':
        return Number(bData.campaignBalance) - Number(aData.campaignBalance);
      default:
        return 0;
    }
  });

  const pagedCampaigns = sortedCampaigns.slice(
    currentPage * FRONT_PAGE_SIZE,
    (currentPage + 1) * FRONT_PAGE_SIZE
  );

  return (
    <div className="screen-container" style={{ maxWidth: '100%', padding: '2rem' }}>
      <h2>Campaign Marketplace</h2>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <label>
          Category:
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TelegramCategory)}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="">All</option>
            {Object.values(TelegramCategory).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>

        <label>
          Sort by:
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} style={{ marginLeft: '0.5rem' }}>
            <option value="">None</option>
            <option value="affiliates">Num Affiliates</option>
            <option value="cpa">Max CPA</option>
            <option value="actions">User Actions</option>
            <option value="balance">Campaign Balance</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div>Loading campaigns...</div>
      ) : pagedCampaigns.length === 0 ? (
        <div>No campaigns found.</div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
              gap: '2rem',
              justifyContent: 'center',
              width: '100%',
              marginTop: '1.5rem',
            }}
          >
            {pagedCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onOnChainDataLoad={handleOnChainDataLoad}
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button
              className="nav-button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
            >
              Previous
            </button>
            <span>Page {currentPage + 1}</span>
            <button
              className="nav-button"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={(currentPage + 1) * FRONT_PAGE_SIZE >= sortedCampaigns.length}
            >
              Next
            </button>
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                className="custom-button"
                onClick={() => loadCampaigns(false)}
                disabled={isFetchingMore}
              >
                {isFetchingMore ? 'Loading more...' : 'Load More Campaigns'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CampaignMarketplace;
