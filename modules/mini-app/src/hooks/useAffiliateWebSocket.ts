// src/hooks/useAffiliateWebSocket.ts
import { useEffect } from 'react';
import { Address } from '@ton/core';

function translateRawAddress(rawAddress: {
  workChain: number;
  hash: { type: string; data: number[] };
}): Address {
  const workChain = rawAddress.workChain;
  const hashBuffer = Buffer.from(rawAddress.hash.data);
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
 * A small custom hook that listens for 'AffiliateCreatedEvent' from your WebSocket.
 * If the new affiliate address matches our user’s address, we call setNewAffiliateId(affiliateId).
 */
export function useAffiliateWebSocket(
  userWalletAddress: string | undefined,
  setNewAffiliateId: (id: bigint | null) => void,
  campaignId: string | undefined
) {
  useEffect(() => {
    if (!campaignId) return; // no campaign => no socket
    if (!userWalletAddress) return; // not connected => no socket?

    const socket = new WebSocket(`wss://${window.location.host}/api/ws`);

    socket.onopen = () => {
      console.log('WebSocket connected (AffiliateCreatedEvent listener)');
    };

    socket.onmessage = (evt) => {
      const message = JSON.parse(evt.data);
      if (message.type === 'AffiliateCreatedEvent') {
        // e.g.: { campaignId, advertiser, affiliateId, affiliate, state }
        const payload: AffiliateEventParams = message.data;
        const affiliateAddr = translateRawAddress(payload.affiliate).toString();
        const userAddr = Address.parse(userWalletAddress).toString();

        // If it's for *this* campaign, and the affiliate address is me
        if (payload.campaignId.toString() === campaignId && affiliateAddr === userAddr) {
          console.log('[useAffiliateWebSocket] Our user is the newly created affiliate!');
          setNewAffiliateId(payload.affiliateId);
        }
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket error (AffiliateCreatedEvent):', err);
    };

    return () => {
      socket.close();
    };
  }, [campaignId, userWalletAddress, setNewAffiliateId]);
}
