// src/bot.ts
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import * as svgCaptcha from 'svg-captcha';
import sharp from 'sharp';
import { Logger } from '../utils/Logger';
import { getCampaignByIdWithAdvertiser } from '../services/CampaignsService';

dotenv.config();

export const bot = new Telegraf(process.env.VERIFIER_BOT_TOKEN || '');

interface CaptchaData {
  captchaText: string;
  campaignId: string;
  affiliateId: string;
}

// In-memory captcha store
const activeCaptchas = new Map<number, CaptchaData>();

/**
 * The user does /start <campaignId>_<affiliateId>.
 * We show a CAPTCHA, store the data, and wait for them to solve.
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

  // Convert SVG to PNG
  const pngBuffer = await sharp(Buffer.from(captcha.data)).png().toBuffer();

  // Save in memory
  activeCaptchas.set(userId, {
    captchaText: captcha.text,  // correct solution
    campaignId,
    affiliateId,
  });

  await ctx.replyWithPhoto({ source: pngBuffer }, {
    caption: 'Solve this CAPTCHA to continue.'
  });
});

/**
 * When user sends text, we check if it matches the CAPTCHA.
 * If correct => show them an inline button with callback_data
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

  if (userSolution.toLowerCase() !== captchaText.toLowerCase()) {
    await ctx.reply('❌ Incorrect CAPTCHA. Please try again.');
    return;
  }

  // Remove from memory
  activeCaptchas.delete(userId);

  // Fetch the campaign from DB
  const campaign = await getCampaignByIdWithAdvertiser(campaignId);
  if (!campaign || !campaign.inviteLink) {
    await ctx.reply('Invalid or missing campaign invite link. Contact support.');
    return;
  }

  Logger.info(`User ${userId} solved captcha. Now showing inline button => campaign=${campaignId}`);

  // We send an inline button that triggers a callback query
  // The user sees "Go to Channel"
  // Tapping it => triggers bot.on('callback_query') => we open campaign.inviteLink
  const callbackData = `openLink:${campaignId}:${affiliateId}`;
  await ctx.reply('CAPTCHA solved! Tap the button to go to the channel:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Go to Channel',
            callback_data: callbackData
          }
        ]
      ]
    }
  });
});

/**
 *  If the user taps that inline button => we get a callback query.
 *  We'll parse it => then "redirect" them immediately with answerCbQuery({ url: ... }).
 */
bot.on('callback_query', async (ctx) => {
  const cb = ctx.callbackQuery;
  // Type-assert if necessary: (cb as DataCallbackQuery).data
  const data = (cb as any).data as string; // or use a type guard

  if (!data.startsWith('openLink:')) return;

  const parts = data.split(':'); // e.g. ["openLink", "123", "456"]
  const campaignId = parts[1];
  const affiliateId = parts[2];

  Logger.info(`User ${ctx.from.id} tapped inline button => campaign=${campaignId}, affiliate=${affiliateId}`);
  
  // We can fetch campaign again or have stored it earlier
  const campaign = await getCampaignByIdWithAdvertiser(campaignId);
  if (!campaign || !campaign.inviteLink) {
    // fallback
    await ctx.answerCbQuery('No invite link found.', { show_alert: true });
    return;
  }

  // "Redirect" them by providing the url param in answerCbQuery
  // This opens the link in Telegram's external browser or channel.
  // The user must confirm to open the link on their side. 
  await ctx.answerCbQuery('Opening channel...', {
    url: campaign.inviteLink
  });

  // TODO Guy write event to Blockchain here 
});
