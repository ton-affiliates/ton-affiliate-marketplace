// advertiserRemoveAffiliate.ts
import { OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { GAS_FEE } from '../../common/constants';
import { pollUntil } from './pollUntil'; // adjust path as needed

/**
 * Removes an affiliate from the campaign (as the advertiser).
 *
 * @param campaignContract - An opened Campaign contract instance.
 * @param affiliateId - The affiliate ID (bigint) to remove.
 * @param sender - The sender (wallet) that signs the transaction.
 * @param userAccountAddress - Optional address for matching transaction errors, if desired.
 */
export async function advertiserRemoveAffiliate(
  campaignContract: OpenedContract<Campaign> | null,
  affiliateId: bigint,
  sender: Sender,
  userAccountAddress?: string
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  // Check if affiliate even exists
  const affiliateData = await campaignContract.getAffiliateData(affiliateId);
  if (!affiliateData) {
    throw new Error(`Affiliate ${affiliateId} does not exist in this campaign.`);
  }

  console.log(`[advertiserRemoveAffiliate] Removing affiliate ${affiliateId}.`);

  // Send the AdvertiserRemoveAffiliate message
  await campaignContract.send(sender, { value: GAS_FEE }, {
    $$type: 'AdvertiserRemoveAffiliate',
    affiliateId,
  });

  // Poll until affiliateData is null (meaning they've been removed)
  await pollUntil(
    async () => {
      const newAffiliateData = await campaignContract.getAffiliateData(affiliateId);
      return newAffiliateData === null;
    },
    campaignContract,
    userAccountAddress
  );

  console.log(`Affiliate ${affiliateId} removed successfully.`);
}
