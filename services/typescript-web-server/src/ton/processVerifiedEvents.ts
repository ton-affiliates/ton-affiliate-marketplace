
async function processVerifiedEvents() {
    try {
        const captchaKeys = await redisClient.keys('event:user:*:captcha_verified:*'); // Only look for captcha_verified events
        const userEvents: Record<string, Record<string, any[]>> = {}; // Group events by userId and chatId

        for (const key of captchaKeys) {
            const eventData = await redisClient.get(key);

            if (eventData) {
                try {
                    const parsedData = JSON.parse(eventData);
                    const userId = key.split(':')[2]; // Extract the userId
                    const chatId = parsedData.chatId; // Extract chatId from event data

                    if (!userEvents[userId]) {
                        userEvents[userId] = {};
                    }

                    if (!userEvents[userId][chatId]) {
                        userEvents[userId][chatId] = [];
                    }

                    userEvents[userId][chatId].push(parsedData);
                } catch (error) {
                    console.error(`Failed to parse event data for key ${key}:`, error);
                }
            }
        }

        for (const userId in userEvents) {
            const chats = userEvents[userId];

            for (const chatId in chats) {
                const events = chats[chatId];

                const captchaEvent = events.find(
                    (event) => event.eventType === 'captcha_verified' && event.chatId === chatId
                );
                const joinedEvent = events.find(
                    (event) => event.eventType === 'joined' && event.chatId === chatId
                );
                
                if (captchaEvent && joinedEvent) {
                    
                    console.log(`Processing verified events for user ${userId} in chat ${chatId}`);
                    const campaignData: TelegramCampaign | null = await getCampaignByChatId(captchaEvent.chatId);
                    if (!campaignData) {
                        console.error(`Failed to extract campaign for ${userId} in chat ${chatId}`);
                        continue;
                    }

                    const { affiliateId, isPremiumUser } = captchaEvent.additionalData;

                    const userActionOpCode = BigInt(0);  // UserClick take from .env 
                    
                    try {
                        await writeEventToBlockchainMnemonics(BigInt(campaignData.campaignId), campaignData.advertiserAddress, affiliateId, userActionOpCode, isPremiumUser);
                    } catch (error) {
                        console.error(`Failed to write event to blockchain for user ${userId} in chat ${chatId}:`, error);
                        continue;
                    }
                }
            }
        }

        // move to processed events
        for (const userId in userEvents) {
            const chats = userEvents[userId];

            for (const chatId in chats) {
                const events:EventData[] = chats[chatId];

                for (const event of events) {
                    const eventKey = `event:user:${userId}:${event.eventType}:${chatId}`;
                    const processedKey = `processedEvents:user:${userId}:${event.eventType}:${chatId}`;

                    try {
                        await redisClient.set(processedKey, JSON.stringify(event));
                        await redisClient.del(eventKey);
                    } catch (error) {
                        console.error(`Failed to move event to processedEvents for key ${eventKey}:`, error);
                    }
            }
        }   
        } 

    } catch (error) {
        console.error('Error processing verified events:', error);
    }
}

// Periodic task to process verified events
setInterval(async () => {
    console.log('Checking for verified events...');
    await processVerifiedEvents();
}, 10 * 1000); // Run every 10 seconds
