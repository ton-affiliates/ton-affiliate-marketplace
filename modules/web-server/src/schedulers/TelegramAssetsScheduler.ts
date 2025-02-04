// src/schedulers/updateTelegramAssets.ts

import { Logger } from '../utils/Logger';
import { ensureTelegramAssetFromTelegram } from '../services/TelegramService';
import appDataSource from '../ormconfig';
import { TelegramAsset } from '../entity/TelegramAsset';

export class TelegramAssetsScheduler {
  private intervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  /**
   * The scheduler will use the provided interval in milliseconds,
   * or fall back to the FETCH_INTERVAL_VERIFY_BOT_PRIVILAGES_IN_MILISECONDS env variable (or default of 10 minutes).
   */
  constructor(intervalMs?: number) {
    this.intervalMs =
      intervalMs ?? Number(process.env.FETCH_INTERVAL_VERIFY_BOT_PRIVILAGES_IN_MILISECONDS || (10 * 60 * 1000));
  }

  /**
   * Updates all Telegram assets by traversing each asset record in the database.
   * For each asset with a defined chatId, it calls ensureTelegramAssetFromTelegram
   * (which fetches updated data from Telegram and updates/creates the record in the DB).
   */
  private async updateTelegramAssets(): Promise<void> {
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
          // Ensure the asset is updated based on its chatId.
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
   * Starts the Telegram assets scheduler:
   *  - Immediately runs the update.
   *  - Schedules periodic updates using setInterval.
   */
  public start(): void {
    Logger.info(`Starting Telegram assets scheduler with interval ${this.intervalMs}ms`);

    // Run immediately on startup.
    this.updateTelegramAssets().catch((error) => {
      Logger.error('Error during immediate Telegram assets update:', error);
    });

    // Then schedule periodic updates.
    this.timer = setInterval(() => {
      Logger.debug('Running periodic Telegram assets update...');
      this.updateTelegramAssets().catch((error) => {
        Logger.error('Error updating Telegram assets:', error);
      });
    }, this.intervalMs);
  }

  /**
   * Stops the scheduler by clearing the interval.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      Logger.info('Telegram assets scheduler stopped.');
    }
  }
}
