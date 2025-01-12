import appDataSource from '../ormconfig';
import { Wallet } from '../entity/Wallet';
import { Logger } from '../utils/Logger';

function walletRepository() {
  return appDataSource.getRepository(Wallet);
}

export async function createWallet(data: Partial<Wallet>): Promise<Wallet> {
  try {
    const repo = walletRepository();
    const wallet = repo.create(data);
    return await repo.save(wallet);
  } catch (err) {
    Logger.error('Error creating wallet', err);
    throw new Error('Could not create wallet');
  }
}

export async function getWalletById(id: number): Promise<Wallet | null> {
  try {
    return await walletRepository().findOneBy({ id });
  } catch (err) {
    Logger.error(`Error fetching wallet by ID: ${id}`, err);
    throw new Error('Could not retrieve wallet');
  }
}

export async function getWalletByAddress(address: string): Promise<Wallet | null> {
  try {
    return await walletRepository().findOneBy({ address });
  } catch (err) {
    Logger.error(`Error fetching wallet by address: ${address}`, err);
    throw new Error('Could not retrieve wallet');
  }
}

export async function updateWallet(id: number, updates: Partial<Wallet>): Promise<Wallet | null> {
  try {
    const repo = walletRepository();
    const wallet = await repo.findOneBy({ id });
    if (!wallet) return null;

    Object.assign(wallet, updates);
    return await repo.save(wallet);
  } catch (err) {
    Logger.error(`Error updating wallet: ${id}`, err);
    throw new Error('Could not update wallet');
  }
}

export async function deleteWallet(id: number): Promise<boolean> {
  try {
    const repo = walletRepository();
    const result = await repo.delete({ id });
    return result.affected !== 0;
  } catch (err) {
    Logger.error(`Error deleting wallet: ${id}`, err);
    throw new Error('Could not delete wallet');
  }
}
