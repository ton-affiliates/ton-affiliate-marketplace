import { Router } from 'express';
import crypto from 'crypto';
import { Logger } from '../utils/Logger';
import { upsertUser } from '../services/UsersService';  // or however you handle user creation
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// GET /api/v1/auth/telegram
// Telegram will redirect the user here with query parameters 
router.get('/telegram', async (req, res) => {
  try {
    // 1. Extract the query params
    const {
      id,
      first_name,
      last_name,
      username,
      photo_url,
      auth_date,
      hash,
      // ...other Telegram fields if any
    } = req.query as Record<string, string>;

    // 2. Verify the Telegram signature
    //    The official method: https://core.telegram.org/widgets/login#checking-authorization
    const isValid = checkTelegramSignature(req.query, process.env.TELEGRAM_BOT_TOKEN!);
    if (!isValid) {
      Logger.error('Telegram login signature check failed.');
      res.status(401).json({ error: 'Invalid Telegram data signature' });
      return;
    }

    // 3. If valid, save user to DB
    //    Convert `auth_date` to a real Date if you want
    const userData = {
      id: Number(id), // your User entity expects a number
      firstName: first_name,
      lastName: last_name,
      telegramUsername: username,
      photoUrl: photo_url,
      authDate: new Date(Number(auth_date) * 1000),
    };

    const user = await upsertUser(userData);
    
    // 4. Redirect or return JSON
    //    For example, redirect them to your front-end "logged in" page
    res.redirect('/login-success.html'); // or res.json(user);
    return;
  } catch (err: any) {
    Logger.error('Error in Telegram auth route', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * Helper to verify Telegram login data
 * Official docs: https://core.telegram.org/widgets/login#checking-authorization
 */
function checkTelegramSignature(queryData: Record<string, any>, botToken: string): boolean {
  const { hash, ...data } = queryData;

  // 1. Sort the remaining keys in alphabetical order
  const sorted = Object.keys(data).sort();

  // 2. Generate the data_check_string
  //    e.g. key1=value1\nkey2=value2\n...
  const dataCheckString = sorted
    .map((key) => `${key}=${data[key]}`)
    .join('\n');

  // 3. Create a secret key from the SHA256 hash of the botToken
  const secretKey = crypto.createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // 4. Generate the hex digest of the data_check_string using secretKey
  const checkHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // 5. Compare checkHash with the hash from Telegram
  return checkHash === hash;
}

export default router;
