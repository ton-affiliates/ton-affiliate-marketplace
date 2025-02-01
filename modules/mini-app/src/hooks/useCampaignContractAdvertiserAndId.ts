// src/hooks/useCampaignContract.ts

import { useState, useEffect } from 'react';
import { Address } from '@ton/core';
import { useTonClient } from './useTonClient4';
import { AffiliateMarketplace } from '../contracts/AffiliateMarketplace';
import { Campaign } from '../contracts/Campaign';
import { AFFILIATE_MARKETPLACE_ADDRESS } from '../common/constants';
import { OpenedContract } from "@ton/core";

/**
 * A hook that, given a `campaignId` (bigint) and `advertiserAddress` (string),
 * loads the "campaign" contract address from the AffiliateMarketplace, then
 * opens and returns a `Campaign` instance if successful.
 *
 * Returns an object with:
 *   - `campaignContract`: The opened `Campaign` contract instance or `null`.
 *   - `isLoading`: boolean indicating if we’re still loading the address.
 *   - `error`: any error message or `null`.
 */
export function useCampaignContractAdvertiserAndId(
  advertiserAddress?: string,
  campaignId?: bigint
) {
  const client = useTonClient();
  const [campaignContract, setCampaignContract] = useState<OpenedContract<Campaign> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset everything if inputs change or client changes
    setCampaignContract(null);
    setError(null);
    if (!client || !advertiserAddress || campaignId === undefined) {
      return;
    }

    const doFetch = async () => {
      try {
        setIsLoading(true);
        // 1) Create the affiliate marketplace instance
        const affiliateMarketplace = client.open(
          AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS)
        );

        console.log("affiliateMarketplace");
        console.log(affiliateMarketplace);

        // 2) Convert advertiserAddress => Address object
        const advertiserAddrObj = Address.parse(advertiserAddress);

        // 3) Get the campaign's address from affiliateMarketplace
        const campaignAddress = await affiliateMarketplace.getCampaignContractAddress(
          campaignId,
          advertiserAddrObj
        );

        console.log("campaignAddress");
        console.log(campaignAddress);

        // 4) Open the Campaign contract from that address
        const campaignInstance = client.open(Campaign.fromAddress(campaignAddress));

        console.log("campaignInstance");
        console.log(campaignInstance);

        setCampaignContract(campaignInstance);
      } catch (err: any) {
        console.error('Error in useCampaignContract:', err);
        setError(err?.message || 'Failed to load campaign');
      } finally {
        setIsLoading(false);
      }
    };

    doFetch();
  }, [client, advertiserAddress, campaignId]);

  return {
    campaignContract,
    isLoading,
    error,
  };
}
