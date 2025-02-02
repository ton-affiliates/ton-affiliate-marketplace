// src/bot.ts

import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import * as svgCaptcha from 'svg-captcha';
import sharp from 'sharp';
import { Logger } from '../utils/Logger';
import { getCampaignByIdWithAdvertiser } from '../services/CampaignsService';
import { createEvent } from '../services/UserEventsService';
import {UserEventType} from "@common/models";

dotenv.config();

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

interface CaptchaData {
  captchaText: string;
  campaignId: string;
  affiliateId: string;
  tries: number;
}

// Store captchas while user is solving
const activeCaptchas = new Map<number, CaptchaData>();

/**
 * /start <campaignId>_<affiliateId>
 * Generate captcha, store in activeCaptchas, wait for solution
 */
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const startPayload = ctx.startPayload; // e.g. "123_456"
  if (!startPayload) {
    await ctx.reply('Bot must be accessed via a referral link');
    return;
  }

  const [campaignId, affiliateId] = startPayload.split('_');
  Logger.info(`User = ${userId}, campaignId = ${campaignId}, affiliateId = ${affiliateId}`);

  const captcha = svgCaptcha.create({
    size: 5,
    noise: 5,
    color: true,
    background: '#f2f2f2',
  });

  const pngBuffer = await sharp(Buffer.from(captcha.data)).png().toBuffer();

  // Save captcha (init tries=0)
  activeCaptchas.set(userId, {
    captchaText: captcha.text,
    campaignId,
    affiliateId,
    tries: 0,
  });

  await ctx.replyWithPhoto({ source: pngBuffer }, {
    caption: 'Solve this CAPTCHA to continue.',
  });
});

/**
 * On text: check if matches current captcha
 * If correct => event: "solved-captcha" => show a callback button
 */
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const data = activeCaptchas.get(userId);

  if (!data) {
    await ctx.reply('No active CAPTCHA for you.');
    return;
  }

  const { captchaText, campaignId, affiliateId } = data;
  const userSolution = ctx.message.text.trim();

  // Compare ignoring case
  if (userSolution.toLowerCase() !== captchaText.toLowerCase()) {
    data.tries += 1;
    if (data.tries >= 5) {
      activeCaptchas.delete(userId);
      await ctx.reply('❌ You have used all 5 attempts. Please /start again.');
      return;
    }
    // Generate new captcha
    const newCaptcha = svgCaptcha.create({
      size: 5,
      noise: 5,
      color: true,
      background: '#f2f2f2',
    });
    const newPngBuffer = await sharp(Buffer.from(newCaptcha.data)).png().toBuffer();

    data.captchaText = newCaptcha.text;
    activeCaptchas.set(userId, data);

    await ctx.reply('❌ Incorrect CAPTCHA. Here is a new one:');
    await ctx.replyWithPhoto({ source: newPngBuffer }, {
      caption: `Attempt #${data.tries + 1} of 5. Please try again.`,
    });
    return;
  }

  // Captcha correct
  activeCaptchas.delete(userId);

  // Create an event: "solved-captcha"
  const isPremium = ctx.from.is_premium === true; // Telegram user object might have is_premium
  await createEvent({
    userId,
    isPremium,
    eventType: UserEventType.SOLVED_CAPTCHA,
    campaignId,
    affiliateId,
  });

  // Check DB for campaign
  const campaign = await getCampaignByIdWithAdvertiser(campaignId);
  if (!campaign || !campaign.telegramAsset || !campaign.telegramAsset.inviteLink) {
    await ctx.reply('Invalid or missing campaign invite link. Contact support.');
    return;
  }

  Logger.info(`User ${userId} solved captcha => showing "Finish Join" button`);
  const callbackData = `finish_join:${campaignId}:${affiliateId}`;

  await ctx.reply('CAPTCHA solved! Tap the button to finalize joining:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Finish Join',
            callback_data: callbackData,
          },
        ],
      ],
    },
  });
});

/**
 * Callback: user taps "Finish Join".
 *  => event: "clicked-join"
 *  => send a link button for the channel
 */
bot.on('callback_query', async (ctx) => {
  const cb = ctx.callbackQuery;
  const data = (cb as any).data as string;
  if (!data.startsWith('finish_join:')) return;

  const [_, campaignId, affiliateId] = data.split(':');
  const userId = ctx.from.id;
  const isPremium = ctx.from.is_premium === true;

  // Create an event: "clicked-join"
  await createEvent({
    userId,
    isPremium,
    eventType: UserEventType.JOINED,
    campaignId,
    affiliateId,
  });

  // Mark user as "pending join" so we can track in chat_member update
  // pendingJoins.set(userId, { campaignId, affiliateId });

  // Retrieve the campaign again just to confirm invite link
  const campaign = await getCampaignByIdWithAdvertiser(campaignId);
  if (!campaign || !campaign.telegramAsset || !campaign.telegramAsset.inviteLink) {
    await ctx.answerCbQuery('No invite link found.', { show_alert: true });
    return;
  }

  await ctx.answerCbQuery('Logging done. Please see the next message.');

  // Send a second message with a direct URL button
  await ctx.reply('All set! Tap below to join the channel:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Join Channel',
            url: campaign.telegramAsset.inviteLink, // e.g. https://t.me/+SomePrivateHash
          },
        ],
      ],
    },
  });
});

/**
 * Listen for 'chat_member' updates to detect if user actually joined the channel.
 * The bot must be an admin in that channel to receive these updates.
 */
bot.on('chat_member', async (ctx) => {
  try {
    const chatMemberUpdate = ctx.update.chat_member;
    if (!chatMemberUpdate) return;

    const oldStatus = chatMemberUpdate.old_chat_member.status;
    const newStatus = chatMemberUpdate.new_chat_member.status;
    const userId = chatMemberUpdate.new_chat_member.user.id;
    const isPremium = chatMemberUpdate.new_chat_member.user.is_premium === true;

    // We only care if user just switched from 'left'/'kicked' to 'member'
    if ((oldStatus === 'left' || oldStatus === 'kicked') && newStatus === 'member') {
      // Check if user is in pendingJoins
      // const pending = pendingJoins.get(userId);
      // if (pending) {
      //   const { campaignId, affiliateId } = pending;

      //   // Create event: "joined-channel"
      //   await UserEventsService.createEvent({
      //     userId,
      //     isPremium,
      //     eventType: 'joined-channel',
      //     campaignId,
      //     affiliateId,
      //   });

      //   Logger.info(`User ${userId} joined channel => campaign=${campaignId}, affiliate=${affiliateId}`);
      // }
    }
  } catch (err) {
    Logger.error('Error in chat_member update:', err);
  }
});

// In your main file, you'd do something like:
// bot.launch();
// Logger.info("Verifier Bot is running...");
