import { DataSource } from 'typeorm';
import appDataSource from '../ormconfig';
import { User } from '../entity/User';
import { Wallet } from '../entity/Wallet';
import { Logger } from '../utils/Logger'; // Example: a custom logger
import { InsertResult } from 'typeorm';

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

export async function upsertUser(userData: Partial<User>): Promise<User> {
  const repo = appDataSource.getRepository(User);

  // Convert userData into the object fields you want to insert/update
  // e.g. "firstName", "lastName", etc.
  // For simplicity, we assume userData has the correct property names.
  const insertResult: InsertResult = await repo
    .createQueryBuilder()
    .insert()
    .into(User)
    .values(userData)
    .onConflict(`
      ("id") DO UPDATE SET
        "first_name" = EXCLUDED."first_name",
        "last_name" = EXCLUDED."last_name",
        "telegram_username" = EXCLUDED."telegram_username",
        "photo_url" = EXCLUDED."photo_url",
        "auth_date" = EXCLUDED."auth_date"
    `)
    .returning('*') // So we can get the updated row back
    .execute();

  // insertResult.raw[0] will have the newly inserted or updated row
  const updatedOrInsertedUser = insertResult.raw[0];
  return updatedOrInsertedUser;
}



/**
 * Attach (create) a wallet for a given user ID.
 */
export async function addUserWallet(
  userId: number,
  walletData: Partial<Wallet>
): Promise<Wallet> {
  // 1) Find the user
  const user = await userRepository().findOneBy({ id: userId });
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  // 2) Create the wallet and set its userId
  const wallet = walletRepository().create({
    ...walletData,
    userId: user.id,
  });

  // 3) Save
  return await walletRepository().save(wallet);
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
 * Update an existing User.
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
