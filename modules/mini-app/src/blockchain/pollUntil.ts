// pollUntil.ts
import { OpenedContract } from '@ton/core';
import { Campaign } from '../contracts/Campaign';
import { checkTxFailureReason } from './checkTxFailureReason';
import { TonConfig } from '../config/TonConfig'

/**
 * Generic polling helper. Repeatedly calls `conditionFn` until
 * it returns `true`, or until we hit MAX_ATTEMPTS. 
 * If timed out, calls checkTxFailureReason to see if the TX failed
 * with a known exit code.
 */
export async function pollUntil(
  conditionFn: () => Promise<boolean>,
  campaignContract: OpenedContract<Campaign>,
  userAccountAddress?: string,
  maxAttempts = TonConfig.MAX_ATTEMPTS,
  intervalMs = 2000
) {
  let attempt = 0;
  while (true) {
    // Check if our success condition is met
    if (await conditionFn()) {
      return; // success
    }
    // Otherwise wait or time out
    if (++attempt > maxAttempts) {
      // Attempt to see if there's a known exit code
      await checkTxFailureReason(campaignContract, userAccountAddress);
      // If none found, checkTxFailureReason() throws a generic "Tx failed!"
      return; // We'll never reach here if it threw, but just for clarity
    }
    // Sleep a bit before re-checking
    await new Promise((res) => setTimeout(res, intervalMs));
  }
}
