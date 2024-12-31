import axios from 'axios';
import { TelegramAsset, TelegramAssetType } from '../../../common/models';

const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const BOT_USERNAME: string = process.env.BOT_USERNAME || '';

if (!TELEGRAM_BOT_TOKEN) {
    console.error('Error: TELEGRAM_BOT_TOKEN is not set in the .env file.');
    process.exit(1);
}

if (!BOT_USERNAME) {
    console.error('Error: BOT_USERNAME is not set in the .env file.');
    process.exit(1);
}

/**
 * Send a message to a Telegram chat
 */
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

/**
 * Verify if the bot is an admin in a specified chat
 */
export async function isBotAdminInChat(chatId: number): Promise<boolean> {
    try {
        const response = await axios.get(`${TELEGRAM_API_URL}/getChatAdministrators`, {
            params: { chat_id: chatId },
        });

        const admins = response.data.result;

        // Check if the bot is listed as an admin
        const isAdmin = admins.some(
            (admin: any) => admin.user.is_bot && admin.user.username === BOT_USERNAME
        );

        return isAdmin;
    } catch (error) {
        console.error(`Failed to verify bot admin status for chat ID ${chatId}:`, error);
        throw new Error('Error verifying bot admin status');
    }
}


/**
 * Fetch Telegram Asset Details
 * @param chatId - The unique identifier of the chat or group
 * @returns TelegramAsset object
 */
export async function createTelegramAsset(chatId: number): Promise<TelegramAsset> {
    try {
        const response = await axios.post(`${TELEGRAM_API_URL}/getChat`, { chat_id: chatId });

        const chatData = response.data.result;

        const telegramAsset: TelegramAsset = {
            id: chatData.id,
            name: chatData.username || chatData.title || '', // Public username or chat title
            type: mapChatTypeToAssetType(chatData.type),
            isPublic: !!chatData.username, // If the username exists, it is public
            url: chatData.username
                ? `https://t.me/${chatData.username}`
                : `https://t.me/+${chatData.invite_link || ''}`, // Public or private link
        };

        return telegramAsset;
    } catch (error) {
        console.error(`Failed to fetch chat details: ${error}`);
        throw new Error('Unable to create TelegramAsset object');
    }
}

/**
 * Map Telegram chat type to TelegramAssetType
 * @param chatType - The type of chat as returned by Telegram
 * @returns TelegramAssetType
 */
function mapChatTypeToAssetType(chatType: string): TelegramAssetType {
    switch (chatType) {
        case 'channel':
            return TelegramAssetType.CHANNEL;
        case 'group':
            return TelegramAssetType.GROUP;
        case 'supergroup':
            return TelegramAssetType.SUPER_GROUP;
        case 'forum':
            return TelegramAssetType.FORUM;
        default:
            throw new Error(`Unsupported chat type: ${chatType}`);
    }
}
