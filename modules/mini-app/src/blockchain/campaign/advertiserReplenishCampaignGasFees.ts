// replenishGasFeesForUsdtCampaign.ts
import { toNano, OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { MAX_ATTEMPTS } from '@common/constants';

/**
 * Replenishes the TON gas fees for a USDT-based campaign.
 * 
 * @param {OpenedContract<Campaign> | null} campaignContract - The opened Campaign contract.
 * @param {number} tonAmount - Amount of TON (in decimal) to replenish as gas.
 * @param {Sender} sender - The sender (wallet) that signs the transaction.
 */
export async function replenishGasFeesForUsdtCampaign(
  campaignContract: OpenedContract<Campaign> | null,
  tonAmount: number,
  sender: Sender
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  console.log(`[replenishGasFeesForUsdtCampaign] Replenishing gas with TON: ${tonAmount}`);

  // Convert user’s decimal input to nanotons
  const amountInNano = toNano(tonAmount.toString());
  
  // Check the "before" counter
  const numReplenishBefore = (await campaignContract.getCampaignData()).numAdvertiserReplenishGasFees;

  // Send the special message type the campaign contract expects
  await campaignContract.send(
    sender,
    { value: amountInNano },
    { $$type: 'AdvertiserReplenishGasFeesForUSDTCampaign' },
  );

  // Poll until the on-chain counter increments or we timeout
  let attempt = 0;
  while (true) {
    const numReplenishAfter = (await campaignContract.getCampaignData()).numAdvertiserReplenishGasFees;
    if (numReplenishAfter !== numReplenishBefore) {
      break; // success
    }
    if (++attempt > MAX_ATTEMPTS) {
      throw new Error('Gas fee replenish attempt timed out.');
    }
    await new Promise((res) => setTimeout(res, 2000)); // Sleep 2 seconds
  }

  console.log('Gas fees for the USDT campaign were replenished successfully!');
}
