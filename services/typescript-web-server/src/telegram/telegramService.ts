import axios from 'axios';

const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

if (!TELEGRAM_BOT_TOKEN) {
    console.error('Error: TELEGRAM_BOT_TOKEN is not set in the .env file.');
    process.exit(1);
}

// Send message to Telegram
export async function sendTelegramMessage(chatId: number, message: string): Promise<void> {
    try {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: message,
        });
        console.log(`Message sent to Telegram chat ID: ${chatId}`);
    } catch (error) {
        console.error(`Failed to send Telegram message: ${error}`);
    }
}







