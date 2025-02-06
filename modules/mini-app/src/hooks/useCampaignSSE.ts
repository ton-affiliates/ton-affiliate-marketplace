// useCampaignSSE.ts
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

interface AffiliateEventParams {
  campaignId: bigint;
  advertiser: any;
  affiliateId: bigint;
  affiliate: any;
  state: bigint;
}

/**
 * A custom hook that uses SSE to listen for events in a specific campaign.
 */
export const useCampaignSSE = (
  userAccount: { address: string } | null,
  campaignId: string,
  setTxSuccess: React.Dispatch<React.SetStateAction<boolean>>,
  setWaitingForTx: React.Dispatch<React.SetStateAction<boolean>>,
  setTxFailed: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const navigate = useNavigate();
  const lastEventIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Build the SSE endpoint URL with campaignId.
    let url = `${window.location.origin}/api/sse?campaignId=${encodeURIComponent(campaignId)}`;
    if (lastEventIdRef.current) {
      url += `&lastEventId=${encodeURIComponent(lastEventIdRef.current)}`;
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('[useCampaignSSE] Connected to SSE server');
    };

    es.onmessage = (evt: MessageEvent) => {
      lastEventIdRef.current = evt.lastEventId;
      const message = JSON.parse(evt.data);
      console.log('[useCampaignSSE] Received message:', message);

      // Handle AdvertiserSignedCampaignDetailsEvent.
      if (message.type === 'AdvertiserSignedCampaignDetailsEvent') {
        const rawId = BigInt(message.data.campaignId).toString();
        const eventAdvertiser = translateRawAddress(message.data.advertiser).toString();
        const userAddress = userAccount ? Address.parse(userAccount.address).toString() : null;
        if (rawId === campaignId && eventAdvertiser === userAddress) {
          console.log('[useCampaignSSE] Received AdvertiserSignedCampaignDetailsEvent for campaign:', {
            rawId,
            eventAdvertiser,
            userAddress,
          });
          setTxSuccess(true);
          setWaitingForTx(false);
          setTxFailed(false);

          setTimeout(() => {
            console.log('[useCampaignSSE] Navigating to /campaign/' + rawId + '...');
            navigate(`/campaign/${rawId}`);
          }, 1000);
        }
      }

      // Handle AffiliateCreatedEvent.
      if (message.type === 'AffiliateCreatedEvent') {
        const payload: AffiliateEventParams = message.data;
        const affiliateAddr = translateRawAddress(payload.affiliate).toString();
        const userAddr = userAccount ? Address.parse(userAccount.address).toString() : null;
        if (payload.campaignId.toString() === campaignId && affiliateAddr === userAddr) {
          console.log('[useCampaignSSE] Received AffiliateCreatedEvent for our user. Affiliate ID:', payload.affiliateId);
          setTxSuccess(true);
          setWaitingForTx(false);
          setTxFailed(false);
          setTimeout(() => {
            console.log('[useCampaignSSE] Navigating to /affiliate/' + payload.affiliateId + '...');
            navigate(`/affiliate/${payload.affiliateId}`);
          }, 1000);
        }
      }
    };

    es.onerror = (err) => {
      console.error('[useCampaignSSE] SSE error:', err);
    };

    return () => {
      console.log('[useCampaignSSE] Closing SSE connection');
      es.close();
    };
  }, [campaignId, userAccount, setTxSuccess, setWaitingForTx, setTxFailed, navigate]);
};
