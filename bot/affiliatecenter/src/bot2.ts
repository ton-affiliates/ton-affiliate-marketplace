import { Telegraf, Markup } from 'telegraf';
import { exec } from 'child_process';
import { promisify } from 'util';
import { greet } from './hello';  // Import greet function
import dotenv from 'dotenv';
import TonWeb from 'tonweb';

dotenv.config();

const bot = new Telegraf('7743271481:AAEEn-j_eIsLfX5g37KAYwKi9Il7BJavzHA');
const execPromise = promisify(exec);
const BOT_API_KEY = process.env.BOT_API_KEY || '';
const TON_API_ENDPOINT = process.env.TON_API_ENDPOINT || '';
const TON_API_KEY = process.env.TON_API_KEY || '';

console.log('BOT_API_KEY:', BOT_API_KEY);  // Debugging
// Command to run your TypeScript file
bot.command('runfile', async (ctx) => {
    try {
      // Assuming your TypeScript file is named "script.ts" and located in ./scripts folder
      const { stdout, stderr } = await execPromise('npx blueprint ./scripts/script.ts');
      
      // Send the output or error to Telegram
      if (stdout) {
        await ctx.reply('Output:\n${stdout}');
      }
      if (stderr) {
        await ctx.reply('Error:\n${stderr}');
      }
    } catch (err) {
      console.error(err);
      await ctx.reply('An error occurred while running the script.');
    }
  });

bot.command('greet', (ctx) => {
    // Extract the name from the message
    const name = (ctx.message.text.split(' ')[1] || '').trim();
    console.log('Received name:', name);  // Debugging

    if (!name) {
        ctx.reply('Please provide a name after the /greet command.');
        return;
    }

    // Call the greet function
    const greetingMessage = greet(name);
    console.log('Greeting message:', greetingMessage);  // Debugging

    // Check if the greeting message is valid and not empty
    if (greetingMessage && greetingMessage.trim()) {
        ctx.reply(greetingMessage);  // Send the greeting message back to the user
    } else {
        ctx.reply('Oops, something went wrong with the greeting message.');
    }
});

bot.launch().then(() => {
    console.log('Bot is running...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));