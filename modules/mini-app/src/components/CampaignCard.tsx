import React, { useEffect, useState } from 'react';
import { CampaignApiResponse } from '@common/ApiResponses';
import { useNavigate } from 'react-router-dom';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { CampaignData } from '../contracts/Campaign';

interface Props {
  campaign: CampaignApiResponse;
}

const formatTimestamp = (timestamp: bigint): string => {
  const num = Number(timestamp);
  if (!num || isNaN(num)) return 'N/A';
  return new Date(num * 1000).toLocaleString();
};

const CampaignCard: React.FC<Props> = ({ campaign }) => {
  const navigate = useNavigate();
  const [onChainData, setOnChainData] = useState<CampaignData | null>(null);
  const [loadingOnChain, setLoadingOnChain] = useState(false);
  const [errorOnChain, setErrorOnChain] = useState<string | null>(null);

  const { campaignContract } = useCampaignContract(campaign.contractAddress);

  useEffect(() => {
    if (!campaignContract) return;

    (async () => {
      setLoadingOnChain(true);
      try {
        const cData = await campaignContract.getCampaignData();
        setOnChainData(cData);
      } catch (err: any) {
        console.error(`Error fetching on-chain data for campaign ${campaign.id}:`, err);
        setErrorOnChain('Failed to load on-chain data');
      } finally {
        setLoadingOnChain(false);
      }
    })();
  }, [campaignContract]);

  return (
    <div
      className="card"
      onClick={() => navigate(`/campaign/${campaign.id}`)}
      style={{
        padding: '1.25rem',
        border: '1px solid #ccc',
        borderRadius: '10px',
        cursor: 'pointer',
        backgroundColor: '#fff',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = '#f9f9f9')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = 'white')
      }
    >
      <h3>{campaign.name || '(Unnamed Campaign)'}</h3>

      <p>
        <strong>Contract:</strong>{' '}
        <code style={{ wordBreak: 'break-word' }}>{campaign.contractAddress}</code>
      </p>

      <p><strong>Asset Name:</strong> {campaign.assetName || 'N/A'}</p>
      <p><strong>Asset Description:</strong> {campaign.assetDescription || 'N/A'}</p>
      <p><strong>Asset Type:</strong> {campaign.assetType || 'N/A'}</p>
      <p><strong>Category:</strong> {campaign.category || 'N/A'}</p>
      <p><strong>Members:</strong> {campaign.memberCount}</p>

      <p>
        <strong>Invite:</strong>{' '}
        <a
          href={campaign.inviteLink}
          onClick={(e) => e.stopPropagation()}
          target="_blank"
          rel="noreferrer"
        >
          {campaign.inviteLink}
        </a>
      </p>

      {/* On-chain Data */}
      <div style={{ marginTop: '1rem' }}>
        <strong>On-Chain Data:</strong>
        {loadingOnChain ? (
          <p>Loading...</p>
        ) : errorOnChain ? (
          <p style={{ color: 'red' }}>{errorOnChain}</p>
        ) : onChainData ? (
          <>
            <p><strong>Campaign Start:</strong> {formatTimestamp(onChainData.campaignStartTimestamp)}</p>
            <p><strong>Last Action:</strong> {formatTimestamp(onChainData.lastUserActionTimestamp)}</p>
            <p><strong>Num Affiliates:</strong> {onChainData.numAffiliates.toString()}</p>
            <p><strong>Max CPA:</strong> {onChainData.maxCpaValue.toString()}</p>
            <p><strong>Active:</strong> {onChainData.isCampaignActive ? 'Yes' : 'No'}</p>
          </>
        ) : (
          <p>No on-chain data.</p>
        )}
      </div>
    </div>
  );
};

export default CampaignCard;
