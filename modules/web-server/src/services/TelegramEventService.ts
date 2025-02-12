// src/services/TelegramEventService.ts

import { TelegramEvent } from '../entity/TelegramEvent';
import appDataSource from '../ormconfig';
import { TelegramEventType } from "@common/Enums";

function telegramEventsRepository() {
  return appDataSource.getRepository(TelegramEvent);
}

/**
 * Create a new Telegram event in the DB.
 *
 * @param params.userTelegramId - The Telegram ID of the user.
 * @param params.isPremium - Whether the user is premium.
 * @param params.eventType - The event type (one of the TelegramEventType enum).
 * @param params.campaignId - The campaign ID.
 * @param params.affiliateId - The affiliate ID.
 */
export async function createTelegramEvent(params: {
  userTelegramId: number;
  isPremium: boolean;
  opCode: TelegramEventType;
  chatId: string;
}) {
  const { userTelegramId, chatId, isPremium, opCode } = params;
  const repo = telegramEventsRepository();

  const newEvent = repo.create({
    userTelegramId: userTelegramId,
    isPremium: isPremium,
    opCode: opCode,
    isProcessed: false,
    chatId: chatId
  });

  return await repo.save(newEvent);
}

/**
 * Mark the given Telegram event as processed (by setting isProcessed = true).
 */
export async function markTelegramEventProcessed(eventId: number) {
  const repo = telegramEventsRepository();
  await repo.update({ id: eventId }, { isProcessed: true });
}
