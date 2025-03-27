// CampaignCard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fromNano } from '@ton/core';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { CampaignApiResponse } from '@common/ApiResponses';
import { CampaignData } from '../contracts/Campaign';

interface Props {
  campaign: CampaignApiResponse;
  onOnChainDataLoad?: (campaignId: string, data: CampaignData) => void;
}

const formatTimestamp = (timestamp: bigint): string => {
  const num = Number(timestamp);
  if (!num || isNaN(num)) return 'N/A';
  return new Date(num * 1000).toLocaleString();
};

const CampaignCard: React.FC<Props> = ({ campaign, onOnChainDataLoad }) => {
  const navigate = useNavigate();
  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const { campaignContract } = useCampaignContract(campaign.contractAddress);

  useEffect(() => {
    if (!campaignContract) return;

    (async () => {
      try {
        const data = await campaignContract.getCampaignData();
        setOnChainData(data);

        if (onOnChainDataLoad) {
          onOnChainDataLoad(campaign.id, data); // ✅ notify parent
        }
      } catch (err) {
        console.error(`Failed to load on-chain data for campaign ${campaign.id}:`, err);
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignContract]);

  return (
    <div
      className="card"
      onClick={() => navigate(`/campaign/${campaign.id}`)}
      style={{
        padding: '1.5rem',
        border: '1px solid #ccc',
        borderRadius: '10px',
        cursor: 'pointer',
        backgroundColor: '#fff',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9f9f9')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
    >
      <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>
        {campaign.name || '(Unnamed Campaign)'}
      </h3>

      {/* Campaign Section */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h4
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1.05rem',
            borderBottom: '1px solid #ccc',
            paddingBottom: '0.25rem',
          }}
        >
          🎯 <strong>Campaign</strong>
        </h4>

        <p>
          <strong>Contract:</strong>
          <br />
          <code style={{ wordBreak: 'break-word' }}>{campaign.contractAddress}</code>
        </p>

        {loading ? (
          <p style={{ fontStyle: 'italic', color: 'gray' }}>Loading on-chain data...</p>
        ) : onChainData ? (
          <>
            <p>
              <strong>Active:</strong>{' '}
              {onChainData.isCampaignActive ? '✅ Yes' : '❌ No'}
            </p>
            <p>
              <strong>Campaign Balance:</strong>{' '}
              {fromNano(onChainData.campaignBalance)}
            </p>
            <p>
              <strong>Payment Method:</strong>{' '}
              {onChainData.campaignDetails.paymentMethod === 0n ? 'TON' : 'USDT'}
            </p>
            <p>
              <strong>Campaign Start:</strong>{' '}
              {formatTimestamp(onChainData.campaignStartTimestamp)}
            </p>
            <p>
              <strong>Last Action:</strong>{' '}
              {formatTimestamp(onChainData.lastUserActionTimestamp)}
            </p>
            <p>
              <strong>Num Affiliates:</strong>{' '}
              {onChainData.numAffiliates.toString()}
            </p>
            <p>
              <strong>Max CPA:</strong>{' '}
              {fromNano(onChainData.maxCpaValue)}
            </p>
            <p>
              <strong>Number of User Actions:</strong>{' '}
              {onChainData.numUserActions.toString()}
            </p>
          </>
        ) : (
          <p style={{ fontStyle: 'italic', color: 'red' }}>Failed to load campaign data</p>
        )}
      </div>

      {/* Telegram Section */}
      <div>
        <h4
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1.05rem',
            borderBottom: '1px solid #ccc',
            paddingBottom: '0.25rem',
          }}
        >
          📢 <strong>Telegram Asset</strong>
        </h4>
        <p>
          <strong>Invite Link:</strong>{' '}
          <a
            href={campaign.inviteLink}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noreferrer"
          >
            {campaign.inviteLink}
          </a>
        </p>
        <p>
          <strong>Asset Name:</strong> {campaign.assetName || 'N/A'}
        </p>
        <p>
          <strong>Asset Description:</strong> {campaign.assetDescription || 'N/A'}
        </p>
        <p>
          <strong>Asset Type:</strong> {campaign.assetType || 'N/A'}
        </p>
        <p>
          <strong>Category:</strong> {campaign.category || 'N/A'}
        </p>
        <p>
          <strong># Members in Asset:</strong> {campaign.memberCount}
        </p>
      </div>
    </div>
  );
};

export default CampaignCard;
