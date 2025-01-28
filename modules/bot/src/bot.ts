import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import * as svgCaptcha from 'svg-captcha';
import sharp from 'sharp';
import { getCampaign, TelegramAssetType } from '../../typescript-web-server/src/redis/redis'; 
import { EventData, logVerifiedEvent } from "../../typescript-web-server/src/redis/redis"


dotenv.config();

const bot = new Telegraf(process.env.BOT_API_KEY || '');

const redis = new Redis(process.env.REDIS_URL || '');

// Store active CAPTCHAs
const activeCaptchas: Map<number, { campaignId: string; affiliateId: string }> = new Map();

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const startPayload = ctx.startPayload;

    if (startPayload) {
        const [campaignId, affiliateId] = startPayload.split('_');
        console.log(`User ID: ${userId}, Campaign ID: ${campaignId}, Affiliate ID: ${affiliateId}`);
        
        // Store the campaignId and affiliateId for this user
        activeCaptchas.set(userId, { campaignId, affiliateId });

        // Handle CAPTCHA Verification
        await sendCaptcha(ctx, userId);
    } else {
        ctx.reply('Welcome to the bot! Please use a valid deep link.');
    }
});

// CAPTCHA Handling
async function sendCaptcha(ctx: any, userId: number) {
    const captcha = svgCaptcha.create({
        size: 5,
        noise: 5,
        color: true,
        background: '#f2f2f2',
    });

    const captchaText = captcha.text;
    const captchaImage = captcha.data;

    const pngBuffer = await sharp(Buffer.from(captchaImage)).png().toBuffer();
    await ctx.replyWithPhoto({ source: pngBuffer }, { caption: 'Solve this CAPTCHA to continue.' });

    await redis.set(`captcha:${userId}`, captchaText, 'EX', 300); // Expires in 5 minutes
}

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const isPremiumUser = ctx.from.is_premium;
    const userCaptcha = await redis.get(`captcha:${userId}`);

    if (userCaptcha) {
        if (ctx.message.text.toLowerCase() === userCaptcha.toLowerCase()) {
            await redis.del(`captcha:${userId}`);

            const userCampaignData = activeCaptchas.get(userId);
            if (!userCampaignData) {
                await ctx.reply('⚠️ Could not find campaign data. Please start again.');
                return;
            }

            const { campaignId, affiliateId } = userCampaignData;

            // Retrieve the campaign data from Redis
            const campaignData = await getCampaign(campaignId);
            if (!campaignData || !affiliateId) {
                await ctx.reply('⚠️ Invalid campaign. Please check your link.');
                return;
            }

            // Redirect user to the campaign's URL
            const redirectUrl = campaignData.telegramAsset.url;
            await ctx.reply(`✅ CAPTCHA solved successfully! [Click here to join](${redirectUrl})`, {
                parse_mode: 'MarkdownV2',
            });

            const chatId = campaignData.telegramAsset.id;
            const eventType = 'captcha_verified';
            const additionalData = { affiliateId: affiliateId, isPremiumUser: isPremiumUser };

            await logVerifiedEvent(userId, chatId, eventType, additionalData);

            // Clear the user's campaign data from memory
            activeCaptchas.delete(userId);

            if (campaignData.telegramAsset.type == TelegramAssetType.CHANNEL) {
                await scheduleChannelVerification(userId, campaignData.telegramAsset.id);
            }
        } else {
            await ctx.reply('❌ Incorrect CAPTCHA. Please try again.');
        }
    } else {
        await ctx.reply('No active CAPTCHA. Please start again.');
    }
});







bot.launch().then(() => console.log('bot is running...'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
