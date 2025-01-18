// advertiserWithdrawFunds.ts
import { toNano, OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { MAX_ATTEMPTS, GAS_FEE } from '@common/constants';

/**
 * Withdraws funds from a campaign as the advertiser.
 *
 * @param campaignContract - An opened Campaign contract instance.
 * @param withdrawAmount - The decimal TON amount to withdraw from the campaign.
 * @param sender - The sender (wallet) that signs the transaction.
 * @param gasFee - Optional. The TON fee to cover the transaction. Defaults to 0.05 TON.
 */
export async function advertiserWithdrawFunds(
  campaignContract: OpenedContract<Campaign> | null,
  withdrawAmount: number,
  sender: Sender
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  console.log(`[advertiserWithdrawFunds] Attempting to withdraw: ${withdrawAmount} TON/USDT`);

  // Get the "before" counters
  const campaignDataBefore = await campaignContract.getCampaignData();
  const numWithdrawBefore = campaignDataBefore.numAdvertiserWithdrawls;

  // Send the withdrawal message
  // 1) We attach a small gas fee (default 0.05 TON).
  // 2) The "amount" field is how many TON we want to withdraw from the campaign.
  await campaignContract.send(
    sender,
    { value: GAS_FEE },
    {
      $$type: 'AdvertiserWithdrawFunds',
      amount: toNano(withdrawAmount.toString()),
    }
  );

  // Poll until the on-chain withdrawal counter increments or until we timeout
  let attempt = 0;
  while (true) {
    const { numAdvertiserWithdrawls: numWithdrawAfter } = await campaignContract.getCampaignData();
    if (numWithdrawAfter !== numWithdrawBefore) {
      // success
      console.log('Funds withdrawn successfully!');
      break;
    }
    if (++attempt > MAX_ATTEMPTS) {
      throw new Error('Withdrawal attempt timed out.');
    }
    // Sleep 2 seconds before checking again
    await new Promise((res) => setTimeout(res, 2000));
  }
}
