import { toNano, OpenedContract, Sender } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { pollUntil } from './pollUntil'; // adjust import path

/**
 * Replenishes the TON gas fees for a USDT-based campaign.
 *
 * @param campaignContract - The opened Campaign contract.
 * @param tonAmount - Amount of TON (in decimal) to replenish as gas.
 * @param sender - The sender (wallet) that signs the transaction.
 * @param userAccountAddress - Optional. The user address, if you want to match TXs for error-checking.
 */
export async function replenishGasFeesForUsdtCampaign(
  campaignContract: OpenedContract<Campaign> | null,
  tonAmount: number,
  sender: Sender,
  userAccountAddress?: string
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }

  console.log(`[replenishGasFeesForUsdtCampaign] Replenishing gas with TON: ${tonAmount}`);
  const amountInNano = toNano(tonAmount.toString());

  // "Before" counter
  const { numAdvertiserReplenishGasFees: numReplenishBefore } =
    await campaignContract.getCampaignData();

  // Send transaction
  await campaignContract.send(
    sender,
    { value: amountInNano },
    { $$type: 'AdvertiserReplenishGasFeesForUSDTCampaign' }
  );

  // Poll until the on-chain counter increments or we time out
  await pollUntil(
    async () => {
      const { numAdvertiserReplenishGasFees } = await campaignContract.getCampaignData();
      return numAdvertiserReplenishGasFees !== numReplenishBefore;
    },
    campaignContract,
    userAccountAddress // can pass or omit if you don't have it
  );

  console.log('Gas fees for the USDT campaign were replenished successfully!');
}
