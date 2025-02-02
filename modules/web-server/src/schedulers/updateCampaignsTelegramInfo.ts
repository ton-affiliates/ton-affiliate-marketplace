// src/schedulers/updateTelegramAssets.ts

import { Logger } from '../utils/Logger';
import { ensureTelegramAssetFromTelegram } from '../services/TelegramService';
import appDataSource from '../ormconfig';
import { TelegramAsset } from '../entity/TelegramAsset';

/**
 * Updates all Telegram assets by traversing each asset record in the database.
 * For each asset, if a chatId is defined, it calls ensureTelegramAssetFromTelegram
 * (which fetches updated data from Telegram and updates/creates the record in the DB).
 */
export async function updateTelegramAssets(): Promise<void> {
  try {
    const telegramAssetRepo = appDataSource.getRepository(TelegramAsset);
    // Fetch all TelegramAsset records.
    const assets = await telegramAssetRepo.find();
    Logger.info(`Found ${assets.length} Telegram assets to update.`);

    for (const asset of assets) {
      try {
        if (!asset.chatId) {
          Logger.warn(`Telegram asset with undefined chatId found; skipping update.`);
          continue;
        }

        Logger.info(`Updating Telegram asset with chatId "${asset.chatId}"`);
        // Use the new function to ensure the asset is updated based on its chatId.
        await ensureTelegramAssetFromTelegram(asset.chatId);
        Logger.info(`Telegram asset with chatId "${asset.chatId}" updated successfully.`);
      } catch (innerError: any) {
        Logger.error(
          `Error updating Telegram asset with chatId "${asset.chatId}": ` +
            (innerError instanceof Error ? innerError.message : JSON.stringify(innerError))
        );
      }
    }
  } catch (error: any) {
    Logger.error(
      `Error updating Telegram assets: ` +
        (error instanceof Error ? error.message : JSON.stringify(error))
    );
  }
}

/**
 * Schedules the Telegram asset update to run periodically.
 * It runs immediately on startup and then every 10 minutes.
 */
export function scheduleTelegramAssetUpdates(): void {
  // Run immediately on startup.
  updateTelegramAssets();

  // Then schedule updates every 10 minutes (600,000 milliseconds).
  setInterval(() => {
    Logger.info('Running periodic Telegram asset update...');
    updateTelegramAssets();
  }, 1 * 60 * 1000);  // 1 minute for now
}
