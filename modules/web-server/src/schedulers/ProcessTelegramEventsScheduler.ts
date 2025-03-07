
import { Logger } from "../utils/Logger";
import { getUnprocessedTelegramEvents, markTelegramEventProcessed } from "../services/TelegramEventService";
import { getBlockchainOpCodeByTelegramOpCode } from "@common/BlockchainEventsConfig";
import { getTelegramOpCodeByEventName } from "@common/TelegramEventsConfig";
import { getReferralByChatAndUserTelegramId } from "../services/ReferralService";
import { botUserAction } from "../bot/botUserAction";

export class ProcessTelegramEventsScheduler {
  private intervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  /**
   * Scheduler runs on the provided interval in milliseconds,
   * defaulting to 10 minutes if not specified.
   */
  constructor(intervalMs?: number) {
    this.intervalMs =
      intervalMs ?? Number(process.env.FETCH_INTERVAL_PROCESS_TELEGRAM_EVENTS_INTERVAL_MS || 10 * 60 * 1000);
  }

  /**
   * Fetches all unprocessed Telegram events and marks them as processed.
   */
  private async processTelegramEvents(): Promise<void> {
    try {
      const unprocessedEvents = await getUnprocessedTelegramEvents();
      Logger.info(`Found ${unprocessedEvents.length} unprocessed Telegram events.`);

      for (const event of unprocessedEvents) {
        try {
          Logger.info(
            `Processing event ID=${event.id}, opCode=${event.opCode}, user=${event.userTelegramId}, chat=${event.chatId}`
          );

          if (event.opCode != getTelegramOpCodeByEventName("JOINED_CHAT")!) {
            Logger.info(
                `Still do not support events other than 'JOINED_CHAT' for event ID=${event.id}, opCode=${event.opCode}, user=${event.userTelegramId}, chat=${event.chatId}`
              );
              continue;
          }

          // write event to blockchain
          const opcode: number = await getBlockchainOpCodeByTelegramOpCode(event.opCode)!;
          
          // extract referral 
          const referral = await getReferralByChatAndUserTelegramId(event.userTelegramId, event.chatId);
          if (!referral) {
            Logger.info(
                `Cannot find referral for event ID=${event.id}, opCode=${event.opCode}, user=${event.userTelegramId}, chat=${event.chatId}`
              );
              continue;
          }

          const affiliateId = referral.affiliateId;
          const campaign = referral.campaign;
          
          await botUserAction(campaign.contractAddress, BigInt(affiliateId), BigInt(opcode), event.isPremium);
          Logger.info(`BotAction: User ${event.userTelegramId} JOINED_CHAT for ${event.chatId} for campaign ${campaign.id}. Blockchain Event written.`);

          // Mark event as processed
          await markTelegramEventProcessed(event.id);
          Logger.info(`Event ID=${event.id} marked as processed.`);

        } catch (innerError: any) {
          Logger.error(
            `Error processing event ID=${event.id}: ` +
              (innerError instanceof Error ? innerError.message : JSON.stringify(innerError))
          );
        }
      }
    } catch (error: any) {
      Logger.error(
        `Error fetching Telegram events: ` +
          (error instanceof Error ? error.message : JSON.stringify(error))
      );
    }
  }

  /**
   * Starts the scheduler:
   * - Runs the first processing immediately.
   * - Schedules periodic processing at the configured interval.
   */
  public start(): void {
    Logger.info(`Starting ProcessTelegramEventsScheduler with interval ${this.intervalMs}ms`);

    // Run immediately on startup
    this.processTelegramEvents().catch((error) => {
      Logger.error("Error during immediate Telegram events processing:", error);
    });

    // Schedule periodic execution
    this.timer = setInterval(() => {
      Logger.debug("Running periodic Telegram events processing...");
      this.processTelegramEvents().catch((error) => {
        Logger.error("Error processing Telegram events:", error);
      });
    }, this.intervalMs);
  }

  /**
   * Stops the scheduler.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      Logger.info("ProcessTelegramEventsScheduler stopped.");
    }
  }
}
