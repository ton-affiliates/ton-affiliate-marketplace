// https://t.me/TonAffiliatesActionsVerifierBot
// @TonAffiliatesActionsVerifierBot

import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const BOT_API_KEY = process.env.TELEGRAM_VERIFIER_BOT_API_KEY || '';
const bot = new Telegraf(BOT_API_KEY);

// const redis = new Redis(process.env.REDIS_URL || '');

// group or supergroup
bot.on('new_chat_members', async (ctx) => {

    console.log(ctx.chat.id);
    console.log(ctx.message);

    const chatId = ctx.chat.id;
    const members = ctx.message.new_chat_members;

    for (const member of members) {

        console.log(member);
        
        const userId = member.id;

        // Log join event
        //await redis.set(`user:${userId}:joined:${chatId}`, Date.now());
        console.log(`User ${userId} joined chat ${chatId}`);

        // Check if the user is a Telegram Premium user
        const isPremium = member.is_premium || false;
        //await redis.set(`user:${userId}:premium:${chatId}`, isPremium ? 'Yes' : 'No');

        console.log(`User ${userId} Premium Status: ${isPremium ? 'Yes' : 'No'}`);
    }
});

// channel
bot.command('check_member', async (ctx) => {
    const userId = ctx.from.id; // The user interacting with the bot
    const channelId = '@TonAffiliatesTestChannel'; // Replace with your channel username or ID

    try {
        const member = await bot.telegram.getChatMember(channelId, userId);
        console.log(`Membership status for user ${userId}: ${member.status}`);

        if (['member', 'administrator', 'creator'].includes(member.status)) {
            await ctx.reply(`✅ You are a member of the channel: ${channelId}`);
        } else {
            await ctx.reply(`❌ You are not a member of the channel: ${channelId}`);
        }
    } catch (error) {
        console.error('Error checking membership:', error);
        await ctx.reply('⚠️ Unable to check your membership status. Please try again later.');
    }
});



// group or supergroup
bot.on('left_chat_member', async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.message.left_chat_member.id;

    // Log leave event
    //await redis.set(`user:${userId}:left:${chatId}`, Date.now());
    console.log(`User ${userId} left chat ${chatId}`);
});

// group or supergroup
bot.on('message', async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    // Track comments/messages in the group
    if ((ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') && 'text' in ctx.message) {
        //await redis.incr(`user:${userId}:comments:${chatId}`);
        console.log(`User ${userId} commented in chat ${chatId}`);
    }
});


// Periodic engagement tracking - verify user stayed for 2 weeks (or any given time)
// setInterval(async () => {
//     const keys = await redis.keys('user:*:joined:*');

//     for (const key of keys) {
//         const [_, userId, __, chatId] = key.split(':');
//         const joinedAt = await redis.get(key);

//         if (joinedAt) {
//             const timeStayed = Date.now() - parseInt(joinedAt);
//             const twoWeeks = 2 * 7 * 24 * 60 * 60 * 1000; // 2 weeks in milliseconds

//             if (timeStayed >= twoWeeks) {
//                 console.log(`User ${userId} has stayed in chat ${chatId} for 2 weeks.`);
//                 // Log the commissionable event
//                 await redis.set(`user:${userId}:stayed:${chatId}`, '2 weeks');
//             }
//         }
//     }
// }, 24 * 60 * 60 * 1000); // Run every 24 hours

bot.launch().then(() => console.log('Event Verifier Bot is running...'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


// subscribe example

// import Redis from 'ioredis';
// import { TelegramEvent, EventType, TelegramAssetType } from '../../common';

// const redis = new Redis(process.env.REDIS_URL || '');

// async function startSubscriber() {
//     // Subscribe to the 'user:verified' channel
//     await redis.subscribe('user:verified', (err, count) => {
//         if (err) {
//             console.error('Failed to subscribe to Redis channel:', err);
//         } else {
//             console.log(`Subscribed to ${count} Redis channel(s).`);
//         }
//     });

//     // Listen for messages on the subscribed channel
//     redis.on('message', (channel, message) => {
//         if (channel === 'user:verified') {
//             try {
//                 // Parse the incoming message
//                 const event: TelegramEvent = JSON.parse(message);
//                 console.log('Received event:', event);

//                 // Handle the event based on its type
//                 switch (event.eventType) {
//                     case EventType.CAPTCHA_SOLVED:
//                         console.log(`Captcha solved by user ${event.userId} for campaign ${event.campaignId}`);
//                         break;

//                     case EventType.CHANNEL_USER_IS_MEMBER:
//                         console.log(`User ${event.userId} is a member of channel ${event.telegramAsset.name}`);
//                         break;

//                     // Add additional cases for other event types
//                     default:
//                         console.log('Unhandled event type:', event.eventType);
//                 }
//             } catch (err) {
//                 console.error('Failed to process event message:', err);
//             }
//         }
//     });
// }

// // Start the subscriber
// startSubscriber().catch((err) => {
//     console.error('Failed to start Redis subscriber:', err);
// });
