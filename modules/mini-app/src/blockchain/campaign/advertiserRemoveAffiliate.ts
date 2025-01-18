// advertiserRemoveAffiliate.ts
import { OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { MAX_ATTEMPTS, GAS_FEE } from '@common/constants';

/**
 * Removes an affiliate from the campaign (as the advertiser).
 *
 * @param campaignContract - An opened Campaign contract instance.
 * @param affiliateId - The affiliate ID (bigint) to remove.
 * @param sender - The sender (wallet) that signs the transaction.
 * @param gasFee - Optional. The TON fee to attach for the transaction (defaults to 0.05 TON).
 */
export async function advertiserRemoveAffiliate(
  campaignContract: OpenedContract<Campaign> | null,
  affiliateId: bigint,
  sender: Sender
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  // Check if affiliate even exists
  let affiliateData = await campaignContract.getAffiliateData(affiliateId);
  if (!affiliateData) {
    throw new Error(`Affiliate ${affiliateId} does not exist in this campaign.`);
  }

  console.log(`[advertiserRemoveAffiliate] Removing affiliate ${affiliateId}.`);

  // Send the AdvertiserRemoveAffiliate message
  await campaignContract.send(
    sender,
    { value: GAS_FEE },
    {
      $$type: 'AdvertiserRemoveAffiliate',
      affiliateId,
    }
  );

  // Poll until affiliateData is null (meaning they've been removed)
  let attempt = 0;
  while (true) {
    const newAffiliateData = await campaignContract.getAffiliateData(affiliateId);
    if (newAffiliateData === null) {
      console.log(`Affiliate ${affiliateId} removed successfully.`);
      break;
    }

    if (++attempt > MAX_ATTEMPTS) {
      throw new Error('Remove affiliate transaction timed out.');
    }
    // Wait 2 seconds
    await new Promise((res) => setTimeout(res, 2000));
  }
}
