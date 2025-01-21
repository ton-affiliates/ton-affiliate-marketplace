// src/components/Campaigns.tsx

import { useEffect, useState } from 'react';
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from './UserRoleContext';

interface Campaign {
  id: string;
  campaignName?: string;
  isEmpty: boolean;
  createdAt: string; 
  // any other fields you might have
}

export default function AdvertiserCampaigns() {
  const { userRole } = useUserRole();
  const { userAccount } = useTonConnectFetchContext(); 
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!userAccount || !userAccount!.address) {
      setError('No wallet address found; please connect first.');
      setLoading(false);
      return;
    }

    async function fetchCampaigns() {
      try {
        setLoading(true);
        const roleParam = userRole === 'Advertiser' ? 'advertiser' : 'affiliate';
        const resp = await fetch(`/api/v1/campaigns/byWallet/${userAccount!.address}?role=${roleParam}`);

        if (!resp.ok) {
          throw new Error(`HTTP error ${resp.status} - ${resp.statusText}`);
        }
        const data: Campaign[] = await resp.json();
        
        // Filter out isEmpty campaigns
        let filtered = data.filter(c => !c.isEmpty);

        // Sort by createdAt descending
        filtered.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setCampaigns(filtered);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch campaigns');
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, [userAccount?.address]);

  function handleCampaignClick(campaignId: string) {
    navigate(`/campaign/${campaignId}`);
  }

  if (loading) return <div>Loading your campaigns...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (campaigns.length === 0) return <div>No live campaigns found.</div>;

  return (
    // Use a centered container with a max width
    <div style={{ margin: '1rem auto', maxWidth: '700px' }}>
      <h1 style={{ textAlign: 'center' }}>My Campaigns</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {campaigns.map((c) => (
          <li
            key={c.id}
            onClick={() => handleCampaignClick(c.id)}
            style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '1rem',
              marginBottom: '0.75rem',
              cursor: 'pointer',
              // optionally add a hover effect
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = '#f9f9f9')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <h2 style={{ margin: '0 0 0.5rem' }}>
              {c.campaignName || `(ID: ${c.id})`}
            </h2>
            <p style={{ margin: 0 }}>
              Created At: {new Date(c.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
