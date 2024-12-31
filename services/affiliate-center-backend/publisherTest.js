const { createClient } = require('redis');

// Create a Redis client
const client = createClient({
  url: 'redis://localhost:6379',
});

// Handle errors
client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Connect to Redis and publish a message
(async () => {
  await client.connect();

  const campaignDetails = {
    campaignId: '12347',
    name: 'Sample Campaign',
    advertiser: 'Advertiser X',
    status: 'Active',
  };

  await client.publish(
    'CampaignCreatedEventChannel',
    JSON.stringify(campaignDetails)
  );

  console.log('Message published to CampaignCreatedEventChannel');
  await client.disconnect();
})();