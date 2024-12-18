import { Telegraf, Markup } from 'telegraf';
import { exec } from 'child_process';
import { promisify } from 'util';
import { greet } from './hello';  // Import greet function
import dotenv from 'dotenv';
import TonWeb from 'tonweb';

dotenv.config();


const BOT_API_KEY = process.env.BOT_API_KEY || '';
const TON_API_ENDPOINT = process.env.TON_API_ENDPOINT || '';
const TON_API_KEY = process.env.TON_API_KEY || '';

const bot = new Telegraf(BOT_API_KEY);
const execPromise = promisify(exec);

// Initialize TonWeb with the public endpoint
const tonweb = new TonWeb(new TonWeb.HttpProvider(TON_API_ENDPOINT, { apiKey: TON_API_KEY }));

// State to track user actions
const userState = new Map<number, string>();

// Main command to start the bot
bot.start((ctx) => {
    ctx.reply(
        'Welcome to the Affiliate Center Bot! 🎉\n\nWhat would you like to do?',
        Markup.inlineKeyboard([
            [Markup.button.callback('Connect Wallet', 'connect_wallet')],
            [Markup.button.callback('Check Balance', 'check_balance')],
        ])
    );
});

// Action: Connect Wallet
bot.action('connect_wallet', async (ctx) => {
    const userId = ctx.from.id;
    userState.set(userId, 'awaiting_wallet'); // Set user state to awaiting wallet address
    await ctx.reply('Please provide your TON wallet address:');
});

// Action: Check Balance
bot.action('check_balance', async (ctx) => {
    const userId = ctx.from.id;
    userState.set(userId, 'awaiting_balance'); // Set user state to awaiting balance input
    await ctx.reply('Please provide your TON wallet address to check balance:');
});

// Handle text input from users
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const currentState = userState.get(userId);

    if (currentState === 'awaiting_wallet') {
        const walletAddress = ctx.message.text.trim();
        if (walletAddress) {
            await ctx.reply(`✅ Wallet connected successfully!\nAddress: \`${walletAddress}\``, {
                parse_mode: 'Markdown',
            });
            userState.delete(userId); // Clear user state
        } else {
            await ctx.reply('❌ Invalid wallet address. Please try again.');
        }
    } else if (currentState === 'awaiting_balance') {
        const walletAddress = ctx.message.text.trim();
        try {
            const balance = await tonweb.getBalance(walletAddress);
            console.log("walletAddress", walletAddress);
            console.log("balance", balance);
            const tonBalance = TonWeb.utils.fromNano(balance);
            await ctx.reply(`💰 Your wallet balance is: *${tonBalance} TON*`, {
                parse_mode: 'Markdown',
            });
        } catch (err) {
            console.error(err);
            await ctx.reply('❌ Failed to fetch balance. Please ensure the address is correct.');
        }
        userState.delete(userId); // Clear user state
    } else {
        // Default behavior for unrecognized text
        ctx.reply('Unknown command. Please use /start to begin.');
    }
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Launch the bot
bot.launch().then(() => console.log('Bot is running...'));