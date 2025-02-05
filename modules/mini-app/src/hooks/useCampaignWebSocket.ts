// src/hooks/useCampaignWebSocket.ts
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Address } from '@ton/core';

function translateRawAddress(rawAddress: {
  workChain: number;
  hash: { type: string; data: number[] };
}): Address {
  const workChain = rawAddress.workChain;
  const hashBuffer = Buffer.from(rawAddress.hash.data);
  return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
}

/**
 * A custom hook that listens to WebSocket events about campaign creation
 * or final on-chain details, triggering updates or navigation in your React app.
 *
 * @param userAccount      The user’s wallet info or null if not connected.
 * @param campaignId       The campaign ID in the wizard (string | null).
 * @param setTxSuccess     A setter for transaction success.
 * @param setWaitingForTx  A setter for waiting spinner.
 * @param setTxFailed      A setter for transaction fail state.
 */
export const useCampaignWebSocket = (
  userAccount: { address: string } | null,
  campaignId: string | undefined,
  setTxSuccess: React.Dispatch<React.SetStateAction<boolean>>,
  setWaitingForTx: React.Dispatch<React.SetStateAction<boolean>>,
  setTxFailed: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = new WebSocket(`wss://${window.location.host}/api/ws`);

    socket.onopen = () => {
      console.log('[useCampaignWebSocket] Connected to server');
    };

    socket.onmessage = (evt) => {
      const message = JSON.parse(evt.data);

      // --------------------------------------------------
      // 1) CampaignCreatedEvent
      // --------------------------------------------------
      if (message.type === 'CampaignCreatedEvent') {
        const newCampaignId = BigInt(message.data.campaignId).toString();
        const eventAdvertiser = translateRawAddress(message.data.advertiser).toString();
        const userAddress = userAccount
          ? Address.parse(userAccount.address).toString()
          : null;

        if (eventAdvertiser === userAddress) {
          console.log('[useCampaignWebSocket] Received CampaignCreatedEvent for our user:', {
            newCampaignId,
            eventAdvertiser,
            userAddress,
          });
          // Clear spinner/timeouts
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setTxSuccess(true);
          setWaitingForTx(false);
          setTxFailed(false);

          setTimeout(() => {
            console.log('[useCampaignWebSocket] Navigating to /campaign-setup...');
            navigate(`/campaign-setup/${newCampaignId}`);
          }, 1000);
        }
      }

      // --------------------------------------------------
      // 2) AdvertiserSignedCampaignDetailsEvent
      // --------------------------------------------------
      if (message.type === 'AdvertiserSignedCampaignDetailsEvent') {
        const rawId = BigInt(message.data.campaignId).toString();
        const eventAdvertiser = translateRawAddress(message.data.advertiser).toString();
        const userAddress = userAccount
          ? Address.parse(userAccount.address).toString()
          : null;

        // If wizard campaignId is set, check if it matches
        if (campaignId && rawId === campaignId && eventAdvertiser === userAddress) {
          console.log('[useCampaignWebSocket] Received AdvertiserSignedCampaignDetailsEvent for campaign:', {
            rawId,
            eventAdvertiser,
            userAddress,
          });

          // Clear spinner/timeouts
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setTxSuccess(true);
          setWaitingForTx(false);
          setTxFailed(false);

          // Optionally navigate to next page
          setTimeout(() => {
            console.log('[useCampaignWebSocket] Navigating to /blockchain-setup...');
            navigate(`/blockchain-setup/${rawId}`);
          }, 1000);
        }
      }
    };

    socket.onerror = (error) => {
      console.error('[useCampaignWebSocket] WebSocket error:', error);
    };

    return () => {
      socket.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    userAccount,
    campaignId,
    setTxSuccess,
    setWaitingForTx,
    setTxFailed,
    navigate,
  ]);
};
