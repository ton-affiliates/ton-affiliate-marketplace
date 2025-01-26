// TelegramService.ts

import axios from 'axios';
import dotenv from 'dotenv';
import { Logger } from '../utils/Logger';
import { TelegramAsset, TelegramAssetType } from '@common/models';
import { getUserById, upsertUser} from '../services/UsersService'

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Fetches public chat info for a given handle (e.g. "MyPublicChannel") and downloads its photo if available.
 */
export async function fetchPublicChatInfo(telegramHandle: string): Promise<TelegramAsset> {
  try {
    // 1) Get basic chat info
    const chatIdParam = `@${telegramHandle}`;
    Logger.info(`Fetching public chat info for handle: ${chatIdParam}`);

    const response = await axios.get(`${TELEGRAM_API_URL}/getChat`, {
      params: { chat_id: chatIdParam },
    });

    if (!response.data.ok) {
      throw new Error(`Telegram API returned not ok: ${JSON.stringify(response.data)}`);
    }

    // The chat object from the response
    const chat = response.data.result;

    // 2) Extract relevant fields
    const photoFileId = chat.photo?.big_file_id || null;

    // 3) Build your TelegramAsset object
    const telegramAsset: TelegramAsset = {
      id: chat.id,
      name: chat.title || telegramHandle,       // fallback if no title
      description: chat.description || '',
      type: mapChatTypeToAssetType(chat.type),  // channel, group, supergroup, ...
      isPublic: true,                           // We assume it's public if we can fetch it
      url: `https://t.me/${telegramHandle}`,    // or something similar
      photo: undefined,                         // We'll fill this soon if we find a file ID
    };

    // 4) If there's a photo, download it
    if (photoFileId) {
      Logger.info(`Found photoFileId: ${photoFileId}, downloading image...`);
      try {
        const photoBuffer = await downloadTelegramImage(photoFileId);
        telegramAsset.photo = photoBuffer;
        Logger.info(`Downloaded photo successfully, size: ${photoBuffer.length} bytes`);
      } catch (error: any) {
        // Non-fatal, just log if we can't get the image
        Logger.error(`Failed to download Telegram image: ${error.message}`);
      }
    }

    return telegramAsset;
  } catch (error: any) {
    Logger.error(`Failed to fetch public chat info for handle: ${telegramHandle}`, error);
    throw new Error(`Could not retrieve info for Telegram handle: ${telegramHandle}. ${error.message}`);
  }
}

/**
 * Download Telegram image by file ID using getFile, then fetch the file from the returned path.
 */
async function downloadTelegramImage(photoFileId: string): Promise<Buffer> {
  // 1) Get file path from getFile
  const getFileResponse = await axios.get(`${TELEGRAM_API_URL}/getFile`, {
    params: { file_id: photoFileId },
  });

  if (!getFileResponse.data.ok) {
    throw new Error(`Error fetching file path: ${JSON.stringify(getFileResponse.data)}`);
  }

  const filePath = getFileResponse.data.result.file_path;
  if (!filePath) {
    throw new Error(`File path not found in the getFile result. The result was: ${JSON.stringify(getFileResponse.data.result)}`);
  }

  // 2) Construct the download URL
  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

  // 3) Download the file as arraybuffer
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
    case 'mini-app':
      return TelegramAssetType.MINI_APP;
    default:
      // If we get something weird, we can default or throw
      throw new Error(`Unsupported chat type: ${chatType}`);
  }
}

export async function sendTelegramMessage(userId: number, text: string, parseMode: string | null  = null ) {
  const user = await getUserById(userId);
  if (!user) {
    Logger.error(`[sendTelegramMessage] Cannot find user with id: ${userId} in DB`)
    return;
  }

  try {
    if (parseMode) {
      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: userId,
        text: text,
        parse_mode: parseMode
      });
    } else {
      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: userId,
        text: text
      });
    }

    user.canMessage = true;
    await upsertUser(user);
   
  } catch (err: any) {
    // If the error indicates the user blocked the bot:
    if (err.response?.error_code === 403) {
      // Mark canMessage = false in DB
      user.canMessage = false;
      await upsertUser(user);
    }
    // Rethrow or log the error if you want
    Logger.error(err);
  }
}

