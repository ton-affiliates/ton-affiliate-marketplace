import axios from 'axios';
import { TelegramAsset, TelegramAssetType } from '@common/models';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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

// Interfaces for API responses
interface TelegramApiResponse<T> {
    ok: boolean;
    result: T;
}

interface Update {
    update_id: number;
    my_chat_member?: {
        chat: {
            id: number;
            title?: string;
            type: string;
            username?: string;
        };
        from: {
            id: number;
            is_bot: boolean;
            first_name: string;
            username: string;
            language_code: string;
        };
        date: number;
        old_chat_member: {
            user: {
                id: number;
                is_bot: boolean;
                first_name: string;
                username: string;
            };
            status: string;
        };
        new_chat_member: {
            user: {
                id: number;
                is_bot: boolean;
                first_name: string;
                username: string;
            };
            status: string;
            can_invite_users?: boolean;
        };
    };
}

interface ChatDetails {
    id: number;
    title: string;
    type: string;
    username?: string;
}

interface ChatAdministrator {
    user: {
        id: number;
        is_bot: boolean;
    };
    can_invite_users?: boolean;
    can_manage_chat?: boolean;
}

/**
 * Create a TelegramAsset from a URL
 * @param url - The URL to process (invite link or channel username)
 * @returns TelegramAsset or an error message
 */
export async function createTelegramAssetFromUrl(url: string): Promise<TelegramAsset | string> {
    try {
        console.log(`Processing URL: ${url}`);

        // Regex patterns
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

        let chatId: number | null = null;
        let chatType: string | null = null;
        let chatTitle: string | null = null;
        let isPublic: boolean = false;
        let urlForChannel: string = url;

        if (inviteCode) {
            // Private channel handling
            console.log('Fetching updates to resolve private chat ID...');

            const updatesResponse = await axios.get<TelegramApiResponse<Update[]>>(`${TELEGRAM_API_URL}/getUpdates`, {
                params: { offset: '0', limit: 100, timeout: 0 },
            });
            const updates = updatesResponse.data.result;

            console.log('Updates received:', JSON.stringify(updates, null, 2));

            const chatUpdate = updates.reverse().find((update) => {
                if (update.my_chat_member) {
                    const status = update.my_chat_member.new_chat_member.status;
                    return status === 'administrator' || status === 'member';
                }
                return false;
            });

            if (chatUpdate && chatUpdate.my_chat_member?.chat?.id) {
                chatId = chatUpdate.my_chat_member.chat.id;
                chatType = chatUpdate.my_chat_member.chat.type;
                chatTitle = chatUpdate.my_chat_member.chat.title || 'Unknown';
                isPublic = !!chatUpdate.my_chat_member.chat.username;
                urlForChannel = isPublic ? `https://t.me/${chatUpdate.my_chat_member.chat.username}` : url;
                console.log(`Chat ID resolved from updates: ${chatId}`);
            } else {
                console.error('No matching chat updates found.');
                return `The bot cannot access the private channel with invite link: ${url}. Ensure the bot is added as an admin and has received recent updates.`;
            }
        } else if (username) {
            // Public channel handling
            console.log(`Fetching details for public username: ${username}`);
            const chatDetailsResponse = await axios.get<TelegramApiResponse<ChatDetails>>(`${TELEGRAM_API_URL}/getChat`, {
                params: { chat_id: `@${username}` },
            });
            const chatDetails = chatDetailsResponse.data.result;
            chatId = chatDetails.id;
            chatType = chatDetails.type;
            chatTitle = chatDetails.title;
            isPublic = !!chatDetails.username;
            urlForChannel = isPublic ? `https://t.me/${username}` : url;
            console.log(`Chat details fetched successfully: ${chatId}`);
        }

        if (!chatId || !chatType) {
            return `Unable to resolve chat details for the provided URL: ${url}. Please ensure the bot is added as an admin.`;
        }

        console.log('Verifying bot privileges...');
        const adminResponse = await axios.get<TelegramApiResponse<ChatAdministrator[]>>(`${TELEGRAM_API_URL}/getChatAdministrators`, {
            params: { chat_id: chatId },
        });

        const admins = adminResponse.data.result;
        const botAdmin = admins.find((admin) => admin.user.is_bot);

        if (!botAdmin) {
            return `The bot is not an admin in the channel. Please add the bot as an admin.`;
        }

        if (isPublic) {
            if (!botAdmin.can_invite_users) {
                return `For public channels, the bot needs the privilege "Add Members" to manage invite links.`;
            }
        } else {
            if (!botAdmin.can_manage_chat) {
                return `For private channels, the bot needs the privilege "Manage Chat" to function properly.`;
            }
        }

        const telegramAsset: TelegramAsset = {
            id: chatId,
            name: chatTitle || username || inviteCode || 'Unknown',
            type: mapChatTypeToAssetType(chatType),
            isPublic,
            url: urlForChannel,
        };

        console.log('TelegramAsset:', JSON.stringify(telegramAsset, null, 2));
        return telegramAsset;
    } catch (error: any) {
        console.error(`Error processing URL: ${url}`, error);

        if (error.response) {
            console.error('Error Response Data:', error.response.data);
            console.error('Error Response Status:', error.response.status);
            console.error('Error Response Headers:', error.response.headers);
            if (error.response.status === 403) {
                return `The bot lacks permissions to access the chat associated with: ${url}.`;
            } else if (error.response.status === 400) {
                return `Invalid URL provided: ${url}.`;
            }
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error Setting Up Request:', error.message);
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
