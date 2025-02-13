// src/services/ReferralService.ts

import appDataSource from '../ormconfig';
import { Referral } from '../entity/Referral';
import { Logger } from '../utils/Logger';

function referralRepository() {
  return appDataSource.getRepository(Referral);
}

/**
 * Record a referral in the DB.
 */
export async function recordReferralInDB(
  userTelegramId: number,
  campaignId: string,
  affiliateId: number
): Promise<Referral> {
  try {
    const repo = referralRepository();

    // Create and save the referral
    const newReferral = repo.create({
      userTelegramId,
      campaignId,
      affiliateId,
    });
    return await repo.save(newReferral);
  } catch (err) {
    Logger.error('Error recording referral:', err);
    throw new Error('Could not record referral');
  }
}

/**
 * Retrieve a referral by campaignId and userTelegramId.
 */
export async function getReferralByCampaignAndUserTelegramId(
  campaignId: string,
  userTelegramId: number
): Promise<Referral | null> {
  try {
    const repo = referralRepository();
    return await repo.findOne({
      where: {
        campaignId,
        userTelegramId,
      },
    });
  } catch (err) {
    Logger.error('Error fetching referral:', err);
    throw new Error('Could not fetch referral');
  }
}
