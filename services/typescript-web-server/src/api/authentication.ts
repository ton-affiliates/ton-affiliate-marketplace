// import express, { Router, Request, Response } from 'express';
// import crypto from 'crypto';

// const router: Router = express.Router();
// const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET || 'your_telegram_shared_secret';

// /**
//  * Telegram Login
//  * 
//  * Endpoint: `/telegram-login`
//  * Method: `POST`
//  * 
//  * Description:
//  * Authenticates a user based on the Telegram `auth_data` payload.
//  * The backend validates the payload to ensure its authenticity.
//  */
// router.post('/telegram-login', async (req: Request, res: Response): Promise<void> => {
//     const { auth_data } = req.body;

//     if (!auth_data) {
//         res.status(400).json({ error: 'Missing auth_data' });
//         return;
//     }

//     try {
//         // Parse and validate the auth_data payload
//         const isValid = validateTelegramAuthData(auth_data);

//         if (!isValid) {
//             res.status(401).json({ error: 'Invalid Telegram authentication data' });
//             return;
//         }

//         // Extract user information from the auth_data
//         const { id: telegramId, username, first_name, last_name } = auth_data;

//         // Save or update user data in the database (optional)
//         // Example: await saveUserInfo(telegramId, { handle: username, name: `${first_name} ${last_name}` });

//         // Respond with success and user data
//         res.status(200).json({
//             message: 'User authenticated successfully',
//             user: { telegramId, username, first_name, last_name },
//         });
//     } catch (error) {
//         console.error('Error during Telegram login:', error);
//         res.status(500).json({ error: 'Failed to authenticate user' });
//     }
// });

// /**
//  * Telegram Token Validation
//  * 
//  * Endpoint: `/telegram-verify`
//  * Method: `POST`
//  * 
//  * Description:
//  * Validates a previously issued Telegram token.
//  */
// router.post('/telegram-verify', async (req: Request, res: Response): Promise<void> => {
//     const { auth_data } = req.body;

//     if (!auth_data) {
//         res.status(400).json({ error: 'Missing auth_data' });
//         return;
//     }

//     try {
//         const isValid = validateTelegramAuthData(auth_data);

//         if (!isValid) {
//             res.status(401).json({ valid: false, error: 'Invalid or tampered data' });
//             return;
//         }

//         res.status(200).json({ valid: true, data: auth_data });
//     } catch (error) {
//         console.error('Error validating Telegram token:', error);
//         res.status(500).json({ error: 'Failed to validate token' });
//     }
// });

// /**
//  * Telegram Logout
//  * 
//  * Endpoint: `/telegram-logout`
//  * Method: `POST`
//  * 
//  * Description:
//  * Handles the logout process. Optionally implement token invalidation.
//  */
// router.post('/telegram-logout', async (req: Request, res: Response): Promise<void> => {
//     const { telegramId } = req.body;

//     if (!telegramId) {
//         res.status(400).json({ error: 'Missing Telegram ID' });
//         return;
//     }

//     try {
//         // Optionally: Mark the user as logged out in the database or invalidate any session tokens.
//         res.status(200).json({ message: 'Successfully logged out' });
//     } catch (error) {
//         console.error('Error during logout:', error);
//         res.status(500).json({ error: 'Failed to log out user' });
//     }
// });

// /**
//  * Validates Telegram `auth_data` payload
//  * 
//  * @param authData - The `auth_data` object received from Telegram
//  * @returns Boolean - Returns true if valid, false otherwise
//  */
// function validateTelegramAuthData(authData: any): boolean {
//     const { hash, ...data } = authData;
//     const sortedData = Object.keys(data).sort().map(key => `${key}=${data[key]}`).join('\n');
//     const secretKey = crypto.createHash('sha256').update(TELEGRAM_SECRET).digest();
//     const calculatedHash = crypto.createHmac('sha256', secretKey).update(sortedData).digest('hex');

//     return calculatedHash === hash;
// }

// export default router;

// /**
//  * =========================================
//  *              Authentication API
//  * =========================================
//  * 
//  * This API handles authentication using Telegram's built-in mechanism.
//  * It validates the Telegram `auth_data` payload to ensure the Mini App
//  * communicates securely with the backend.
//  * 
//  * -----------------------------------------
//  * Process Flow:
//  * -----------------------------------------
//  * 1. **Telegram Login**:
//  *    - The Mini App receives `auth_data` from Telegram when launched.
//  *    - The Mini App forwards this `auth_data` to the backend for validation.
//  * 
//  * 2. **Token Validation**:
//  *    - The backend validates the payload and ensures it hasn't been tampered with.
//  *    - If valid, the user is authenticated.
//  * 
//  * 3. **Logout**:
//  *    - Optionally handles session or token invalidation.
//  * 
//  * -----------------------------------------
//  * Endpoints:
//  * -----------------------------------------
//  * 
//  * **1. Telegram Login**
//  * - Endpoint: `/telegram-login`
//  * - Method: `POST`
//  * - Description: Authenticates the user using Telegram's `auth_data`.
//  * 
//  * Request:
//  * - Body:
//  * ```json
//  * {
//  *   "auth_data": {
//  *     "id": "12345",
//  *     "username": "johndoe",
//  *     "first_name": "John",
//  *     "last_name": "Doe",
//  *     "photo_url": "https://t.me/profile.jpg",
//  *     "auth_date": 1690000000,
//  *     "hash": "calculated_hash_here"
//  *   }
//  * }
//  * ```
//  * 
//  * Response:
//  * - Success:
//  * ```json
//  * {
//  *   "message": "User authenticated successfully",
//  *   "user": {
//  *     "telegramId": "12345",
//  *     "username": "johndoe",
//  *     "first_name": "John",
//  *     "last_name": "Doe"
//  *   }
//  * }
//  * ```
//  * - Errors:
//  *     - `400 Bad Request`: Missing parameters
//  *     - `401 Unauthorized`: Invalid or tampered data
//  * 
//  * -----------------------------------------
//  * 
//  * **2. Verify Token**
//  * - Endpoint: `/telegram-verify`
//  * - Method: `POST`
//  * - Description: Validates the `auth_data` payload.
//  * 
//  * Request:
//  * - Body:
//  * ```json
//  * {
//  *   "auth_data": {
//  *     ...
//  *   }
//  * }
//  * ```
//  * 
//  * Response:
//  * - Success:
//  * ```json
//  * {
//  *   "valid": true,
//  *   "data": { ...auth_data }
//  * }
//  * ```
//  * - Errors:
//  *     - `400 Bad Request`: Missing parameters
//  *     - `401 Unauthorized`: Invalid or tampered data
//  * 
//  * -----------------------------------------
//  * 
//  * **3. Logout**
//  * - Endpoint: `/telegram-logout`
//  * - Method: `POST`
//  * - Description: Logs out the user.
//  * 
//  * Request:
//  * - Body:
//  * ```json
//  * {
//  *   "telegramId": "12345"
//  * }
//  * ```
//  * 
//  * Response:
//  * ```json
//  * {
//  *   "message": "Successfully logged out"
//  * }
//  * ```
//  * -----------------------------------------
//  * This setup ensures a secure and seamless authentication process for Telegram Mini Apps.
//  */
