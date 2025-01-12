import appDataSource from '../ormconfig';
import { ProcessedOffset } from '../entity/ProcessedOffset';
import { Logger } from '../utils/Logger';

function offsetRepository() {
  return appDataSource.getRepository(ProcessedOffset);
}

export async function getLastProcessedLt(): Promise<bigint> {
  try {
    const record = await offsetRepository().findOneBy({});
    if (!record) {
      Logger.info('No existing record for last processed LT. Defaulting to 0.');
      return BigInt(0); // Default to 0 if no record exists
    }
    Logger.info(`Fetched Last Processed LT: ${record.lastLt}`);
    return BigInt(record.lastLt);
  } catch (err) {
    Logger.error('Error fetching last processed LT', err);
    throw new Error('Could not retrieve last processed LT');
  }
}


export async function saveLastProcessedLt(lt: bigint): Promise<void> {
  try {
    let record = await offsetRepository().findOneBy({});
    if (!record) {
      record = offsetRepository().create({ lastLt: lt.toString() });
    } else {
      record.lastLt = lt.toString();
    }
    await offsetRepository().save(record);
  } catch (err) {
    Logger.error('Error saving last processed LT', err);
    throw new Error('Could not save last processed LT');
  }
}
