import React, { useEffect, useState } from 'react';
import { CampaignApiResponse } from '@common/ApiResponses';
import { TelegramCategory } from '../models/Models';
// import { useNavigate } from 'react-router-dom';
import CampaignCard from './CampaignCard';

const PAGE_SIZE = 20;

const CampaignMarketplace: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignApiResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [category, setCategory] = useState<TelegramCategory | ''>('');
  const [page, setPage] = useState<number>(0);
//   const navigate = useNavigate();

  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      try {
        const offset = page * PAGE_SIZE;
        const params = new URLSearchParams();
        params.append('offset', String(offset));
        params.append('limit', String(PAGE_SIZE));
        if (category) params.append('category', category);

        const res = await fetch(`/api/v1/campaigns/marketplace?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to load campaigns: ${res.status}`);
        const data = await res.json();
        setCampaigns(data);
      } catch (err) {
        console.error('Failed to load marketplace campaigns:', err);
        alert(`Error: ${String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [category, page]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat as TelegramCategory);
    setPage(0); // Reset to first page when changing category
  };

  return (
    <div
      className="screen-container"
      style={{
        maxWidth: '100%',
        padding: '2rem',
      }}
    >
      <h2>Campaign Marketplace</h2>

      {/* Category Filter */}
      <div style={{ marginBottom: '1rem' }}>
        <label>
          Filter by Category:
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="">All</option>
            {Object.values(TelegramCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
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
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              marginTop: '2rem',
            }}
          >
            <button
              className="nav-button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              className="nav-button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={campaigns.length < PAGE_SIZE}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CampaignMarketplace;
