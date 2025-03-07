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

/**
 * Fetch a referral for a given userTelegramId and chatId.
 * The chatId is matched against the campaign's associated TelegramAsset.
 *
 * @param userTelegramId - The Telegram ID of the user.
 * @param chatId - The chat ID of the Telegram asset (from TelegramAsset.chatId).
 * @returns A Referral if found, otherwise null.
 */
export async function getReferralByChatAndUserTelegramId(
  userTelegramId: number,
  chatId: string
): Promise<Referral | null> {
  try {
    const repo = referralRepository();
    const qb = repo
      .createQueryBuilder('referral')
      .innerJoinAndSelect('referral.campaign', 'campaign')
      .innerJoinAndSelect('campaign.telegramAsset', 'telegramAsset')
      .where('referral.userTelegramId = :userTelegramId', { userTelegramId })
      .andWhere('telegramAsset.chatId = :chatId', { chatId });
    
    // Log the generated SQL query
    // console.log("Generated SQL:", qb.getSql());
    
    return await qb.getOne();
  } catch (err) {
    Logger.error('Error fetching referral by chat and userTelegramId:', err);
    throw new Error('Could not fetch referral by chat');
  }
}

