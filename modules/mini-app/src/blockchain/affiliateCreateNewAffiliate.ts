import { OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../contracts/Campaign';
import { TonConfig } from '../config/TonConfig'
import { pollUntil } from './pollUntil'; // adjust path

/**
 * Creates a new affiliate for the campaign (from the affiliate perspective).
 * Waits until `numAffiliates` increments.
 *
 * @param campaignContract - The opened Campaign contract.
 * @param sender - The wallet/sender signing the transaction.
 * @param userAccountAddress - Optional address to check for TX errors (if needed).
 */
export async function affiliateCreateNewAffiliate(
  campaignContract: OpenedContract<Campaign> | null,
  sender: Sender,
  userAccountAddress?: string
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  const { numAffiliates: numAffiliatesBefore } = await campaignContract.getCampaignData();
  console.log(
    `[affiliateCreateNewAffiliate] Current # affiliates: ${numAffiliatesBefore.toString()}`
  );

  // Send the transaction
  await campaignContract.send(sender, { value: TonConfig.GAS_FEE }, {
    $$type: 'AffiliateCreateNewAffiliate',
  });

  // Poll until `numAffiliates` changes
  await pollUntil(
    async () => {
      const { numAffiliates: numAffiliatesAfter } = await campaignContract.getCampaignData();
      return numAffiliatesAfter !== numAffiliatesBefore;
    },
    campaignContract,
    userAccountAddress
  );

  const { numAffiliates } = await campaignContract.getCampaignData();
  console.log(`New affiliate created successfully! numAffiliates: ${numAffiliates.toString()}`);
}
