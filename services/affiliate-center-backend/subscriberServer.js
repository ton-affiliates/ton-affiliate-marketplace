const express = require('express');
const { createClient } = require('redis');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Allow frontend origin
    methods: ['GET', 'POST'], // Allowed HTTP methods
  },
});

const redisSubscriber = createClient();
const redisClient = createClient();

app.use(cors({
  origin: 'http://localhost:5173', // Allow frontend origin
  methods: ['GET', 'POST'], // Allowed HTTP methods
}));

(async () => {
  try {
    await redisSubscriber.connect();
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Error connecting to Redis:', error);
  }
})();

// Route to fetch all campaign IDs
app.get('/campaignIds', async (req, res) => {
  try {
    const keys = await redisClient.keys('campaign:*');
    const campaignIds = keys.map((key) => key.split(':')[1]);
    console.log('campaignIds:',campaignIds);
    res.json(campaignIds);
  } catch (error) {
    console.error('Error fetching campaign IDs:', error);
    res.status(500).send('Error fetching campaign IDs');
  }
});

app.get('/campaignDetails/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const campaignKey = `campaign:${id}`;
      const campaignDetails = await redisClient.hGetAll(campaignKey);
  
      if (Object.keys(campaignDetails).length === 0) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      if (campaignDetails.campaignDetails) {
        campaignDetails.campaignDetails = JSON.parse(campaignDetails.campaignDetails);
      }
      res.json(campaignDetails);
    } catch (error) {
      console.error(`Error fetching campaign details for ID ${id}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Subscribe to Redis events
redisSubscriber.subscribe('CampaignCreatedEventChannel', (message) => {
    console.log('CampaignCreatedEventChannel');
  const campaignId = JSON.parse(message).campaignId;
  console.log('CampaignCreatedEventChannel: campaignId', campaignId);
  io.emit('CampaignCreatedEventChannel', campaignId); // Broadcast new campaign ID
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
