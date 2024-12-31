
import dotenv from 'dotenv';
import { createServer } from 'http';
import express from 'express';
import campaignsRouter from './api/campaign'; // Adjust the path as per your file structure
import usersRouter from './api/user'
import walletRouter from './api/wallet'
import authRouter from './api/authentication'

// Load environment variables
dotenv.config();

const PORT: number = Number(process.env.PORT) || 3000;
const HOST: string = process.env.HOST || "localhost";

// Initialize the Express app
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(express.json()); // For parsing JSON request bodies

// Mount the campaigns router
app.use('/campaign', campaignsRouter);
app.use('/user', usersRouter);
app.use('/wallet', walletRouter);
app.use('/auth', authRouter);

// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});




