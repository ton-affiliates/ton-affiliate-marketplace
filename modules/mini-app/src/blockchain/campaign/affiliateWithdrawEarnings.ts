import { OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { MAX_ATTEMPTS, GAS_FEE } from '@common/constants';

/**
 * Allows the affiliate to withdraw their earnings for the given campaign.
 * Waits until the affiliate’s `withdrawEarnings` changes (presumably to 0).
 *
 * @param campaignContract  The opened Campaign contract.
 * @param affiliateId       The affiliate’s ID (bigint).
 * @param sender           The wallet/sender (the affiliate themselves).
 * @param gasFee           Optional gas fee (in TON); defaults to 0.05 TON.
 */
export async function affiliateWithdrawEarnings(
  campaignContract: OpenedContract<Campaign> | null,
  affiliateId: bigint,
  sender: Sender
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
  console.log(`Affiliate ${affiliateId}'s withdrawable earnings before: ${earningsBefore.toString()}`);

  if (earningsBefore === 0n) {
    throw new Error(`No withdrawable earnings for affiliate ID ${affiliateId}.`);
  }

  // Send the transaction
  await campaignContract.send(
    sender,
    { value: GAS_FEE },
    {
      $$type: 'AffiliateWithdrawEarnings',
      affiliateId: affiliateId,
    }
  );

  // Poll until `withdrawEarnings` changes
  let attempt = 0;
  while (true) {
    const affiliateDataAfter = await campaignContract.getAffiliateData(affiliateId);
    if (affiliateDataAfter && affiliateDataAfter.withdrawEarnings !== earningsBefore) {
      console.log(
        `Affiliate ${affiliateId} withdrew earnings successfully. 
         New withdrawEarnings: ${affiliateDataAfter.withdrawEarnings.toString()}`
      );
      break;
    }
    if (++attempt > MAX_ATTEMPTS) {
      throw new Error('Earnings withdrawal transaction timed out.');
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
}
