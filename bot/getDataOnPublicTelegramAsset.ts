import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || ''; // Your bot token
const bot = new Telegraf(BOT_TOKEN);

async function getChatDetails(chatId: string) {
    try {
        // Fetch basic chat information
        const chat = await bot.telegram.getChat(chatId);
        console.log('Chat Details:', chat);

        // Fetch chat administrators
        const admins = await bot.telegram.getChatAdministrators(chatId);
        console.log('Chat Administrators:', admins);

        // Fetch the number of members
        const memberCount = await bot.telegram.getChatMembersCount(chatId);
        console.log('Member Count:', memberCount);

        // Example: Fetch details about a specific user (optional)
        const testUserId = 123456789; // Replace with a valid user ID in the chat
        const userStatus = await bot.telegram.getChatMember(chatId, testUserId);
        console.log('User Status:', userStatus);
    } catch (error) {
        console.error('Error fetching chat details:', error);
    }
}

// Replace with the username or ID of the public group/channel
const publicGroupOrChannelId = '@PublicGroupOrChannelName'; // Use a username like @PublicChannelName

// Call the function
getChatDetails(publicGroupOrChannelId);

// Optional: Launch the bot for other interactions
bot.launch().then(() => console.log('Bot is running...'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
