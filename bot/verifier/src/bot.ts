import { Telegraf } from 'telegraf';
import * as svgCaptcha from 'svg-captcha';
import sharp from 'sharp';
import dotenv from 'dotenv';
// @ts-ignore
import rateLimit from 'telegraf-ratelimit';

// EXAMPLE - affiliate link to campaign 12345 and affiliate 1:
// https://t.me/ton_affiliates_verifier_bot?start=12345_0

dotenv.config();

const BOT_API_KEY = process.env.BOT_API_KEY || '';
const bot = new Telegraf(BOT_API_KEY);

const limitConfig = {
    window: 1000, // 1 second
    limit: 2,     // Max 1 request per second
    onLimitExceeded: (ctx: any) => ctx.reply('You are sending too many requests. Please slow down.')
};

bot.use(rateLimit(limitConfig));

type UserCaptchaData = {
    expectedCaptcha: string;
    retryNumbers: number;
};

const captchaState = new Map<number, UserCaptchaData>();

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const startPayload = ctx.startPayload;

    let campaignId = '';
    let affiliateId = '';

    if (startPayload) {
        const parts = startPayload.split('_');
        campaignId = parts[0] || '';
        affiliateId = parts[1] || '';
    }

    console.log(`User ID: ${userId}`);
    console.log(`Campaign ID: ${campaignId}`);
    console.log(`Affiliate ID: ${affiliateId}`);

    // Validate campaign and user (replace with Redis logic)
    // check if campaign exists and active?
    const isValidCampaign = true; // Simulate Redis check
    if (!isValidCampaign) {
        await ctx.reply('Invalid campaign. Please check your link.');
        return;
    }

    // If valid, send captcha
    await sendCaptcha(ctx, userId, 1);
});

async function sendCaptcha(ctx: any, userId: number, currRetryNum: number) {
    const captcha = svgCaptcha.create({
        size: 5,
        noise: 5,
        color: true,
        background: '#f2f2f2',
    });

    const captchaText = captcha.text;
    const captchaImage = captcha.data;

    captchaState.set(userId, {
        expectedCaptcha: captchaText,
        retryNumbers: currRetryNum,
    });

    const pngBuffer = await sharp(Buffer.from(captchaImage)).png().toBuffer();

    await ctx.replyWithPhoto(
        { source: pngBuffer },
        { caption: 'Please enter the letters shown in the image to verify you are human' }
    );
}

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userResponse = ctx.message.text;

    if (captchaState.has(userId)) {
        const userCaptchaData = captchaState.get(userId)!;

        if (userResponse.trim().toLowerCase() === userCaptchaData.expectedCaptcha.trim().toLowerCase()) {
            captchaState.delete(userId);

            // Fetch Telegram redirect URL from Redis
            const telegramRedirectUrl =  "https://t.me/TonAfiliatesTest";  // Replace with Redis fetch

            await ctx.reply(`✅ Captcha solved correctly\\! [Click Here](${telegramRedirectUrl})`, {
                parse_mode: 'MarkdownV2',
            });

            // TODO: Log to Redis: user joined campaign.  NExt bot will verify that the user actually joined.
        } else {


            if (userCaptchaData.retryNumbers >= 3) {
                await ctx.reply('❌ Too many failed attempts. Please try again later.');
                captchaState.delete(userId);
            } else {
                await ctx.reply(`❌ Incorrect captcha. Please try again (${userCaptchaData.retryNumbers+1}/3):`);
                await sendCaptcha(ctx, userId, userCaptchaData.retryNumbers + 1);
            }
        }
    } else {
        await ctx.reply('You must use this bot via a deep link.');
    }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

bot.launch().then(() => console.log('Bot is running...'));
