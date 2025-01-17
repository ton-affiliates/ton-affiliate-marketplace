import { toNano, OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { MAX_ATTEMPTS, MaxAttemptsError } from '@common/constants';


export async function replenishWithTon(
  campaignContract: OpenedContract<Campaign> | null,
  tonAmount: number,
  sender: Sender
): Promise<void> {
  
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  console.log("[replenishWithTon] relpnishing TON: " + tonAmount);
  const amountInNano = toNano(tonAmount.toString());
  const numReplenishBefore = (await campaignContract.getCampaignData()).numAdvertiserReplenishCampaign;

  await campaignContract.send(
    sender,
    {
      value: amountInNano,
    },
    { $$type: 'AdvertiserReplenish' }
  );

  let attempt = 0;
  while (true) {
    const numReplenishAfter = (await campaignContract.getCampaignData()).numAdvertiserReplenishCampaign;
    if (numReplenishAfter !== numReplenishBefore) break;

     if (attempt >= MAX_ATTEMPTS) {
        throw new MaxAttemptsError();
    }

    if (++attempt > 10) throw new Error('Replenish attempt timed out.');
    await new Promise((res) => setTimeout(res, 2000)); // Sleep 2 seconds
  }
}
