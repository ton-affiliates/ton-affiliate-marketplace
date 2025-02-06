// useNewCampaignSSE.ts
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Address } from '@ton/core';

function translateRawAddress(rawAddress: {
  workChain: number;
  hash: { type: string; data: number[] };
}): Address {
  const { workChain, hash } = rawAddress;
  const hashBuffer = Buffer.from(hash.data);
  return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
}

/**
 * A custom hook for new campaign creation.
 * This hook connects to the SSE endpoint with a query parameter (e.g. `type=newCampaign`)
 * so that the server sends events for new campaign creation.
 */
export const useNewCampaignSSE = (
  userAccount: { address: string } | null,
  setTxSuccess: React.Dispatch<React.SetStateAction<boolean>>,
  setWaitingForTx: React.Dispatch<React.SetStateAction<boolean>>,
  setTxFailed: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const navigate = useNavigate();
  const lastEventIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Build the SSE endpoint URL for new campaign events.
    let url = `${window.location.origin}/api/sse?type=newCampaign`;
    if (lastEventIdRef.current) {
      url += `&lastEventId=${encodeURIComponent(lastEventIdRef.current)}`;
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('[useNewCampaignSSE] Connected to SSE server');
    };

    es.onmessage = (evt: MessageEvent) => {
      lastEventIdRef.current = evt.lastEventId;
      const message = JSON.parse(evt.data);
      console.log('[useNewCampaignSSE] Received message:', message);

      // Handle CampaignCreatedEvent for new campaigns.
      if (message.type === 'CampaignCreatedEvent') {
        const newCampaignId = BigInt(message.data.campaignId).toString();
        const eventAdvertiser = translateRawAddress(message.data.advertiser).toString();
        const userAddress = userAccount ? Address.parse(userAccount.address).toString() : null;

        if (eventAdvertiser === userAddress) {
          console.log('[useNewCampaignSSE] Received CampaignCreatedEvent for our user:', {
            newCampaignId,
            eventAdvertiser,
            userAddress,
          });
          setTxSuccess(true);
          setWaitingForTx(false);
          setTxFailed(false);

          setTimeout(() => {
            console.log('[useNewCampaignSSE] Navigating to /campaign-setup...');
            navigate(`/campaign-setup/${newCampaignId}`);
          }, 1000);
        }
      }
    };

    es.onerror = (err) => {
      console.error('[useNewCampaignSSE] SSE error:', err);
      // Optionally, implement reconnection logic here.
    };

    return () => {
      console.log('[useNewCampaignSSE] Closing SSE connection');
      es.close();
    };
  }, [userAccount, setTxSuccess, setWaitingForTx, setTxFailed, navigate]);
};
