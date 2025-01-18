import { OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { MAX_ATTEMPTS, GAS_FEE } from '@common/constants';

/**
 * Creates a new affiliate for the campaign (from the affiliate perspective).
 * Waits until `numAffiliates` increments.
 *
 * @param campaignContract  The opened Campaign contract.
 * @param sender           The wallet/sender signing the transaction.
 * @param gasFee           Optional gas fee (in TON); defaults to 0.05 TON.
 */
export async function affiliateCreateNewAffiliate(
  campaignContract: OpenedContract<Campaign> | null,
  sender: Sender
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  const campaignDataBefore = await campaignContract.getCampaignData();
  const numAffiliatesBefore = campaignDataBefore.numAffiliates;

  console.log(`[affiliateCreateNewAffiliate] Current # affiliates: ${numAffiliatesBefore.toString()}`);

  // Send the transaction with the required gas fee
  await campaignContract.send(
    sender,
    { value: GAS_FEE },
    {
      $$type: 'AffiliateCreateNewAffiliate',
    }
  );

  // Poll until `numAffiliates` changes
  let attempt = 0;
  while (true) {
    const { numAffiliates: numAffiliatesAfter } = await campaignContract.getCampaignData();
    if (numAffiliatesAfter !== numAffiliatesBefore) {
      console.log(
        `New affiliate created successfully! numAffiliates: ${numAffiliatesAfter.toString()}`
      );
      break;
    }
    if (++attempt > MAX_ATTEMPTS) {
      throw new Error('Affiliate creation timed out.');
    }
    await new Promise((res) => setTimeout(res, 2000)); // Wait 2 seconds
  }
}
