// src/blockchain/campaign/advertiserSetCampaignDetails.ts
import { Dictionary, Sender, OpenedContract } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { GAS_FEE, BOT_OP_CODE_USER_CLICK } from '@common/constants';
import { pollUntil } from './pollUntil'; // or wherever you keep pollUntil

interface CommissionValues {
  userReferred: string;       // e.g. '0.1'
  premiumUserReferred: string; // e.g. '0.1'
}

/**
 * Sets the details for a campaign as the advertiser.
 *
 * @param campaignContract      The opened Campaign contract instance.
 * @param sender                The Sender (wallet) that signs the transaction.
 * @param advertiserAddress     The advertiser's address (used for error-checking or pollUntil).
 * @param commissionValues      The user/premium referral amounts as strings (e.g. "0.1").
 * @param isPublicCampaign      Whether campaign is public (true) or private (false).
 * @param paymentMethod         0n => TON, 1n => USDT, etc.
 * @param expirationDateEnabled Whether an expiration date is being used.
 * @param expirationDate        The YYYY-MM-DD string selected by the user (if any).
 */
export async function advertiserSetCampaignDetails(
  campaignContract: OpenedContract<Campaign> | null,
  sender: Sender,
  advertiserAddress: string,
  commissionValues: CommissionValues,
  isPublicCampaign: boolean,
  paymentMethod: bigint,
  expirationDateEnabled: boolean,
  expirationDate: string
) {
  if (!campaignContract) {
    throw new Error('Campaign contract not loaded yet.');
  }
  if (!sender) {
    throw new Error('Sender is not set. Could not send transaction.');
  }

  // 1) Build cost-per-action dictionaries
  const userRefVal = BigInt(Math.floor(parseFloat(commissionValues.userReferred) * 1e9));
  const premiumRefVal = BigInt(Math.floor(parseFloat(commissionValues.premiumUserReferred) * 1e9));

  const regularUsersMap = Dictionary.empty<bigint, bigint>();
  const premiumUsersMap = Dictionary.empty<bigint, bigint>();

  // Example usage: store a cost per "BOT_OP_CODE_USER_CLICK"
  regularUsersMap.set(BOT_OP_CODE_USER_CLICK, userRefVal);
  premiumUsersMap.set(BOT_OP_CODE_USER_CLICK, premiumRefVal);

  // 2) Calculate optional expiration in days
  let campaignValidForNumDays: bigint | null = null;
  if (expirationDateEnabled && expirationDate) {
    const now = new Date();
    const chosenDate = new Date(expirationDate + 'T00:00:00');
    const diffMs = chosenDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      campaignValidForNumDays = BigInt(diffDays);
    }
  }

  // 3) Grab current data to ensure state is not already set
  const { state: stateBefore } = await campaignContract.getCampaignData();
  if (stateBefore !== 0n) {
    throw new Error('Error: campaign has already been initialized!');
  }

  // Send the transaction
  await campaignContract.send(
    sender,
    { value: GAS_FEE },
    {  $$type: 'AdvertiserSetCampaignDetails',
        campaignDetails: {
          $$type: 'CampaignDetails',
          regularUsersCostPerAction: regularUsersMap,
          premiumUsersCostPerAction: premiumUsersMap,
          isPublicCampaign: isPublicCampaign,
          campaignValidForNumDays: campaignValidForNumDays,
          paymentMethod: paymentMethod,
          requiresAdvertiserApprovalForWithdrawl: false,
        } }
  );

  // 6) Poll until the campaign’s state changes from 0 -> something else
  await pollUntil(
    async () => {
      const { state: stateAfter } = await campaignContract.getCampaignData();
      return stateAfter !== stateBefore;
    },
    // pass the contract so pollUntil can run checkTxFailureReason on time-out
    { address: campaignContract.address, abi: campaignContract.abi } as any,
    advertiserAddress // used for checkTxFailureReason, if implemented
  );

  // If we get here, success
  return;
}
