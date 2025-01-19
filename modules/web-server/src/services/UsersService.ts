import { DataSource } from 'typeorm';
import appDataSource from '../ormconfig';
import { User } from '../entity/User';
import { Wallet } from '../entity/Wallet';
import { Logger } from '../utils/Logger'; // Example: a custom logger
import { InsertResult } from 'typeorm';
import { Address } from '@ton/core';

function userRepository() {
  return appDataSource.getRepository(User);
}

function walletRepository() {
  return appDataSource.getRepository(Wallet);
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
 * Attach (create or update) a wallet for a given user ID.
 * If the wallet 'address' already exists, we update userId, walletType, publicKey, etc.
 * If not, we create a new record. 
 */
export async function addUserWallet(
  userId: number,
  tonAddress: Address, // renamed so it's clear it's a Ton Address object
  walletData: Partial<Omit<Wallet, 'address'>> // everything except 'address'
): Promise<Wallet> {
  // 1) Ensure the user exists
  const user = await userRepository().findOneBy({ id: userId });
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  // Convert Ton Address object => string
  const addressString = tonAddress.toString();

  // 2) Upsert
  const insertResult: InsertResult = await walletRepository()
    .createQueryBuilder()
    .insert()
    .into(Wallet)
    .values({
      address: addressString,
      userId: user.id,
      walletType: walletData.walletType,
      publicKey: walletData.publicKey,
    })
    .onConflict(`
      ("address") DO UPDATE SET
        "user_id" = EXCLUDED."user_id",
        "wallet_type" = EXCLUDED."wallet_type",
        "public_key" = EXCLUDED."public_key"
    `)
    .returning('*')
    .execute();

  // 3) Read back the inserted or updated row
  const updatedWalletRow = insertResult.raw[0];

  // 4) Optionally, re-fetch a full Wallet entity:
  const updatedWallet = await walletRepository().findOne({
    where: { address: updatedWalletRow.address },
  });

  if (!updatedWallet) {
    throw new Error(
      `Could not retrieve wallet after upsert. Address: ${addressString}`
    );
  }

  return updatedWallet;
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
export async function getUserByWalletAddress(
  tonAddress: Address
): Promise<User | null> {
  try {
    const addressString = tonAddress.toString();
    const wallet = await walletRepository().findOne({
      where: { address: addressString },
      relations: ['user'],
    });
    return wallet ? wallet.user : null;
  } catch (err) {
    Logger.error(`Error fetching user by wallet address: ${tonAddress} ` + err);
    throw new Error('Could not retrieve user');
  }
}