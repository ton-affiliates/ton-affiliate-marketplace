import { ProcessedOffset } from '../entity/ProcessedOffset';
import { DataSource } from 'typeorm';
import appDataSource from '../ormconfig';

const offsetRepo = () => appDataSource.getRepository(ProcessedOffset);

/**
 * Returns the last processed LT as a BigInt.
 */
export async function getLastProcessedLt(): Promise<bigint> {
  // Use findOneBy({}) instead of no args:
  const record = await offsetRepo().findOneBy({});
  if (!record) {
    // Could create one or just return BigInt(0)
    return BigInt(0);
  }
  return BigInt(record.lastLt);
}

/**
 * Saves the last processed LT in the DB.
 */
export async function saveLastProcessedLt(lt: bigint): Promise<void> {
  // Also pass an empty object here:
  let record = await offsetRepo().findOneBy({});
  if (!record) {
    record = offsetRepo().create({ lastLt: lt.toString() });
  } else {
    record.lastLt = lt.toString();
  }
  await offsetRepo().save(record);
}
