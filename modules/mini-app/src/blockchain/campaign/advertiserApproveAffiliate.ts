// advertiserApproveAffiliate.ts
import { OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { MAX_ATTEMPTS, GAS_FEE } from '@common/constants';

/**
 * Approves an affiliate for the given campaign (as the advertiser).
 *
 * @param campaignContract - An opened Campaign contract instance.
 * @param affiliateId - The affiliate ID you want to approve.
 * @param sender - The sender (wallet) that signs the transaction.
 * @param gasFee - Optional. The TON fee to attach for the transaction (defaults to 0.05 TON).
 */
export async function advertiserApproveAffiliate(
  campaignContract: OpenedContract<Campaign> | null,
  affiliateId: bigint,
  sender: Sender
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  // Fetch affiliate data before
  const affiliateDataBefore = await campaignContract.getAffiliateData(affiliateId);
  if (!affiliateDataBefore) {
    throw new Error(`No such affiliate ${affiliateId} exists in this campaign.`);
  }

  // If affiliate is already state=1 (approved), no need to proceed
  if (affiliateDataBefore.state === 1n) {
    throw new Error(`Affiliate ${affiliateId} is already approved.`);
  }

  console.log(
    `[advertiserApproveAffiliate] Approving affiliate ${affiliateId}, current state = ${affiliateDataBefore.state}`
  );

  // Send the AdvertiserApproveAffiliate message with the provided gas fee
  await campaignContract.send(
    sender,
    { value: GAS_FEE },  // e.g. "0.05TON", see note below
    {
      $$type: 'AdvertiserApproveAffiliate',
      affiliateId: affiliateId,
    }
  );

  // Poll until affiliateData.state changes
  let attempt = 0;
  while (true) {
    const newAffiliateData = await campaignContract.getAffiliateData(affiliateId);
    if (newAffiliateData && newAffiliateData.state !== affiliateDataBefore.state) {
      console.log(`Affiliate ${affiliateId} state updated successfully: ${newAffiliateData.state}`);
      break;
    }
    if (++attempt > MAX_ATTEMPTS) {
      throw new Error('Approve affiliate transaction timed out.');
    }
    // Wait 2 seconds
    await new Promise((res) => setTimeout(res, 2000));
  }
}
