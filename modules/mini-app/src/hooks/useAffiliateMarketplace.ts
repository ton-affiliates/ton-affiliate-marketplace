import { useTonClient } from "./useTonClient";
import { AffiliateMarketplace } from "../contracts/AffiliateMarketplace";
import { AFFILIATE_MARKETPLACE_ADDRESS } from "@common/constants";

export function useAffiliateMarketplace() {
  const client = useTonClient();
  if (!client) return null;
  // Create a provider for the affiliate marketplace
  return client.open(
    AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS)
  );
}
