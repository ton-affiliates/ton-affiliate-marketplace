import appDataSource from '../ormconfig';
import { User } from '../entity/User';
import { Wallet } from '../entity/Wallet';
import { Logger } from '../utils/Logger';
import { Address } from '@ton/core';
import { InsertResult } from 'typeorm';

function userRepository() {
  return appDataSource.getRepository(User);
}

function walletRepository() {
  return appDataSource.getRepository(Wallet);
}


export async function ensureUser(userData: Partial<User>): Promise<User> {
  if (!userData.id) throw new Error("No user id");

  return appDataSource.transaction(async (manager) => {
      
      const repo = manager.getRepository(User);

      // Lock the row if it exists
      let existing = await repo.findOne({
        where: { id: userData.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!existing) {
        existing = repo.create(userData);
      } else {
        // 3) Merge only properties that are present in userData
      if (userData.firstName !== undefined) {
        existing.firstName = userData.firstName;
      }
      if (userData.lastName !== undefined) {
        existing.lastName = userData.lastName;
      }
      if (userData.telegramUsername !== undefined) {
        existing.telegramUsername = userData.telegramUsername;
      }
      if (userData.photoUrl !== undefined) {
        existing.photoUrl = userData.photoUrl;
      }
      if (userData.authDate !== undefined) {
        existing.authDate = userData.authDate;
      }
      if (userData.telegramLanguage !== undefined) {
        existing.telegramLanguage = userData.telegramLanguage;
      }
      if (userData.canMessage !== undefined) {
        existing.canMessage = userData.canMessage;
      }
    }
    return repo.save(existing);
  });
}


export async function ensureWallet(data: Partial<Wallet>): Promise<Wallet> {
  
  const repo = walletRepository();
  let wallet = await repo.findOneBy({ address: data.address });

  // If wallet doesn't exist, create new
  if (!wallet) {
    wallet = repo.create(data);
  } 

  return repo.save(wallet);
}


/**
 * Connect a user & wallet in the 'user_wallets' join table,
 * ignoring duplicate key errors if the row already exists.
 */
export async function connectUserAndWallet(
  userId: number,
  walletAddr: string
): Promise<Wallet> {
  const userRepo = userRepository();
  const walletRepo = walletRepository();

  // 1) Load the user (including current wallets)
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: ['wallets'], // load the user's existing wallets
  });
  if (!user) {
    throw new Error(`No user with id=${userId}`);
  }

  // 2) Confirm the wallet entity exists
  const wallet = await walletRepo.findOneBy({ address: walletAddr });
  if (!wallet) {
    throw new Error(`No wallet with address=${walletAddr}`);
  }

  // 3) If not already connected, push and save
  if (!user.wallets.find((w) => w.address === wallet.address)) {
    user.wallets.push(wallet);

    try {
      // This inserts a row into 'user_wallets' (join table)
      await userRepo.save(user);
    } catch (err: any) {
      // If there's a duplicate key error (already connected), ignore it
      if (err.message.includes('duplicate key')) {
        Logger.warn(`Wallet ${walletAddr} already connected to user ${userId}`);
      } else {
        // Re-throw other errors
        throw err;
      }
    }
  }

  return wallet;
}

/**
 * Return the user by ID, including any linked wallets.
 */
export async function getUserById(id: number): Promise<User | null> {
  try {
    return await userRepository().findOne({
      where: { id },
      relations: ['wallets'], // eager-load wallets
    });
  } catch (err) {
    Logger.error(`Error fetching user by ID: ${id} ` + err);
    throw new Error('Could not retrieve user');
  }
}

/**
 * Because it's a many-to-many, a single wallet can be linked
 * to multiple users. Return an array of all those users.
 */
export async function getUsersByWalletAddress(tonAddress: Address): Promise<User[]> {
  try {
    const addressString = tonAddress.toString();
    const wallet = await walletRepository().findOne({
      where: { address: addressString },
      relations: ['users'],
    });
    if (!wallet) {
      return [];
    }
    // Return all user entities that are linked to this wallet
    return wallet.users || [];
  } catch (err) {
    Logger.error(`Error fetching users by wallet address: ${tonAddress} ` + err);
    throw new Error('Could not retrieve users');
  }
}

