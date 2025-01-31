// advertiserApproveAffiliate.ts
import { OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../contracts/Campaign';
import { pollUntil } from './pollUntil';
import { TonConfig } from '../config/TonConfig';

export async function advertiserApproveAffiliate(
  campaignContract: OpenedContract<Campaign> | null,
  affiliateId: bigint,
  sender: Sender,
  userAccountAddress?: string
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  // Pre-check affiliate data
  const affiliateDataBefore = await campaignContract.getAffiliateData(affiliateId);
  if (!affiliateDataBefore) {
    throw new Error(`No such affiliate ${affiliateId} exists in this campaign.`);
  }
  if (affiliateDataBefore.state === 1n) {
    throw new Error(`Affiliate ${affiliateId} is already approved.`);
  }

  console.log(
    `[advertiserApproveAffiliate] Approving affiliate ${affiliateId}, current state = ${affiliateDataBefore.state}`
  );

  // Send message
  await campaignContract.send(sender, { value: TonConfig.GAS_FEE }, {
    $$type: 'AdvertiserApproveAffiliate',
    affiliateId: affiliateId,
  });

  // Poll until the affiliate state changes
  await pollUntil(
    async () => {
      const newAffiliateData = await campaignContract.getAffiliateData(affiliateId);
      return newAffiliateData?.state !== affiliateDataBefore.state;
    },
    campaignContract,
    userAccountAddress
  );

  console.log(`Affiliate ${affiliateId} state updated successfully!`);
}
