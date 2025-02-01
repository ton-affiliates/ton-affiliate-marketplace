// src/schedulers/processBlockchainEventsScheduler.ts

import { processBlockchainEvents } from '../ton/FetchAndProcessEvents';
import { Logger } from '../utils/Logger';

export class BlockchainEventsScheduler {
  private intervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  /**
   * The scheduler will use the provided interval in milliseconds,
   * or fall back to the FETCH_INTERVAL_BLOCKCHAIN_EVENTS env variable (or default of 10000 ms).
   */
  constructor(intervalMs?: number) {
    this.intervalMs =
      intervalMs ?? Number(process.env.FETCH_INTERVAL_BLOCKCHAIN_EVENTS || 10000);
  }

  /**
   * Starts the scheduler:
   *  - Immediately runs the processor.
   *  - Schedules periodic runs using setInterval.
   */
  public start(): void {
    Logger.info(`Starting blockchain events scheduler with interval ${this.intervalMs}ms`);

    // Run immediately on startup
    processBlockchainEvents().catch((error) => {
      Logger.error('Error during immediate blockchain events processing:', error);
    });

    // Then schedule periodic processing
    this.timer = setInterval(() => {
      Logger.debug('Running blockchain event processor...');
      processBlockchainEvents().catch((error) => {
        Logger.error('Error processing blockchain events:', error);
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
      Logger.info('Blockchain events scheduler stopped.');
    }
  }
}
