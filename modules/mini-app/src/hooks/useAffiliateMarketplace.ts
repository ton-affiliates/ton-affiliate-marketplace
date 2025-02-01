import { useTonClient } from "./useTonClient4";
import { AffiliateMarketplace } from "../contracts/AffiliateMarketplace";
import { AFFILIATE_MARKETPLACE_ADDRESS } from "../common/constants";

export function useAffiliateMarketplace() {
  console.log("useAffiliateMarketplace is running at all!");
  const client = useTonClient();
  if (!client) return null;
  // Create a provider for the affiliate marketplace
  console.log("AFFILIATE_MARKETPLACE_ADDRESS: " + AFFILIATE_MARKETPLACE_ADDRESS);
  return client.open(
    AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS)
  );
}
