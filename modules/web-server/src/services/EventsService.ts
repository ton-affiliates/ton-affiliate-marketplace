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

/**
 * Update an existing EventEntity.
 * (Rarely used if EventEntities are immutable, but included for completeness.)
 */
export async function updateEventEntity(
  id: number,
  updates: Partial<EventEntity>
): Promise<EventEntity | null> {
  try {
    const repo = eventEntityRepository();
    const existing = await repo.findOneBy({ id });
    if (!existing) return null;

    Object.assign(existing, updates);
    return await repo.save(existing);
  } catch (err) {
    Logger.error(`Error updating EventEntity: ${id} ` + err);
    throw new Error('Could not update EventEntity');
  }
}

/**
 * Delete an EventEntity by ID.
 * (Again, immutability might make this unnecessary, but included for completeness.)
 */
export async function deleteEventEntity(id: number): Promise<boolean> {
  try {
    const repo = eventEntityRepository();
    const result = await repo.delete({ id });
    return result.affected !== 0;
  } catch (err) {
    Logger.error(`Error deleting EventEntity: ${id} ` + err);
    throw new Error('Could not delete EventEntity');
  }
}
