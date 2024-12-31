import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const TOKEN_EXPIRATION = '1h'; // Adjust token expiration as needed

/**
 * Login
 */
router.post('/login', async (req: Request, res: Response) => {
    const { clientId, clientSecret } = req.body;

    // Validate clientId and clientSecret (fetch from DB or config)
    if (clientId !== 'miniApp123' || clientSecret !== 'secretKey987') {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ clientId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
    res.status(200).json({ token });
});

/**
 * Verify Token
 */
router.post('/verify-token', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token is missing or invalid' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.status(200).json({ valid: true, data: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
});

/**
 * Logout
 */
router.post('/logout', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token is missing or invalid' });
    }

    const token = authHeader.split(' ')[1];

    // Add the token to a blacklist (optional)
    // Example: await redisClient.set(`blacklist:${token}`, true, 'EX', 3600);

    res.status(200).json({ message: 'Successfully logged out' });
});

export default router;
