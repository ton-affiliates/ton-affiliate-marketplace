// src/services/UserEventsService.ts

import { UserEvent } from '../entity/UserEvent';
import appDataSource from '../ormconfig';

function userEventsRepository() {
  return appDataSource.getRepository(UserEvent);
}

/**
 * Create a new user event in the DB, based on the new columns:
 *  userTelegramId, eventOpCode, eventName, etc.
 */
export async function createEvent(params: {
  userTelegramId: number;
  isPremium: boolean;
  eventOpCode: number;
  eventName: string;
  campaignId: string;
  affiliateId: string;
}) {
  const {
    userTelegramId,
    isPremium,
    eventOpCode,
    eventName,
    campaignId,
    affiliateId,
  } = params;

  const repo = userEventsRepository();

  const newEvent = repo.create({
    userTelegramId,
    isPremium,
    eventOpCode,
    eventName,
    campaignId,
    affiliateId,
  });

  return await repo.save(newEvent);
}

/**
 * Mark the given event as processed (by setting isProcessed = true).
 */
export async function markProcessed(eventId: number) {
  const repo = userEventsRepository();
  await repo.update({ id: eventId }, { isProcessed: true });
}
