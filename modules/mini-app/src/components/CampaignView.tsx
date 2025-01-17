// src/components/CampaignView.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

/**
 * The shape of data that your server returns for `/api/v1/campaigns/:id`.
 * Add or remove fields as needed to match your backend's shape.
 */
interface CampaignData {
  id: string;
  walletAddress: string;
  assetType?: string;
  assetName?: string;
  assetCategory?: string;
  assetTitle?: string;
  assetDescription?: string;
  inviteLink?: string;
  createdAt?: string;
  updatedAt?: string;
}

function CampaignView() {
  console.log('[CampaignView] top-level render');
  
  const { id } = useParams<{ id: string }>(); // e.g. /campaign/123
  console.log('[CampaignView] useParams => id:', id);

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    console.log('[CampaignView] useEffect triggered, checking id...');
    if (!id) {
      console.warn('[CampaignView] No campaign ID in URL!');
      setError('No campaign ID in the URL!');
      setLoading(false);
      return;
    }

    async function fetchCampaign() {
      try {
        console.log(`[CampaignView] Attempting fetch => /api/v1/campaigns/${id}`);
        const response = await fetch(`/api/v1/campaigns/${id}`, {
          // If you need credentials or headers, add them:
          // credentials: 'include',
          // headers: { 'Authorization': `Bearer ...` },
        });

        console.log(`[CampaignView] fetch status = ${response.status}`);
        if (!response.ok) {
          // e.g. 401, 404, 500
          throw new Error(
            `Fetch failed for campaign ${id}: Status ${response.status} - ${response.statusText}`
          );
        }

        const data: CampaignData = await response.json();
        console.log('[CampaignView] fetch result data =>', data);

        setCampaign(data);
      } catch (err: any) {
        console.error('[CampaignView] Error in fetchCampaign:', err);
        setError(err.message || 'Unknown error fetching campaign');
      } finally {
        setLoading(false);
      }
    }

    // Actually call the fetch function
    fetchCampaign();
  }, [id]);

  // Render states
  if (loading) {
    console.log('[CampaignView] STILL LOADING...');
    return <div>Loading campaign data...</div>;
  }

  if (error) {
    console.log('[CampaignView] ERROR encountered =>', error);
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  // If we’re done loading but have no campaign, show a fallback
  if (!campaign) {
    console.log('[CampaignView] No campaign data was returned...');
    return <div>No campaign found.</div>;
  }

  console.log('[CampaignView] rendering final output for campaign:', campaign);

  return (
    <div style={{ margin: '2rem' }}>
      <h1>Campaign Page for ID: {campaign.id}</h1>
      <p>
        <strong>Wallet Address:</strong> {campaign.walletAddress}
      </p>
      <p>
        <strong>Asset Type:</strong> {campaign.assetType}
      </p>
      <p>
        <strong>Title:</strong> {campaign.assetTitle}
      </p>
      <p>
        <strong>Description:</strong> {campaign.assetDescription}
      </p>
      <p>
        <strong>Invite Link:</strong> {campaign.inviteLink}
      </p>
      {/* If you want, you can show creation date, photo, etc. */}
      <p style={{ color: 'gray', fontSize: '0.9em' }}>
        Created At: {campaign.createdAt} &nbsp; | &nbsp; Updated At: {campaign.updatedAt}
      </p>
    </div>
  );
}

export default CampaignView;
