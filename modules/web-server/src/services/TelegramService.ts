// src/services/TelegramService.ts

import axios from 'axios';
import dotenv from 'dotenv';
import { Logger } from '../utils/Logger';
import appDataSource from '../ormconfig';
import { TelegramAsset } from '../entity/TelegramAsset';

dotenv.config();

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * 1) Gathers Telegram asset data (but does NOT persist to DB).
 *
 * @param chatIdentifier The identifier (handle or numeric ID) for the Telegram chat.
 * @returns A partial TelegramAsset with the relevant fields populated.
 */
export async function getTelegramAssetDataFromTelegram(
  chatIdentifier: string
): Promise<Partial<TelegramAsset>> {
  try {
    Logger.debug(`getTelegramAssetDataFromTelegram: Received chatIdentifier: "${chatIdentifier}"`);

    // If the chatIdentifier is actually an invite link, strip the prefix.
    if (chatIdentifier.startsWith('https://t.me/')) {
      chatIdentifier = chatIdentifier.replace('https://t.me/', '');
      Logger.debug(`Stripped URL prefix, new chatIdentifier: "${chatIdentifier}"`);
    }

    // Determine the chat_id parameter:
    // If chatIdentifier can be converted to a number, we use that; otherwise, assume it's a handle.
    let chatIdParam: string;
    const numeric = Number(chatIdentifier);
    Logger.debug(`Conversion result of chatIdentifier to Number: ${numeric}`);
    if (isNaN(numeric)) {
      // It's a handle. Ensure it starts with '@'
      chatIdParam = chatIdentifier.startsWith('@') ? chatIdentifier : '@' + chatIdentifier;
      Logger.debug(`Identifier is determined to be a handle. Normalized handle: "${chatIdParam}"`);
    } else {
      // It's numeric.
      chatIdParam = numeric.toString();
      Logger.debug(`Identifier is numeric. Using chatId: "${chatIdParam}"`);
    }

    Logger.debug(`Fetching chat info for identifier: ${chatIdParam}`);

    // 1) Get basic chat info using the provided identifier.
    const chatResp = await axios.get(`${TELEGRAM_API_URL}/getChat`, {
      params: { chat_id: chatIdParam },
    });
    Logger.debug(`Response from getChat: ${JSON.stringify(chatResp.data)}`);
    if (!chatResp.data.ok) {
      throw new Error(`Telegram API returned not ok: ${JSON.stringify(chatResp.data)}`);
    }
    const chat = chatResp.data.result;
    Logger.debug(`Chat info received: ${JSON.stringify(chat)}`);

    // 2) Extract photo file ID if available.
    const photoFileId = chat.photo?.big_file_id || null;
    Logger.debug(`Extracted photoFileId: ${photoFileId}`);

    // 3) Build a partial asset data object.
    const assetData: Partial<TelegramAsset> = {
      chatId: chat.id.toString(),
      // Use chat.username if available; otherwise, fallback to chat.title or remove '@' from the identifier.
      handle: chat.username
        ? chat.username
        : chat.title
        ? chat.title
        : chatIdParam.replace(/^@/, ''),
      inviteLink: chat.username
        ? `https://t.me/${chat.username}`
        : `https://t.me/${chatIdParam.replace(/^@/, '')}`,
      name: chat.title || chatIdParam.replace(/^@/, ''),
      description: chat.description || '',
      // Pass chat.type directly; you may map it if needed.
      type: chat.type,
      botIsAdmin: false, // default; will update based on bot status below.
      adminPrivileges: [],
      memberCount: 0,
    };

    // 4) If there's a photo, attempt to download it.
    if (photoFileId) {
      Logger.debug(`Found photoFileId: ${photoFileId}, attempting to download image...`);
      try {
        const photoBuffer = await downloadTelegramImage(photoFileId);
        assetData.photo = photoBuffer;
        Logger.debug(`Downloaded photo successfully, size: ${photoBuffer.length} bytes`);
      } catch (error: any) {
        Logger.error(`Failed to download Telegram image: ${error.message}`);
      }
    }

    // 5) Fetch chat members count.
    try {
      const countResp = await axios.get(`${TELEGRAM_API_URL}/getChatMembersCount`, {
        params: { chat_id: chatIdParam },
      });
      Logger.debug(`Response from getChatMembersCount: ${JSON.stringify(countResp.data)}`);
      if (countResp.data.ok) {
        assetData.memberCount = countResp.data.result;
        Logger.info(`Channel has ${assetData.memberCount} members (subscribers).`);
      } else {
        Logger.warn(`getChatMembersCount returned not ok: ${JSON.stringify(countResp.data)}`);
      }
    } catch (err) {
      Logger.warn(`Could not fetch channel member count: ${String(err)}`);
    }

    // 6) Verify the bot's admin status.
    const botIdResp = await axios.get(`${TELEGRAM_API_URL}/getMe`);
    Logger.debug(`Response from getMe: ${JSON.stringify(botIdResp.data)}`);
    if (!botIdResp.data.ok) {
      throw new Error(`Telegram API getMe not ok: ${JSON.stringify(botIdResp.data)}`);
    }
    const botUserId = botIdResp.data.result.id;
    Logger.debug(`Bot user id: ${botUserId}`);

    let botStatus;
    try {
      const memberResp = await axios.get(`${TELEGRAM_API_URL}/getChatMember`, {
        params: { chat_id: chatIdParam, user_id: botUserId },
      });
      Logger.debug(`Response from getChatMember: ${JSON.stringify(memberResp.data)}`);
      if (!memberResp.data.ok) {
        Logger.warn(`getChatMember not ok: ${JSON.stringify(memberResp.data)}. Treating as not admin.`);
        assetData.botIsAdmin = false;
      } else {
        botStatus = memberResp.data.result;
      }
    } catch (err) {
      Logger.warn(`getChatMember call failed, treating bot as not admin. Error: ${JSON.stringify(err)}`);
      assetData.botIsAdmin = false;
    }

    if (botStatus && botStatus.status === 'administrator') {
      assetData.botIsAdmin = true;
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
      // Depending on Telegram Bot API version, these might be relevant or not:
      if (botStatus.can_manage_voice_chats) privileges.push('can_manage_voice_chats');
      if (botStatus.can_post_stories) privileges.push('can_post_stories');
      if (botStatus.can_edit_stories) privileges.push('can_edit_stories');
      if (botStatus.can_delete_stories) privileges.push('can_delete_stories');
      if (botStatus.is_anonymous) privileges.push('is_anonymous');

      assetData.adminPrivileges = privileges;
      Logger.debug(`Bot is administrator. Privileges: ${JSON.stringify(privileges)}`);
    } else {
      Logger.warn(`Bot is not admin in this channel. Bot status: ${botStatus ? botStatus.status : 'unknown'}`);
    }

    Logger.debug(`Final assetData (not persisted): ${JSON.stringify(assetData)}`);
    return assetData;
  } catch (error: any) {
    Logger.error(`Failed to gather Telegram asset data for identifier ${chatIdentifier}`, error);
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
