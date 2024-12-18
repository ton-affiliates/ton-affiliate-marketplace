import { Telegraf, Markup } from 'telegraf';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as svgCaptcha from 'svg-captcha';
import { createReadStream, writeFileSync, unlinkSync } from 'fs';
import { greet } from './hello';  // Import greet function
import sharp from 'sharp'; // Import sharp
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

// State: Store user verification, wallet addresses, and captcha
interface UserState {
    isVerified: boolean;
    currentState: string;
}

// State to track user actions
const userState = new Map<number, UserState>();
const captchaState = new Map<number, string>();

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    await sendCaptcha(ctx, userId);
});

// Function to generate and send the captcha
async function sendCaptcha(ctx: any, userId: number) {
    // Generate a captcha
    const captcha = svgCaptcha.create({
        size: 5,
        noise: 2,
        color: true,
        background: '#f2f2f2',
    });

    const captchaText = captcha.text; // The expected answer
    const captchaImage = captcha.data;

    // Save the captcha text in state
    captchaState.set(userId, captchaText);

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(captchaImage))
        .png()
        .toBuffer();

    // Save the SVG to a temporary file
   // const filePath = `captcha_${userId}.svg`;
  //  writeFileSync(filePath, captchaImage);

    // Send captcha image to user
    await ctx.replyWithPhoto(
      //  { source: createReadStream(filePath) },
        { source: pngBuffer },
        { caption: 'Welcome to the Affiliate Center Bot! 🎉\n\n🤖 Please enter the letters shown in the image to verify you are human:' }
    );

    // Clean up the file
    //unlinkSync(filePath);
}




// Action: Connect Wallet
bot.action('connect_wallet', async (ctx) => {
    const userId = ctx.from.id;
  
    if (userState.get(userId)?.isVerified) {
        userState.set(userId, { isVerified: true, currentState:  'awaiting_wallet'});
        await ctx.reply('Please provide your TON wallet address:');
    } else {
        await ctx.reply('⚠️ You must verify using the captcha first. Type /start to begin.');
    }
});

// Action: Check Balance
bot.action('check_balance', async (ctx) => {
    const userId = ctx.from.id;

    if (userState.get(userId)?.isVerified) {
        userState.set(userId, { isVerified: true, currentState:  'awaiting_balance'});
        await ctx.reply('Please provide your TON wallet address to check balance:');
    } else {
        await ctx.reply('⚠️ You must verify using the captcha first. Type /start to begin.');
    }
});


// Handle Captcha Verification
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userResponse = ctx.message.text.trim();

    // Check if user has a pending captcha
    if (captchaState.has(userId)) {
        const expectedCaptcha = captchaState.get(userId);

        if (expectedCaptcha && userResponse.toLowerCase() === expectedCaptcha.toLowerCase()) {
            // Captcha solved
            captchaState.delete(userId);
            userState.set(userId, { isVerified: true, currentState:'awaiting_selection' });

            await ctx.reply(
                '✅ Captcha solved! \n\nWelcome to the Affiliate Center Bot! 🎉\n\nWhat would you like to do?',
                Markup.inlineKeyboard([
                    [Markup.button.callback('Connect Wallet', 'connect_wallet')],
                    [Markup.button.callback('Check Balance', 'check_balance')],
                ])
            );
        } else {
            // Incorrect captcha
            await ctx.reply('❌ Incorrect captcha. Please try again:');
            // Regenerate captcha and resend
            await sendCaptcha(ctx, userId);
        }
    } else if (userState.has(userId) && userState.get(userId)?.isVerified) {
        const currentState = userState.get(userId)?.currentState;

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
    } else {
        await ctx.reply('Please type /start to verify first.');
    }
});


// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Launch the bot
bot.launch().then(() => console.log('Bot is running...'));