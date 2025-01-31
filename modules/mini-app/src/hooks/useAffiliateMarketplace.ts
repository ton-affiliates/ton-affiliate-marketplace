import { useTonClient } from "./useTonClient4";
import { AffiliateMarketplace } from "../contracts/AffiliateMarketplace";
import { TonConfig } from '../config/TonConfig';

export function useAffiliateMarketplace() {
  const client = useTonClient();
  if (!client) return null;
  // Create a provider for the affiliate marketplace
  return client.open(
    AffiliateMarketplace.fromAddress(TonConfig.AFFILIATE_MARKETPLACE_ADDRESS)
  );
}
