// src/hooks/useCampaignContract.ts

import { useState, useEffect } from 'react';
import { useTonClient } from './useTonClient4';
import { Campaign } from '../contracts/Campaign';
import { Address, OpenedContract } from "@ton/core";


export function useCampaignContract(
  campaignContractAddress?: string
) {
  const client = useTonClient();
  const [campaignContract, setCampaignContract] = useState<OpenedContract<Campaign> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset everything if inputs change or client changes
    setCampaignContract(null);
    setError(null);
    if (!client || !campaignContractAddress) {
      return;
    }

    const doFetch = async () => {
      try {
        setIsLoading(true);

        // 4) Open the Campaign contract from that address
        const campaignInstance = client.open(Campaign.fromAddress(Address.parse(campaignContractAddress)));
        setCampaignContract(campaignInstance);
      } catch (err: any) {
        console.error('Error in useCampaignContract:', err);
        setError(err?.message || 'Failed to load campaign');
      } finally {
        setIsLoading(false);
      }
    };

    doFetch();
  }, [client, campaignContractAddress]);

  return {
    campaignContract,
    isLoading,
    error,
  };
}
