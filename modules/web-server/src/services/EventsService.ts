import { Logger } from '../utils/Logger';
import appDataSource from '../ormconfig';
import { EventEntity } from '../entity/EventEntity';

function eventEntityRepository() {
  return appDataSource.getRepository(EventEntity);
}

/**
 * Create a new EventEntity record.
 */
export async function createEventEntity(
  eventType: string,
  payload: any,
  createdLt?: string
): Promise<EventEntity> {
  try {
    const repo = eventEntityRepository();
    const record = repo.create({
      eventType,
      payload,
      createdLt: createdLt || null,
    });

    return await repo.save(record);
  } catch (err) {
    Logger.error('Error creating EventEntity: ' + err);
    throw new Error('Could not create EventEntity');
  }
}

/**
 * Get a single EventEntity by its ID.
 */
export async function getEventEntityById(id: number): Promise<EventEntity | null> {
  try {
    return await eventEntityRepository().findOneBy({ id });
  } catch (err) {
    Logger.error(`Error fetching EventEntity by ID: ${id} ` + err);
    throw new Error('Could not retrieve EventEntity');
  }
}

/**
 * Get all EventEntities, optionally filtered by eventType.
 */
export async function getAllEventEntities(
  eventType?: string
): Promise<EventEntity[]> {
  try {
    const repo = eventEntityRepository();
    if (eventType) {
      return await repo.find({
        where: { eventType },
        order: { createdAt: 'DESC' },
      });
    } else {
      return await repo.find({
        order: { createdAt: 'DESC' },
      });
    }
  } catch (err) {
    Logger.error('Error fetching EventEntities: ' + err);
    throw new Error('Could not retrieve EventEntities');
  }
}

