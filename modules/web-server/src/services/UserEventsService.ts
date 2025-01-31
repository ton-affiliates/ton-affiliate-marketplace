import { UserEvent } from '../entity/UserEvent';
import appDataSource from '../ormconfig';
import {UserEventType} from "@common/models";


function userEventsRepository() {
  return appDataSource.getRepository(UserEvent);
}

export async function createEvent(params: {
  userId: number;
  isPremium: boolean;
  eventType: UserEventType;     // <-- Use the enum
  campaignId: string;
  affiliateId: string;
}) {
  const { userId, isPremium, eventType, campaignId, affiliateId } = params;
  const repo = userEventsRepository();

  const newEvent = repo.create({
    userId,
    isPremium,
    eventType,  
    campaignId,
    affiliateId,
  });
  return await repo.save(newEvent);
}

export async function markProcessed(eventId: number) {
  const repo = userEventsRepository();
  await repo.update({ id: eventId }, { isProcessed: true });
}
