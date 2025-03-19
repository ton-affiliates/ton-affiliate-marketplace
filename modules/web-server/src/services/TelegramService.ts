// src/services/TelegramService.ts

import axios from 'axios';
import dotenv from 'dotenv';
import { Logger } from '../utils/Logger';
import appDataSource from '../ormconfig';
import { TelegramAsset } from '../entity/TelegramAsset';

dotenv.config();

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// channel identifier os handle
export async function isUserMember(userId: number, channelId: string): Promise<boolean> {
  try {
    // Ensure the channel ID starts with '@' if it's a username
    if (!channelId.startsWith("@") && isNaN(Number(channelId))) {
      channelId = `@${channelId}`;
    }

    const response = await axios.get(`${TELEGRAM_API_URL}/getChatMember`, {
      params: { chat_id: channelId, user_id: userId },
    });

    const chatMember = response.data.result;
    Logger.info(`Checked membership for user ${userId} in ${channelId}: ${JSON.stringify(chatMember)}`);

    if (["member", "administrator", "creator"].includes(chatMember.status)) {
      return true;
    }

    return false;
  } catch (error: any) {
    Logger.error(`❌ Error checking membership for user ${userId} in ${channelId}: ${error.response?.data?.description || error.message}`);
    return false;
  }
}


/**
 * Gathers Telegram asset data (but does NOT persist it).
 *
 * @param chatIdentifier - The identifier (join link, @username, or numeric ID) for the Telegram chat.
 * @returns A partial TelegramAsset with the relevant fields populated.
 */
export async function getTelegramAssetDataFromTelegram(
  chatIdentifier: string
): Promise<Partial<TelegramAsset>> {
  try {
    Logger.info(`getTelegramAssetDataFromTelegram: Received chatIdentifier: "${chatIdentifier}"`);

    // 1) Normalize the identifier (strip "https://t.me/" if present)
    if (chatIdentifier.startsWith('https://t.me/')) {
      chatIdentifier = chatIdentifier.replace('https://t.me/', '');
    }

    // 2) Fetch the bot's user ID before we do anything else
    const botIdResp = await axios.get(`${TELEGRAM_API_URL}/getMe`);
    if (!botIdResp.data.ok) {
      throw new Error(`Failed to fetch bot info: ${JSON.stringify(botIdResp.data)}`);
    }
    const botUserId = botIdResp.data.result.id;
    Logger.info(`Bot user ID: ${botUserId}`);

    // 3) Resolve the chat identifier into a numeric or @username chatIdParam
    let chatIdParam: string;

    // If it's a join link (starts with "+"), attempt to derive chat ID from membership
    if (chatIdentifier.startsWith('+')) {
      Logger.info(`Join link detected: "${chatIdentifier}". Attempting to resolve chat ID...`);
      try {
        const memberResp = await axios.get(`${TELEGRAM_API_URL}/getChatMember`, {
          params: { chat_id: chatIdentifier, user_id: botUserId },
        });
        if (!memberResp.data.ok) {
          throw new Error(`Could not resolve chat ID: ${JSON.stringify(memberResp.data)}`);
        }

        // Extract numeric chat ID from the chat object in the response
        const resolvedChatId = memberResp.data.result.chat.id.toString();
        Logger.info(`Resolved chat ID: ${resolvedChatId}`);
        chatIdParam = resolvedChatId;
      } catch (err) {
        throw new Error(
          `Failed to resolve private chat ID. The bot must be a member of the private chat. Error: ${JSON.stringify(err)}`
        );
      }
    } else {
      // Otherwise, handle numeric or username
      const numericId = Number(chatIdentifier);
      if (!isNaN(numericId)) {
        // It's numeric
        chatIdParam = numericId.toString();
      } else {
        // It's a username (e.g., "MyChannel" -> "@MyChannel")
        chatIdParam = chatIdentifier.startsWith('@') ? chatIdentifier : `@${chatIdentifier}`;
      }
    }

    Logger.info(`Fetching chat info for identifier: ${chatIdParam}`);

    // 4) Call getChat to retrieve basic info
    const chatResp = await axios.get(`${TELEGRAM_API_URL}/getChat`, {
      params: { chat_id: chatIdParam },
    });
    if (!chatResp.data.ok) {
      throw new Error(`Telegram API returned not ok: ${JSON.stringify(chatResp.data)}`);
    }

    // The resulting chat object
    const chat = chatResp.data.result;
    Logger.info(`Received chat response: ${JSON.stringify(chat)}`);

    // 5) Determine if the asset is public or private
    //    Telegram's "has_protected_content" => true means private
    // 5) Determine if the asset is public or private
    let isPublic: boolean;
    if (chat.type === 'channel') {
      // If channel has a username => public, else private
      isPublic = !!chat.username;
    } else if (
      chat.type === 'supergroup' ||
      chat.type === 'group' ||
      chat.type === 'giga_group'
    ) {
      // For groups, decide based on username/invite_link or has_protected_content
      isPublic = !!chat.username || !!chat.invite_link;
    } else {
      // fallback if Telegram introduces new chat types
      isPublic = false;
    }

    Logger.info(`Asset isPublic: ${isPublic}`);

    // Build a partial asset object to return
    const assetData: Partial<TelegramAsset> = {
      chatId: chat.id.toString(),
      handle: chat.username || chat.title || chatIdParam.replace(/^@/, ''),
      inviteLink: chat.username ? `https://t.me/${chat.username}` : '',
      name: chat.title || chatIdParam.replace(/^@/, ''),
      description: chat.description || '',
      type: chat.type,
      isPublic,
      botStatus: 'unknown',
      adminPrivileges: [],
      memberCount: 0,
    };

    // 6) Attempt to fetch chat members count
    try {
      const countResp = await axios.get(`${TELEGRAM_API_URL}/getChatMembersCount`, {
        params: { chat_id: chatIdParam },
      });
      if (countResp.data.ok) {
        assetData.memberCount = countResp.data.result;
      }
    } catch (err) {
      Logger.warn(`Could not fetch channel member count: ${String(err)}`);
    }

    // 7) Verify the bot's status in the chat
    try {
      const memberResp = await axios.get(`${TELEGRAM_API_URL}/getChatMember`, {
        params: { chat_id: chatIdParam, user_id: botUserId },
      });

      if (!memberResp.data.ok) {
        Logger.warn(`getChatMember not ok: ${JSON.stringify(memberResp.data)}`);
        assetData.botStatus = 'unknown';
      } else {
        const botStatus = memberResp.data.result;
        assetData.botStatus = botStatus.status;

        // If the bot is admin or creator, gather privileges
        if (botStatus.status === 'administrator' || botStatus.status === 'creator') {
          const privileges: string[] = [];
          if (botStatus.can_be_edited) privileges.push('can_be_edited');
          if (botStatus.can_manage_chat) privileges.push('can_manage_chat');
          if (botStatus.can_change_info) privileges.push('can_change_info');
          if (botStatus.can_post_messages) privileges.push('can_post_messages');
          if (botStatus.can_edit_messages) privileges.push('can_edit_messages');
          if (botStatus.can_delete_messages) privileges.push('can_delete_messages');
          if (botStatus.can_invite_users) privileges.push('can_invite_users');
          if (botStatus.can_restrict_members) privileges.push('can_restrict_members');
          if (botStatus.can_promote_members) privileges.push('can_promote_members');
          if (botStatus.can_manage_video_chats) privileges.push('can_manage_video_chats');
          if (botStatus.is_anonymous) privileges.push('is_anonymous');

          assetData.adminPrivileges = privileges;
        }
      }
    } catch (err) {
      Logger.warn(`getChatMember call failed: ${JSON.stringify(err)}`);
      assetData.botStatus = 'unknown';
    }

    return assetData;
  } catch (error: any) {
    Logger.error(
      `Failed to gather Telegram asset data for identifier ${chatIdentifier}`,
      error
    );
    throw new Error(
      `Could not gather Telegram asset data for identifier ${chatIdentifier}. ${error.message}`
    );
  }
}


/**
 * Convenience function that fetches Telegram asset data and persists it in one go.
 *
 * @param chatIdentifier The identifier (handle or numeric ID) for the Telegram chat.
 * @returns The fully persisted TelegramAsset.
 */
export async function createAndPersistTelegramAsset(
  chatIdentifier: string
): Promise<TelegramAsset> {
  try {
    // Step A: Gather all data from Telegram
    const assetData = await getTelegramAssetDataFromTelegram(chatIdentifier);
    // Step B: Persist it to the DB
    return await ensureTelegramAsset(assetData);
  } catch (error: any) {
    Logger.error(`Failed to create and persist Telegram asset for ${chatIdentifier}`, error);
    throw error;
  }
}


/**
 * Ensures that the Telegram asset corresponding to the given data
 * is updated (or created) directly in the database.
 *
 * @param assetData Partial TelegramAsset data (must include chatId)
 */
async function ensureTelegramAsset(assetData: Partial<TelegramAsset>): Promise<TelegramAsset> {
  try {
    const repo = appDataSource.getRepository(TelegramAsset);
    let existing = await repo.findOne({ where: { chatId: assetData.chatId } });
    if (existing) {
      Object.assign(existing, assetData);
      Logger.debug(`Updating existing Telegram asset with chatId=${assetData.chatId}`);
      return await repo.save(existing);
    } else {
      Logger.debug(`Creating new Telegram asset with chatId=${assetData.chatId}`);
      const newAsset = repo.create(assetData);
      return await repo.save(newAsset);
    }
  } catch (err) {
    Logger.error('Error creating/updating Telegram asset: ' + err);
    throw new Error('Could not create or update Telegram asset');
  }
}

/**
 * Download Telegram image by file ID using getFile, then fetch from the returned path.
 */
async function downloadTelegramImage(photoFileId: string): Promise<Buffer> {
  // 1) Get file information.
  const getFileResponse = await axios.get(`${TELEGRAM_API_URL}/getFile`, {
    params: { file_id: photoFileId },
  });
  Logger.debug(`Response from getFile: ${JSON.stringify(getFileResponse.data)}`);
  if (!getFileResponse.data.ok) {
    throw new Error(`Error fetching file path: ${JSON.stringify(getFileResponse.data)}`);
  }
  const filePath = getFileResponse.data.result.file_path;
  if (!filePath) {
    throw new Error(`File path not found in getFile result: ${JSON.stringify(getFileResponse.data.result)}`);
  }
  // 2) Download the file.
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  Logger.debug(`Downloading image from URL: ${fileUrl}`);
  const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
  return Buffer.from(fileResponse.data);
}

/**
 * Send a telegram message to userId (in a 1:1 chat).
 */
export async function sendTelegramMessage(
  userId: number,
  text: string,
  parseMode: string | null = null
) {
  const { getUserById, ensureUser } = await import("../services/UsersService");
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
