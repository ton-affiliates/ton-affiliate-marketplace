// advertiserWithdrawFunds.ts
import { toNano, OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { GAS_FEE } from '@common/constants';
import { pollUntil } from './pollUntil'; // import our helper

export async function advertiserWithdrawFunds(
  campaignContract: OpenedContract<Campaign> | null,
  withdrawAmount: number,
  sender: Sender,
  userAccountAddress?: string
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  console.log(`[advertiserWithdrawFunds] Attempting to withdraw: ${withdrawAmount} TON/USDT`);

  // 1) Grab "before" count
  const campaignDataBefore = await campaignContract.getCampaignData();
  const numWithdrawBefore = campaignDataBefore.numAdvertiserWithdrawls;

  // 2) Send transaction
  await campaignContract.send(sender, { value: GAS_FEE }, {
    $$type: 'AdvertiserWithdrawFunds',
    amount: toNano(withdrawAmount.toString()),
  });

  // 3) Poll until numAdvertiserWithdrawls changes
  await pollUntil(
    async () => {
      const { numAdvertiserWithdrawls } = await campaignContract.getCampaignData();
      return numAdvertiserWithdrawls !== numWithdrawBefore;
    },
    campaignContract,
    userAccountAddress
  );

  console.log('Funds withdrawn successfully!');
}
