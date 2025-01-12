import { DataSource } from 'typeorm';
import appDataSource from '../ormconfig';
import { User } from '../entity/User';
import { Wallet } from '../entity/Wallet';
import { Logger } from '../utils/Logger'; // Example: a custom logger

function userRepository() {
  return appDataSource.getRepository(User);
}

function walletRepository() {
  return appDataSource.getRepository(Wallet);
}

/**
 * Create a new User.
 */
export async function createUser(userData: Partial<User>): Promise<User> {
  try {
    const repo = userRepository();
    const user = repo.create(userData);
    return await repo.save(user);
  } catch (err) {
    Logger.error('Error creating user ' +  err);
    throw new Error('Could not create user');
  }
}

/**
 * Find a User by primary key (Telegram user ID).
 */
export async function getUserById(id: number): Promise<User | null> {
  try {
    return await userRepository().findOne({
      where: { id },
      relations: ['wallets'], // optionally load wallets
    });
  } catch (err) {
    Logger.error(`Error fetching user by ID: ${id} ` + err);
    throw new Error('Could not retrieve user');
  }
}

/**
 * Get User by wallet address.
 * 1) Find the wallet by `address`.
 * 2) Then load the user that wallet references.
 */
export async function getUserByWalletAddress(address: string): Promise<User | null> {
  try {
    const wallet = await walletRepository().findOne({
      where: { address },
      relations: ['user'],
    });
    return wallet ? wallet.user : null;
  } catch (err) {
    Logger.error(`Error fetching user by wallet address: ${address} ` + err);
    throw new Error('Could not retrieve user');
  }
}

/**
 * Update a User.
 */
export async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
  try {
    const repo = userRepository();
    const user = await repo.findOneBy({ id });
    if (!user) return null;

    Object.assign(user, updates);
    return await repo.save(user);
  } catch (err) {
    Logger.error(`Error updating user: ${id} ` + err);
    throw new Error('Could not update user');
  }
}

/**
 * Delete a User by ID.
 */
export async function deleteUser(id: number): Promise<boolean> {
  try {
    const repo = userRepository();
    const result = await repo.delete({ id });
    return result.affected !== 0;
  } catch (err) {
    Logger.error(`Error deleting user: ${id} ` + err);
    throw new Error('Could not delete user');
  }
}
