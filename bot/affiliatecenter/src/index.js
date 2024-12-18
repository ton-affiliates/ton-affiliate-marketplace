const { Telegraf } = require('telegraf');
const { exec } = require('child_process');

// Create a bot instance with your API token
const bot = new Telegraf('7743271481:AAEEn-j_eIsLfX5g37KAYwKi9Il7BJavzHA');

// Command to call the TypeScript file
bot.command('greet', (ctx) => {
    // Extract the name after the command
    const args = ctx.message.text.split(' ').slice(1); // Split and remove the '/greet'
    console.log('Extracted arguments:', args);

    // Get the name or use a default fallback
    const name = args[0] || 'stranger';
    console.log('Name to greet:', name);
    const command = `npx ts-node src/hello.ts ${name}`;
    console.log(`Executing command: ${command}`);

    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error('Error executing script:', err);
            ctx.reply('An error occurred while running the script.');
            return;
        }
        if (stderr) {
            console.error('Standard Error:', stderr);
            ctx.reply('An error occurred: ' + stderr);
            return;
        }
        console.log('Script Output:', stdout);
        ctx.reply(stdout.trim());
    });
});

bot.command('ping', (ctx) => ctx.reply('Pong!'));

// Start the bot
bot.launch()
    .then(() => console.log('Bot is running...'))
    .catch(console.error);

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));