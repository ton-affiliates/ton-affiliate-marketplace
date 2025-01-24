// replenishWithTon.ts
import { toNano, OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { pollUntil } from './pollUntil';

export async function replenishWithTon(
  campaignContract: OpenedContract<Campaign> | null,
  tonAmount: number,
  sender: Sender,
  userAccountAddress?: string
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  console.log('[replenishWithTon] Replenishing TON:', tonAmount);
  const amountInNano = toNano(tonAmount.toString());

  // Get "before" count
  const { numAdvertiserReplenishCampaign: numReplenishBefore } =
    await campaignContract.getCampaignData();

  // Send the transaction
  await campaignContract.send(
    sender,
    { value: amountInNano },
    { $$type: 'AdvertiserReplenish' }
  );

  // Poll until numAdvertiserReplenishCampaign increments
  await pollUntil(
    async () => {
      const { numAdvertiserReplenishCampaign: numReplenishAfter } =
        await campaignContract.getCampaignData();
      return numReplenishAfter !== numReplenishBefore;
    },
    campaignContract,
    userAccountAddress
  );

  console.log('Replenish successful!');
}
