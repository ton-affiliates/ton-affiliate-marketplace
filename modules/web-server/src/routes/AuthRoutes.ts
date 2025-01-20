import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Logger } from '../utils/Logger';
import { upsertUser } from '../services/UsersService';
import dotenv from 'dotenv';
import { sendTelegramMessage } from '../services/TelegramService'

dotenv.config();

const router = Router();

/**
 * POST /api/v1/auth/telegram-verify
 */
router.post(
  '/telegram-verify',
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('Raw Telegram data in server:', req.body);

      const telegramData = req.body;
      if (!telegramData) {
        return void res.status(400).json({ error: 'No telegram data provided' });
      }

      // Extract known fields (we only use them to upsert the user).
      // The 'hash' is used inside checkTelegramSignature().
      const { id, first_name, last_name, username, photo_url, auth_date } =
        telegramData as Record<string, string>;

      // 1) Verify signature
      const isValid = checkTelegramSignature(telegramData, process.env.TELEGRAM_BOT_TOKEN!);
      if (!isValid) {
        Logger.error('Telegram login signature check failed (POST /telegram-verify).');
        return void res.status(401).json({ error: 'Invalid Telegram data signature' });
      }

      Logger.info("Guy- photo url: " + photo_url)

      // 2) Upsert user in DB
      const userData = {
        id: Number(id),
        firstName: first_name,
        lastName: last_name,
        telegramUsername: username,
        photoUrl: photo_url,
        // Convert auth_date (seconds) to a JS Date
        authDate: new Date(Number(auth_date) * 1000),
      };

      // upsert user in DB
      const user = await upsertUser(userData);
      
      Logger.info("Guy after: " + user);

      try {
        await sendTelegramMessage(Number(id), userData.firstName + ', you successfuly logged in to TonAffiliates!');
        // If successful, we know the bot can message them
        res.json({ success: true, user, canMessage: true });
        return;
      } catch (err) {
        // 403 or some other error => user hasn't started the bot
        res.json({ success: true, user, canMessage: false });
        return;
      }

    } catch (err: any) {
      Logger.error('Error in POST /telegram-verify route', err);
      return void res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * Helper to verify Telegram login data (FOR LOGIN WIDGET)
 * Official docs: https://core.telegram.org/widgets/login#checking-authorization
 */
function checkTelegramSignature(queryData: Record<string, any>, botToken: string): boolean {
  const { hash, ...data } = queryData;

  // 1) Sort all received fields (except hash) in alphabetical order
  const sortedKeys = Object.keys(data).sort();
  const dataCheckString = sortedKeys.map((key) => `${key}=${data[key]}`).join('\n');

  // 2) Create the secret key by simply hashing the bot token with SHA-256 (NO "WebAppData")
  const secretKey = crypto
    .createHash('sha256')
    .update(botToken)
    .digest();

  // 3) Create the HMAC of the dataCheckString using that secret key
  const checkHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // 4) Compare the newly generated checkHash with the hash from Telegram
  return checkHash === hash;
}

export default router;
