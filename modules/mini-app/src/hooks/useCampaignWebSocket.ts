// src/hooks/useCampaignWebSocket.ts

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Address } from '@ton/core';

/** 
 * Convert raw address data from your message into an Address. 
 */
function translateRawAddress(rawAddress: {
  workChain: number;
  hash: { type: string; data: number[] };
}): Address {
  const workChain = rawAddress.workChain;
  const hashBuffer = Buffer.from(rawAddress.hash.data);
  return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
}

/**
 * A custom hook that listens to WebSocket events about campaign creation and triggers
 * updates in your React state, then navigates to /telegram-setup upon success.
 *
 * @param userAccount     The user’s wallet account info, or null if not connected.
 * @param setNumCampaigns A setter to update the local “number of campaigns”.
 * @param setTxSuccess    A setter that toggles the “transaction success” state.
 * @param setWaitingForTx A setter that toggles the “waiting” spinner.
 * @param setTxFailed     A setter that toggles the “failed” state.
 */
export const useCampaignWebSocket = (
  userAccount: { address: string } | null,
  setNumCampaigns: React.Dispatch<React.SetStateAction<string>>,
  setTxSuccess: React.Dispatch<React.SetStateAction<boolean>>,
  setWaitingForTx: React.Dispatch<React.SetStateAction<boolean>>,
  setTxFailed: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Connect to your Nginx-proxied WebSocket endpoint
    const socket = new WebSocket(`wss://${window.location.host}/api/ws`);

    socket.onopen = () => {
      console.log('WebSocket connected to Nginx-proxied WebSocket server');
    };

    socket.onmessage = (evt) => {
      const message = JSON.parse(evt.data);

      if (message.type === 'CampaignCreatedEvent') {
        const campaignId = BigInt(message.data.campaignId).toString();
        const eventAdvertiser = translateRawAddress(message.data.advertiser).toString();
        const userAddress = userAccount
          ? Address.parse(userAccount.address).toString()
          : null;

        // If this new campaign was created by our user’s address
        if (eventAdvertiser === userAddress) {
          console.log('[useCampaignWebSocket] Received CampaignCreatedEvent for our user:', {
            campaignId,
            eventAdvertiser,
            userAddress,
          });

          // Clear any waiting timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // Update local states
          setNumCampaigns((prev) => (parseInt(prev, 10) + 1).toString());
          setTxSuccess(true);
          setWaitingForTx(false); // stop spinner
          setTxFailed(false);

          setTimeout(() => {
            console.log('[useCampaignWebSocket] Navigating to /telegram-setup...');
            navigate(`/telegram-setup/${campaignId}`); // Insert campaignId here
          }, 1000);
        }
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    userAccount,
    setNumCampaigns,
    setTxSuccess,
    setWaitingForTx,
    setTxFailed,
    navigate,
  ]);
};
