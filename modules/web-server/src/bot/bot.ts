// src/bot.ts

import { Telegraf, Context } from 'telegraf';
import dotenv from 'dotenv';
import * as svgCaptcha from 'svg-captcha';
import sharp from 'sharp';
import { Logger } from '../utils/Logger';

// For DB campaign checks
import { getCampaignByIdWithAdvertiser } from '../services/CampaignsService';
import { getReferralByCampaignAndUserTelegramId, recordReferralInDB } from '../services/ReferralService';
import { Referral } from '../entity/Referral';

// For chain checks
import { TonClient4 } from '@ton/ton';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { Address } from '@ton/core';
import { Campaign, CampaignData, AffiliateData } from '../contracts/Campaign';
import { TonConfig } from '../config/TonConfig';

// Telegram events
import { createTelegramEvent } from '../services/TelegramEventService';
import { getTelegramOpCodeByEventName } from '@common/TelegramEventsConfig';

dotenv.config();

/**
 * Create and export the bot instance.
 */
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

/**
 * For tracking captcha sessions in memory.
 */
interface CaptchaData {
  captchaText: string;
  campaignId: string;
  affiliateId: string;
  tries: number;
  expiresAt: number; // e.g., Date.now() + 12000 = 12s from now
}

// Active captchas: userTelegramId => CaptchaData
const activeCaptchas = new Map<number, CaptchaData>();

interface MyContext extends Context {
  startPayload?: string;
}

/**
 * START command handler:
 * 1) Parse <campaignId>_<affiliateId>
 * 2) Check DB & chain
 * 3) If valid, generate a CAPTCHA and ask user to solve
 */
bot.start(async (ctx: MyContext) => {

  try {
    const startPayload = ctx.startPayload;
    Logger.info(`Received /start with payload: ${startPayload}`);

    if (!startPayload) {
      await ctx.reply('Hello! Please use the referral link to start the bot.');
      return;
    }

    const [campaignId, affiliateId] = startPayload.split('_');
    if (!campaignId || !affiliateId) {
      await ctx.reply('Invalid /start link. Missing campaignId or affiliateId.');
      return;
    }

    const userTelegramId = ctx.from?.id;
    if (!userTelegramId) {
      await ctx.reply('Could not detect your Telegram ID. Please try again.');
      return;
    }

    Logger.info(`Parsed campaignId=${campaignId}, affiliateId=${affiliateId}, userId=${userTelegramId}`);

    // 1) Check if the campaign exists in DB
    const campaignFromDB = await getCampaignByIdWithAdvertiser(campaignId);
    if (!campaignFromDB) {
      Logger.warn(`Campaign not found for ID=${campaignId}`);
      await ctx.reply('Sorry, this campaign does not exist.');
      return;
    }
    // 2) Check "botCanVerify" or similar field
    if (!campaignFromDB.canBotVerify) {
      Logger.warn(`Campaign ID=${campaignId} is not allowed to verify events.`);
      await ctx.reply('This campaign is not accepting referrals at the moment.');
      return;
    }

    // 3) On-chain checks
    let endpoint;
    if (TonConfig.HTTP_ENDPOINT_NETWORK === 'testnet') {
      endpoint = await getHttpV4Endpoint({ network: 'testnet' });
    } else {
      endpoint = await getHttpV4Endpoint(); // mainnet
    }
    const client = new TonClient4({ endpoint });
    const campaignAddress = Address.parse(campaignFromDB.contractAddress);
    const campaignInstance = client.open(Campaign.fromAddress(campaignAddress));
    const campaignChainData: CampaignData = await campaignInstance.getCampaignData();
    if (!campaignChainData.isCampaignActive) {
      Logger.warn(`Campaign ID=${campaignId} is not active on chain.`);
      await ctx.reply('This campaign is not active on-chain. Please try again later.');
      return;
    }

    // 4) Verify affiliate on-chain
    const affiliateOnChainData: AffiliateData | null = await campaignInstance.getAffiliateData(BigInt(affiliateId));
    if (affiliateOnChainData == null || Number(affiliateOnChainData.state) === 0) {
      Logger.warn(`Affiliate ${affiliateId} does not exist or is not approved for Campaign ID=${campaignId}`);
      await ctx.reply('Affiliate not approved on-chain. Unable to verify events.');
      return;
    }

    // 5) Check if user is already referred in DB
    const existingReferral: Referral | null =
      await getReferralByCampaignAndUserTelegramId(campaignId, userTelegramId);
    if (existingReferral) {
      Logger.warn(`User ${userTelegramId} already referred for campaign=${campaignId}`);
      await ctx.reply('You have already been referred for this campaign.');
      return;
    }

    // -- All checks pass: Let's proceed with a CAPTCHA step --

    // Generate a captcha
    const captcha = svgCaptcha.create({
      size: 5,
      noise: 5,
      color: true,
      background: '#f2f2f2',
    });

    // Convert SVG to PNG buffer
    const pngBuffer = await sharp(Buffer.from(captcha.data)).png().toBuffer();

    // Save captcha in memory (expires in 12s, 0 tries so far)
    activeCaptchas.set(userTelegramId, {
      captchaText: captcha.text,
      campaignId,
      affiliateId,
      tries: 0,
      expiresAt: Date.now() + 15_000,
    });

    // Send captcha image
    await ctx.replyWithPhoto({ source: pngBuffer }, {
      caption: 'Please solve this CAPTCHA within 12 seconds.',
    });

  } catch (err) {
    Logger.error('Error in /start handler:', err);
    await ctx.reply('An error occurred while processing your request.');
  }
});

/**
 * TEXT messages: handle user attempts to solve the captcha.
 * If correct => record referral in DB => redirect user to channel link.
 */
bot.on('text', async (ctx) => {
  const userTelegramId = ctx.from?.id;
  if (!userTelegramId) {
    await ctx.reply('Could not read your Telegram ID. Please /start again.');
    return;
  }

  const activeData = activeCaptchas.get(userTelegramId);
  if (!activeData) {
    await ctx.reply('No active CAPTCHA. Please /start again.');
    return;
  }

  const { captchaText, campaignId, affiliateId } = activeData;
  const userSolution = ctx.message.text.trim();

  // Check if time is up
  if (Date.now() > activeData.expiresAt) {
    activeData.tries++;
    if (activeData.tries >= 4) {
      // too many tries
      activeCaptchas.delete(userTelegramId);
      await ctx.reply('❌ Time expired, and you have used all attempts. Please /start again.');
      return;
    }

    // generate new captcha
    const newCaptcha = svgCaptcha.create({
      size: 5,
      noise: 5,
      color: true,
      background: '#f2f2f2',
    });
    const newPngBuffer = await sharp(Buffer.from(newCaptcha.data)).png().toBuffer();

    activeData.captchaText = newCaptcha.text;
    activeData.expiresAt = Date.now() + 12_000; // reset expiration
    activeCaptchas.set(userTelegramId, activeData);

    await ctx.reply(`❌ Time expired on the previous CAPTCHA. This is attempt #${activeData.tries + 1} of 4.`);
    await ctx.replyWithPhoto({ source: newPngBuffer }, {
      caption: 'Please solve this new CAPTCHA within 12 seconds.',
    });
    return;
  }

  // Compare ignoring case
  if (userSolution.toLowerCase() !== captchaText.toLowerCase()) {
    activeData.tries++;
    if (activeData.tries >= 4) {
      activeCaptchas.delete(userTelegramId);
      await ctx.reply('❌ Incorrect. You have used all 4 attempts. Please /start again.');
      return;
    }

    // generate new captcha
    const newCaptcha = svgCaptcha.create({
      size: 5,
      noise: 10,
      color: true,
      background: '#f2f2f2',
    });
    const newPngBuffer = await sharp(Buffer.from(newCaptcha.data)).png().toBuffer();

    activeData.captchaText = newCaptcha.text;
    activeData.expiresAt = Date.now() + 12_000;
    activeCaptchas.set(userTelegramId, activeData);

    await ctx.reply(`❌ Incorrect CAPTCHA. Attempt #${activeData.tries + 1} of 4.`);
    await ctx.replyWithPhoto({ source: newPngBuffer }, {
      caption: 'Please solve this new CAPTCHA within 12 seconds.',
    });
    return;
  }

  // -- CAPTCHA correct! --
  activeCaptchas.delete(userTelegramId);
  const newReferral = await recordReferralInDB(userTelegramId, campaignId, parseInt(affiliateId, 10));
  Logger.info(`Referral created: ${JSON.stringify(newReferral)}`);

  Logger.info(`User ${userTelegramId} solved CAPTCHA for campaign=${campaignId}, affiliate=${affiliateId}.`);  

  // Next, get the channel invite link from DB
  const campaignFromDB = await getCampaignByIdWithAdvertiser(campaignId);
  if (!campaignFromDB || !campaignFromDB.inviteLink) {
    await ctx.reply('Invalid or missing campaign invite link. Contact support.');
    return;
  }

  // Give the user an inline button to join the channel
  await ctx.reply('✅ CAPTCHA solved! Tap below to join the channel:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Join Here',
            url: campaignFromDB.inviteLink, // e.g. "https://t.me/+SomePublicHandle"
          },
        ],
      ],
    },
  });
});

/**
 * Listen for 'chat_member' updates for join/leave events.
 * The bot must be an admin in that channel to receive these updates.
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

    // If the user joined
    if ((oldStatus === 'left' || oldStatus === 'kicked') && newStatus === 'member') {
      await createTelegramEvent({
        userTelegramId,
        isPremium,
        opCode: getTelegramOpCodeByEventName('JOINED_CHAT')!, // from your config
        chatId,
      });
      Logger.info(`User ${userTelegramId} JOINED chat ${chatId}`);
    }

    // If the user left
    if (oldStatus === 'member' && (newStatus === 'left' || newStatus === 'kicked')) {
      await createTelegramEvent({
        userTelegramId,
        isPremium,
        opCode: getTelegramOpCodeByEventName('LEFT_CHAT')!,
        chatId,
      });
      Logger.info(`User ${userTelegramId} LEFT chat ${chatId}`);
    }
  } catch (err) {
    Logger.error('Error processing chat_member update:', err);
  }
});
