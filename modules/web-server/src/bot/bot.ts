// src/bot.ts

import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import * as svgCaptcha from 'svg-captcha';
import sharp from 'sharp';
import { Logger } from '../utils/Logger';
import { getCampaignByIdWithAdvertiser } from '../services/CampaignsService';
import { createEvent } from '../services/UserEventsService';
import { getOpCodeByEventName } from '@common/UserEventsConfig'; // <-- we use this to get numeric opCodes

dotenv.config();

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

interface CaptchaData {
  captchaText: string;
  campaignId: string;
  affiliateId: string;
  tries: number;
  expiresAt: number; // timestamp (Date.now + 12_000ms)
}

// Store captchas while user is solving
const activeCaptchas = new Map<number, CaptchaData>();

// (Optional) store which campaign a user is joining, so we know
// which campaign to associate with the "JOINED" event:
const pendingJoins = new Map<number, { campaignId: string; affiliateId: string }>();

/**
 * /start <campaignId>_<affiliateId>
 * Generate CAPTCHA, store in activeCaptchas, wait for solution
 */
bot.start(async (ctx) => {
  const userTelegramId = ctx.from.id;
  const startPayload = ctx.startPayload; // e.g. "123_456"
  if (!startPayload) {
    await ctx.reply('Bot must be accessed via a referral link');
    return;
  }

  const [campaignId, affiliateId] = startPayload.split('_');
  Logger.info(`User = ${userTelegramId}, campaignId = ${campaignId}, affiliateId = ${affiliateId}`);

  const captcha = svgCaptcha.create({
    size: 5,
    noise: 5,
    color: true,
    background: '#f2f2f2',
  });

  // Convert the SVG captcha to PNG buffer
  const pngBuffer = await sharp(Buffer.from(captcha.data)).png().toBuffer();

  // Save captcha (init tries=0, set 12s expiration)
  activeCaptchas.set(userTelegramId, {
    captchaText: captcha.text,
    campaignId,
    affiliateId,
    tries: 0,
    expiresAt: Date.now() + 12_000 // 12 seconds from now
  });

  await ctx.replyWithPhoto({ source: pngBuffer }, {
    caption: 'Please solve this CAPTCHA within 12 seconds.',
  });
});

/**
 * On text: check if matches current captcha
 * If correct => record event => forward user to campaign link
 * If time expired or incorrect => retry if tries < 4
 */
bot.on('text', async (ctx) => {
  const userTelegramId = ctx.from.id;
  const data = activeCaptchas.get(userTelegramId);

  if (!data) {
    await ctx.reply('No active CAPTCHA for you. Please /start again.');
    return;
  }

  const { captchaText, campaignId, affiliateId } = data;
  const userSolution = ctx.message.text.trim();

  // Check if time is up
  if (Date.now() > data.expiresAt) {
    data.tries += 1;
    if (data.tries >= 4) {
      // Too many tries used up
      activeCaptchas.delete(userTelegramId);
      await ctx.reply('❌ Time expired! You have used all attempts. Please /start again.');
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
    data.expiresAt = Date.now() + 12_000; // reset expiration
    activeCaptchas.set(userTelegramId, data);

    await ctx.reply(`❌ Time expired on the previous CAPTCHA. This is attempt #${data.tries + 1} of 4.`);
    await ctx.replyWithPhoto({ source: newPngBuffer }, {
      caption: 'Please solve this new CAPTCHA within 12 seconds.',
    });
    return;
  }

  // Compare ignoring case
  if (userSolution.toLowerCase() !== captchaText.toLowerCase()) {
    data.tries += 1;
    if (data.tries >= 4) {
      activeCaptchas.delete(userTelegramId);
      await ctx.reply('❌ You have used all 4 attempts. Please /start again.');
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
    data.expiresAt = Date.now() + 12_000; // reset expiration
    activeCaptchas.set(userTelegramId, data);

    await ctx.reply(`❌ Incorrect CAPTCHA. Attempt #${data.tries + 1} of 4.`);
    await ctx.replyWithPhoto({ source: newPngBuffer }, {
      caption: 'Please solve this new CAPTCHA within 12 seconds.',
    });
    return;
  }

  // If we reached here => Captcha correct
  activeCaptchas.delete(userTelegramId);

  // We assume your config has an eventName "SOLVED_CAPTCHA" with some numeric opCode
  const eventName = 'SOLVED_CAPTCHA';
  const opCodeBn = getOpCodeByEventName(eventName);
  const eventOpCode = opCodeBn ? Number(opCodeBn) : -1; // default to -1 if not found

  const isPremium = ctx.from.is_premium === true;
  await createEvent({
    userTelegramId,
    isPremium,
    eventOpCode,
    eventName,
    campaignId,
    affiliateId,
  });

  // Retrieve the campaign to get the invite link
  const campaign = await getCampaignByIdWithAdvertiser(campaignId);
  if (!campaign || !campaign.inviteLink) {
    await ctx.reply('Invalid or missing campaign invite link. Contact support.');
    return;
  }

  Logger.info(`User ${userTelegramId} solved captcha => redirecting to the campaign link`);

  // Optionally store in pendingJoins to know which campaign they're associated with
  pendingJoins.set(userTelegramId, { campaignId, affiliateId });

  // Redirect user to the campaign link
  await ctx.reply('✅ CAPTCHA solved! Tap below to join the channel:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Join Channel',
            url: campaign.inviteLink, // e.g. https://t.me/+SomePrivateHash
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
    const userTelegramId = chatMemberUpdate.new_chat_member.user.id;
    const isPremium = chatMemberUpdate.new_chat_member.user.is_premium === true;

    Logger.info(
      `User ${userTelegramId} status changed from ${oldStatus} to ${newStatus}. Is premium: ${isPremium}`
    );

    if ((oldStatus === 'left' || oldStatus === 'kicked') && newStatus === 'member') {
      // Check if this user is pending from a captcha solution
      const pending = pendingJoins.get(userTelegramId);
      if (pending) {
        const { campaignId, affiliateId } = pending;

        // We'll assume your config has an event "JOINED" with a numeric opCode
        const eventName = 'JOINED';
        const opCodeBn = getOpCodeByEventName(eventName);
        const eventOpCode = opCodeBn ? Number(opCodeBn) : -1;

        await createEvent({
          userTelegramId,
          isPremium,
          eventOpCode,
          eventName,
          campaignId,
          affiliateId,
        });

        Logger.info(
          `User ${userTelegramId} joined channel => event JOINED for campaign=${campaignId}, affiliate=${affiliateId}`
        );
        pendingJoins.delete(userTelegramId);
      }
    }
  } catch (err) {
    Logger.error('Error in chat_member update:', err);
  }
});

// In your main file (e.g. index.ts), you'd do something like:
// bot.launch();
// Logger.info("Verifier Bot is running...");
