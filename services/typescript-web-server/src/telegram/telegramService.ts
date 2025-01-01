import axios from 'axios';
import { TelegramAsset, TelegramAssetType } from '../../../common/models';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function createTelegramAssetFromUrl(url: string): Promise<TelegramAsset | string> {
    try {
        console.log(`Processing URL: ${url}`);

        // Updated regex for extracting invite code or username
        const inviteRegex = /t\.me\/\+([a-zA-Z0-9_-]+)/; // Private invite links
        const publicRegex = /t\.me\/([a-zA-Z0-9_]+)/;   // Public channels

        let inviteCode: string | null = null;
        let username: string | null = null;

        if (inviteRegex.test(url)) {
            inviteCode = url.match(inviteRegex)?.[1] || null;
            console.log(`Invite code extracted: ${inviteCode}`);
        } else if (publicRegex.test(url)) {
            username = url.match(publicRegex)?.[1] || null;
            console.log(`Public username extracted: ${username}`);
        } else {
            console.error(`Invalid URL format provided: ${url}`);
            return `Invalid channel or invite link provided: ${url}.`;
        }

        let chatId: string | null = null;
        let chatType: string | null = null;
        let chatTitle: string | null = null;

        if (inviteCode) {
            console.log('Fetching updates to resolve private chat ID...');
            const updatesResponse = await axios.get(`${TELEGRAM_API_URL}/getUpdates`);
            const updates = updatesResponse.data.result;
        
            console.log('Updates received:', JSON.stringify(updates, null, 2));
        
            const chatUpdate = updates.reverse().find((update: any) => {
                const chat = update.my_chat_member?.chat;
        
                // Match by invite link, title, or other attributes
                return (
                    chat &&
                    (chat.invite_link?.includes(inviteCode) || chat.title?.includes('TestChannel')) // Adjust matching criteria as needed
                );
            });
        
            if (chatUpdate && chatUpdate.my_chat_member?.chat?.id) {
                chatId = chatUpdate.my_chat_member.chat.id;
                chatType = chatUpdate.my_chat_member.chat.type;
                chatTitle = chatUpdate.my_chat_member.chat.title;
                console.log(`Chat ID resolved from updates: ${chatId}`);
            } else {
                console.error('No matching chat updates found.');
                return `The bot cannot access the private channel with invite link: ${url}. Ensure the bot is added as an admin and has received recent updates.`;
            }
        }
         else if (username) {
            console.log(`Fetching details for public username: ${username}`);
            const chatDetailsResponse = await axios.get(`${TELEGRAM_API_URL}/getChat`, {
                params: { chat_id: `@${username}` },
            });
            const chatDetails = chatDetailsResponse.data.result;
            chatId = chatDetails.id;
            chatType = chatDetails.type;
            chatTitle = chatDetails.title;
            console.log(`Chat details fetched successfully: ${chatId}`);
        }

        if (!chatId || !chatType) {
            console.log('No matching chat updates found. Verifying admin status directly...');
            const adminResponse = await axios.get(`${TELEGRAM_API_URL}/getChatAdministrators`, {
                params: { chat_id: chatId }, // Use known chatId if available or ask the admin for the channel ID
            });
        
            const admins = adminResponse.data.result;
            const botAdmin = admins.find((admin: any) => admin.user.is_bot);
        
            if (botAdmin) {
                chatId = botAdmin.chat.id;
                chatType = botAdmin.chat.type;
                chatTitle = botAdmin.chat.title;
            } else {
                return `The bot is not an admin in the channel, and no recent updates exist to resolve the chat.`;
            }
        }

        console.log('Verifying bot admin privileges...');
        const adminResponse = await axios.get(`${TELEGRAM_API_URL}/getChatAdministrators`, {
            params: { chat_id: chatId },
        });

        const admins = adminResponse.data.result;
        const botAdmin = admins.find((admin: any) => admin.user.is_bot);

        if (!botAdmin) {
            return `The bot is not an admin in the channel. Please add the bot as an admin.`;
        }

        if (!botAdmin.can_invite_users) {
            return `The bot does not have sufficient privileges (e.g., "Add members") in the channel. Ensure "Add members" is enabled.`;
        }

        const isPublic = !!username;
        const urlForChannel = isPublic ? `https://t.me/${username}` : url;

        const telegramAsset: TelegramAsset = {
            id: Number(chatId),
            name: chatTitle || username || inviteCode || 'Unknown',
            type: mapChatTypeToAssetType(chatType!),
            isPublic,
            url: urlForChannel,
        };

        console.log('TelegramAsset:', JSON.stringify(telegramAsset, null, 2));
        return telegramAsset;
    } catch (error: any) {
        console.error(`Error processing URL: ${url}`, error);

        if (error.response?.status === 403) {
            return `The bot lacks permissions to access the chat associated with: ${url}.`;
        } else if (error.response?.status === 400) {
            return `Invalid URL provided: ${url}.`;
        }
        return `An unexpected error occurred while processing the URL: ${url}.`;
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
