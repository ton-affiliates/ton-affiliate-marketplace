import { OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { GAS_FEE } from '../../common/constants';
import { pollUntil } from './pollUntil'; // adjust path

/**
 * Allows the affiliate to withdraw their earnings for the given campaign.
 * Waits until the affiliate’s `withdrawEarnings` changes (presumably to 0).
 *
 * @param campaignContract  The opened Campaign contract.
 * @param affiliateId       The affiliate’s ID (bigint).
 * @param sender            The wallet/sender (the affiliate themselves).
 * @param userAccountAddress - optional to track TX failures
 */
export async function affiliateWithdrawEarnings(
  campaignContract: OpenedContract<Campaign> | null,
  affiliateId: bigint,
  sender: Sender,
  userAccountAddress?: string
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  // Check the affiliate’s current withdrawEarnings
  const affiliateDataBefore = await campaignContract.getAffiliateData(affiliateId);
  if (!affiliateDataBefore) {
    throw new Error(`No such affiliate (ID: ${affiliateId}) in this campaign.`);
  }

  const earningsBefore = affiliateDataBefore.withdrawEarnings;
  console.log(
    `Affiliate ${affiliateId}'s withdrawable earnings before: ${earningsBefore.toString()}`
  );

  if (earningsBefore === 0n) {
    throw new Error(`No withdrawable earnings for affiliate ID ${affiliateId}.`);
  }

  // Send the transaction
  await campaignContract.send(sender, { value: GAS_FEE }, {
    $$type: 'AffiliateWithdrawEarnings',
    affiliateId: affiliateId,
  });

  // Poll until `withdrawEarnings` changes
  await pollUntil(
    async () => {
      const dataAfter = await campaignContract.getAffiliateData(affiliateId);
      return dataAfter?.withdrawEarnings !== earningsBefore;
    },
    campaignContract,
    userAccountAddress
  );

  const affiliateDataAfter = await campaignContract.getAffiliateData(affiliateId);
  console.log(
    `Affiliate ${affiliateId} withdrew earnings successfully. 
     New withdrawEarnings: ${affiliateDataAfter?.withdrawEarnings.toString()}`
  );
}
