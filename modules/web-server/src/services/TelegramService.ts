// src/services/TelegramService.ts

import axios from 'axios';
import dotenv from 'dotenv';
import { Logger } from '../utils/Logger';
import { TelegramAssetType } from '@common/models';
import { getUserById, ensureUser } from '../services/UsersService';

dotenv.config();

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;


export interface TelegramAsset {
  id: number; // Unique numeric identifier (e.g., "-1001234567890")
  name: string; // from the API Public username (e.g., "Abu Ali Express Channel") 
  description: string;  // from the API
  type: TelegramAssetType; // Type of the Telegram asset (channel, group, etc.)
  isPublic: boolean; // Is this asset public or private
  url: string;  // invite link - which we will use as redirect URL (e.g., for private channels/groups: https://t.me/+1dKu7kfkdudmN2Y0 and for public: https://t.me/AbuAliExpress)
  photo?: Buffer;       // Actual image data (if we want to store the raw bytes)
  botIsAdmin: boolean,  // is our bot an admin in this asset
  adminPrivileges: string[],  // list of admin priviliges of our bot
  memberCount: number // num subscribers
}

export async function fetchChatInfo(telegramHandle: string): Promise<TelegramAsset> {
  try {
    const chatIdParam = `@${telegramHandle}`;
    Logger.info(`Fetching public chat info for handle: ${chatIdParam}`);

    // 1) Get basic chat info
    const chatResp = await axios.get(`${TELEGRAM_API_URL}/getChat`, {
      params: { chat_id: chatIdParam },
    });
    if (!chatResp.data.ok) {
      throw new Error(`Telegram API returned not ok: ${JSON.stringify(chatResp.data)}`);
    }
    const chat = chatResp.data.result;

    // 2) Extract fields
    const photoFileId = chat.photo?.big_file_id || null;

    // Build a base asset
    const telegramAsset: TelegramAsset = {
      id: chat.id,
      name: chat.title || telegramHandle,
      isPublic: true,  // else we couldn't fetch the public data from await axios.get(`${TELEGRAM_API_URL}/getChat`
      description: chat.description || '',
      type: mapChatTypeToAssetType(chat.type),
      url: `https://t.me/${telegramHandle}`,
      photo: undefined,
      botIsAdmin: false,
      adminPrivileges: [],
      memberCount: 0,
    };

    // 3) If there's a photo, download it
    if (photoFileId) {
      Logger.info(`Found photoFileId: ${photoFileId}, downloading image...`);
      try {
        const photoBuffer = await downloadTelegramImage(photoFileId);
        telegramAsset.photo = photoBuffer;
        Logger.info(`Downloaded photo successfully, size: ${photoBuffer.length} bytes`);
      } catch (error: any) {
        Logger.error(`Failed to download Telegram image: ${error.message}`);
      }
    }

    // 4) Optional: fetch chat members count
    //    If the bot is an admin with "can_invite_users", we can often do getChatMembersCount
    let memberCount = 0;
    try {
      const countResp = await axios.get(`${TELEGRAM_API_URL}/getChatMembersCount`, {
        params: { chat_id: chatIdParam },
      });
      if (countResp.data.ok) {
        memberCount = countResp.data.result;
        telegramAsset.memberCount = memberCount;
        Logger.info(`Channel has ${memberCount} members (subscribers).`);
      } else {
        Logger.warn(`getChatMembersCount returned not ok: ${JSON.stringify(countResp.data)}`);
      }
    } catch (err) {
      Logger.warn(`Could not fetch channel member count: ${String(err)}`);
    }

    // 5) Verify bot is admin with "Add members" privilege (which Telegram calls "can_invite_users")
    //    We'll do getChatMember(chat_id, user_id_of_bot)
    const botIdResp = await axios.get(`${TELEGRAM_API_URL}/getMe`);
    if (!botIdResp.data.ok) {
      throw new Error(`Telegram API getMe not ok: ${JSON.stringify(botIdResp.data)}`);
    }
    const botUserId = botIdResp.data.result.id; // The numeric ID of our bot

    // Now fetch our bot's status in this chat
    const memberResp = await axios.get(`${TELEGRAM_API_URL}/getChatMember`, {
      params: { chat_id: chatIdParam, user_id: botUserId },
    });
    if (!memberResp.data.ok) {
      throw new Error(`Telegram API getChatMember not ok: ${JSON.stringify(memberResp.data)}`);
    }

    const botStatus = memberResp.data.result;
    Logger.debug("botStatus: " + JSON.stringify(botStatus));

    if (botStatus.status === 'administrator') {
      telegramAsset.botIsAdmin = true;
    
      const privileges: string[] = [];
    
      if (botStatus.can_be_edited) {
        privileges.push('can_be_edited');
      }
      if (botStatus.can_manage_chat) {
        privileges.push('can_manage_chat');
      }
      if (botStatus.can_change_info) {
        privileges.push('can_change_info');
      }
      if (botStatus.can_post_messages) {
        privileges.push('can_post_messages');
      }
      if (botStatus.can_edit_messages) {
        privileges.push('can_edit_messages');
      }
      if (botStatus.can_delete_messages) {
        privileges.push('can_delete_messages');
      }
      if (botStatus.can_invite_users) {
        privileges.push('can_invite_users');
      }
      if (botStatus.can_restrict_members) {
        privileges.push('can_restrict_members');
      }
      if (botStatus.can_promote_members) {
        privileges.push('can_promote_members');
      }
      if (botStatus.can_manage_video_chats) {
        privileges.push('can_manage_video_chats');
      }
      if (botStatus.can_manage_voice_chats) {
        privileges.push('can_manage_voice_chats');
      }
      if (botStatus.can_post_stories) {
        privileges.push('can_post_stories');
      }
      if (botStatus.can_edit_stories) {
        privileges.push('can_edit_stories');
      }
      if (botStatus.can_delete_stories) {
        privileges.push('can_delete_stories');
      }
      // In the raw object, you might also see `is_anonymous`, etc. 
      // If you want to track that as a "privilege," you can add it as well:
      if (botStatus.is_anonymous) {
        privileges.push('is_anonymous');
      }
    
      // Save them
      telegramAsset.adminPrivileges = privileges;
    } else {
      Logger.warn(`Bot is not admin in this channel. Bot status: ${botStatus.status}`);
    }

    return telegramAsset;
  } catch (error: any) {
    Logger.error(`Failed to fetch chat info for handle: ${telegramHandle}`, error);
    throw new Error(`Could not retrieve info for Telegram handle: ${telegramHandle}. ${error.message}`);
  }
}

/**
 * Download Telegram image by file ID using getFile, then fetch from the returned path.
 */
async function downloadTelegramImage(photoFileId: string): Promise<Buffer> {
  // 1) getFile to get file_path
  const getFileResponse = await axios.get(`${TELEGRAM_API_URL}/getFile`, {
    params: { file_id: photoFileId },
  });
  if (!getFileResponse.data.ok) {
    throw new Error(`Error fetching file path: ${JSON.stringify(getFileResponse.data)}`);
  }
  const filePath = getFileResponse.data.result.file_path;
  if (!filePath) {
    throw new Error(`File path not found in getFile result: ${JSON.stringify(getFileResponse.data.result)}`);
  }

  // 2) Download the actual file
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
  return Buffer.from(fileResponse.data);
}

/**
 * Convert Telegram chat.type string to our enum
 */
function mapChatTypeToAssetType(chatType: string): TelegramAssetType {
  switch (chatType) {
    case 'channel':
      return TelegramAssetType.CHANNEL;
    // case 'group':
    //   return TelegramAssetType.GROUP;
    // case 'supergroup':
    //   return TelegramAssetType.SUPER_GROUP;
    // If you have a "mini-app" concept, you'd handle differently - mini app is a chat between a user and a bot (no chatId)
    default:
      throw new Error(`Unsupported or unexpected chat type: ${chatType}`);
  }
}

/**
 * Send a telegram message to userId (in a 1:1 chat).
 */
export async function sendTelegramMessage(
  userId: number,
  text: string,
  parseMode: string | null = null
) {
  const user = await getUserById(userId);
  if (!user) {
    Logger.error(`[sendTelegramMessage] Cannot find user with id: ${userId} in DB`);
    return;
  }

  try {
    if (parseMode) {
      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: userId,
        text,
        parse_mode: parseMode,
      });
    } else {
      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: userId,
        text,
      });
    }

    user.canMessage = true;
    await ensureUser(user);
  } catch (err: any) {
    // If the error indicates the user blocked the bot
    if (err.response?.data?.error_code === 403) {
      user.canMessage = false;
      await ensureUser(user);
    }
    Logger.error(err);
  }
}
