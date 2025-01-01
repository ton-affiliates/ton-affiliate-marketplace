import axios from 'axios';
import { TelegramAsset, TelegramAssetType } from '../../../common/models';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const BOT_USERNAME = process.env.BOT_USERNAME || '';

export async function createTelegramAssetAndVerifyAdminPrivileges(
    channelName: string
): Promise<TelegramAsset | string> {
    try {
        console.log(`Processing channel: ${channelName}`);

        // Fetch updates to identify the channel
        const updatesResponse = await axios.get(`${TELEGRAM_API_URL}/getUpdates`);
        const updates = updatesResponse.data.result;

        const chatUpdate = updates.reverse().find((update: any) => {
            const chat = update.my_chat_member?.chat;
            return chat && (chat.username === channelName || chat.title === channelName);
        });

        if (!chatUpdate || !chatUpdate.my_chat_member?.chat?.id) {
            return `No updates found for the channel: ${channelName}. Ensure the bot is added as an admin.`;
        }

        const chatId = chatUpdate.my_chat_member.chat.id;

        // Fetch detailed chat data
        const chatDetailsResponse = await axios.get(`${TELEGRAM_API_URL}/getChat`, {
            params: { chat_id: chatId },
        });
        const chatDetails = chatDetailsResponse.data.result;

        console.log('Chat details:', chatDetails);

        // Determine if the channel is public or private
        const isPublic = !!chatDetails.username; // Public if username exists
        const url = isPublic
            ? `https://t.me/${chatDetails.username}`
            : chatDetails.invite_link || '';

        if (!url) {
            return `Could not determine the URL for the channel: ${channelName}.`;
        }

        // Create and return the TelegramAsset object
        const telegramAsset: TelegramAsset = {
            id: chatId,
            name: chatDetails.username || chatDetails.title || '',
            type: mapChatTypeToAssetType(chatDetails.type),
            isPublic,
            url,
        };

        console.log('TelegramAsset:', JSON.stringify(telegramAsset, null, 2));
        return telegramAsset;
    } catch (error: any) {
        console.error(`Error processing channel ${channelName}:`, error);

        if (error.response?.status === 403) {
            return `The bot lacks permissions to access the channel: ${channelName}.`;
        } else if (error.response?.status === 400) {
            return `Invalid channel name: ${channelName}.`;
        }
        return `An unexpected error occurred while processing the channel: ${channelName}.`;
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
