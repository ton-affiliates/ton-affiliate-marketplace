import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import * as svgCaptcha from 'svg-captcha';
import sharp from 'sharp';
import { getCampaign, TelegramAssetType, getCampaignByChatId } from '../../redisCommon'; 

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

            await logVerifiedEvent(userId, campaignData.telegramAsset.id, 'captcha_verified', {
                affiliateId: affiliateId
            });

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


// Helper to log verified events
async function logVerifiedEvent(userId: number, chatId: number, eventType: string, additionalData: Record<string, any> = {}) {
    const campaignId = await getCampaignByChatId(chatId);
    const isPremium = additionalData.isPremium || false;

    const eventData = {
        timestamp: Date.now(),
        userId,
        chatId,
        eventType,
        campaignId,
        isPremium
    };

    const eventKey = `event:user:${userId}:${eventType}:${chatId}`;
    await redis.setnx(eventKey, JSON.stringify(eventData)); // set each event (e.g. each key - only once)
    console.log(`Logged verified event: ${eventKey}`, eventData);
}

// Event: New Chat Members
bot.on('new_chat_members', async (ctx) => {
    const chatId = ctx.chat.id;
    const members = ctx.message.new_chat_members;

    for (const member of members) {
        const userId = member.id;

        await logVerifiedEvent(userId, chatId, 'joined', {
            isPremium: member.is_premium || false,
        });

        console.log(`User ${userId} joined chat ${chatId}`);
    }
});


// Event: Left Chat Member
bot.on('left_chat_member', async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.message.left_chat_member.id;

    await logVerifiedEvent(userId, chatId, 'left', {});

    console.log(`User ${userId} left chat ${chatId}`);
});

// Periodic Engagement Tracking with Membership Verification
setInterval(async () => {
    const keys = await redis.keys('user:*:joined:*');

    for (const key of keys) {
        const [_, userId, __, chatId] = key.split(':');
        const joinedAt = await redis.get(key);

        if (joinedAt) {
            const timeStayed = Date.now() - parseInt(joinedAt, 10);
            const twoWeeks = 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks in milliseconds

            if (timeStayed >= twoWeeks) {
                try {
                    // Check if the user is still a member of the chat
                    const member = await bot.telegram.getChatMember(Number(chatId), Number(userId));
                    const isMember = ['member', 'administrator', 'creator'].includes(member.status);

                    if (isMember) {
                        console.log(`User ${userId} has stayed in chat ${chatId} for 2 weeks and is still a member.`);
                        await logVerifiedEvent(
                            parseInt(userId, 10),
                            parseInt(chatId, 10),
                            'stayed_two_weeks',
                            { status: member.status }
                        );
                    } else {
                        console.log(`User ${userId} has stayed in chat ${chatId} for 2 weeks but is no longer a member.`);
                        // Optionally, log this event as a separate type
                        await logVerifiedEvent(
                            parseInt(userId, 10),
                            parseInt(chatId, 10),
                            'left_after_two_weeks',
                            { status: member.status }
                        );
                    }
                } catch (error) {
                    console.error(`Error verifying membership for user ${userId} in chat ${chatId}:`, error.message);
                }
            }
        }
    }
}, 24 * 60 * 60 * 1000); // Run every 24 hours





// Store verification requests after CAPTCHA
async function scheduleChannelVerification(userId: number, channelId: number) {
    const verificationKey = `verification:channel:${channelId}:user:${userId}`;
    await redis.set(verificationKey, 'pending', 'EX', 300); // Store for 5 minutes
    console.log(`Scheduled verification for user ${userId} in channel ${channelId}`);
}

// Periodic verification loop
setInterval(async () => {
    const keys = await redis.keys('verification:channel:*:user:*');

    for (const key of keys) {
        const [, , channelId, , userId] = key.split(':');
        try {
            const member = await bot.telegram.getChatMember(Number(channelId), Number(userId));
            const isMember = ['member', 'administrator', 'creator'].includes(member.status);

            if (isMember) {
                console.log(`User ${userId} is now a member of channel ${channelId}`);
                await logVerifiedEvent(Number(userId), Number(channelId), 'joined', {
                    status: member.status,
                });

                // Remove the verification key after success
                await redis.del(key);
            }
        } catch (error) {
            console.error(`Error verifying user ${userId} in channel ${channelId}:`, error);
        }
    }
}, 10 * 1000); // Run every 10 seconds




bot.launch().then(() => console.log('bot is running...'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
