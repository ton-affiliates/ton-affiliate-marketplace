import { useEffect, useRef } from 'react';
import { Address } from '@ton/core';
import { ScreenTypes } from '../components/ScreenNavigation';

function translateRawAddress(rawAddress: { workChain: number; hash: { type: string; data: number[] } }): Address {
  const workChain = rawAddress.workChain;
  const hashBuffer = Buffer.from(rawAddress.hash.data);
  return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
}

export const useCampaignWebSocket = (
  userAccount: { address: string } | null,
  setNumCampaigns: React.Dispatch<React.SetStateAction<string>>,
  setCampaignId: React.Dispatch<React.SetStateAction<string | null>>,
  setTxSuccess: React.Dispatch<React.SetStateAction<boolean>>,
  setWaitingForTx: React.Dispatch<React.SetStateAction<boolean>>,
  setTxFailed: React.Dispatch<React.SetStateAction<boolean>>,
  setScreen: React.Dispatch<React.SetStateAction<ScreenTypes>>
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = new WebSocket(`wss://${window.location.host}/api/ws`);

    socket.onopen = () => {
      console.log('WebSocket connected to Nginx-proxied WebSocket server');
    };

    socket.onmessage = (evt) => {
      const message = JSON.parse(evt.data);
      if (message.type === "CampaignCreatedEvent") {
        const campaignId = BigInt(message.data.campaignId).toString();
        const eventAdvertiser = translateRawAddress(message.data.advertiser).toString();
        const userAddress = userAccount ? Address.parse(userAccount.address).toString() : null;
    
        if (eventAdvertiser === userAddress) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setNumCampaigns((prev) => (parseInt(prev, 10) + 1).toString());
          setCampaignId(campaignId);
          setTxSuccess(true);
          setWaitingForTx(false); // Stop spinner
          setTxFailed(false);     // Reset failure state
    
          setTimeout(() => {
            setScreen("setupTelegram");
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
  }, [userAccount, setNumCampaigns, setCampaignId, setTxSuccess, setWaitingForTx, setTxFailed, setScreen]);
};
