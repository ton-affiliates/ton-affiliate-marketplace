// src/bot.ts

import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { Logger } from '../utils/Logger';

// Import the Telegram event service and enums
import { createTelegramEvent } from '../services/TelegramEventService';
import { getTelegramOpCodeByEventName } from "@common/TelegramEventsConfig";

dotenv.config();

/**
 * Create and export the bot instance.
 */
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

bot.start(async (ctx) => {
  await ctx.reply(
    "Welcome! This bot automatically logs join and leave events to the database."
  );
});

/**
 * Listen for 'chat_member' updates.
 *
 * When a user's status changes:
 *   - From 'left' or 'kicked' to 'member', a JOINED event is recorded.
 *   - From 'member' to 'left' or 'kicked', a LEFT event is recorded.
 *
 * The event is written to the database via the createTelegramEvent service.
 */
bot.on('chat_member', async (ctx) => {
  try {
    const upd = ctx.update.chat_member;
    if (!upd) return;

    const oldStatus = upd.old_chat_member.status;
    const newStatus = upd.new_chat_member.status;
    const userTelegramId = upd.new_chat_member.user.id;
    const isPremium = upd.new_chat_member.user.is_premium === true;
    const chatId = upd.chat.id.toString();

    Logger.info(
      `User ${userTelegramId} status changed from ${oldStatus} to ${newStatus}. Premium=${isPremium}`
    );

    // If the user joined (transition from 'left' or 'kicked' to 'member'):
    if ((oldStatus === 'left' || oldStatus === 'kicked') && newStatus === 'member') {
      await createTelegramEvent({
        userTelegramId,
        isPremium,
        opCode: getTelegramOpCodeByEventName("JOINED_CHAT")!,
        chatId,
      });
      Logger.info(`User ${userTelegramId} JOINED chat ${chatId}`);
    }

    // If the user left (transition from 'member' to 'left' or 'kicked'):
    if (oldStatus === 'member' && (newStatus === 'left' || newStatus === 'kicked')) {
      await createTelegramEvent({
        userTelegramId,
        isPremium,
        opCode: getTelegramOpCodeByEventName("LEFT_CHAT")!,
        chatId,
      });
      Logger.info(`User ${userTelegramId} LEFT chat ${chatId}`);
    }
  } catch (err) {
    Logger.error('Error processing chat_member update:', err);
  }
});
