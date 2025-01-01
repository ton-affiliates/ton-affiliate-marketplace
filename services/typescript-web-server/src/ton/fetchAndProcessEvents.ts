import express from 'express';
import { createServer } from 'http';
import { createClient, RedisClientType } from 'redis';
import axios from 'axios';
import { getUserByTonAddress, getCampaignByChatId, getUserInfo } from "../redis/redis"
import { sendTelegramMessage } from '../telegram/telegramService'


// Process events and send messages
async function processEvents(events: EmitLogEvent[]) {
    for (const event of events) {
        console.log(`Processing event of type ${event.type}:`, event);

        switch (event.type) {
            case 'CampaignCreatedEvent': {
                
                event.campaignId - // TODO pass this to client via web socket

                break;
            }

            case 'AdvertiserSignedCampaignDetailsEvent': {

                // do nothing here

                break;
            }

            case 'AffiliateCreatedEvent': {
                try {
                    // Get advertiser's user ID
                    const advertiserTelegramUser = await getUserByTonAddress(event.data.advertiserAddress);
                    if (!advertiserTelegramUser) {
                        console.error(`Advertiser address not found: ${event.data.advertiserAddress}`);
                        break;
                    }
            
                    // Get advertiser's user info
                    const advertiserInfo = await getUserInfo(advertiserTelegramUser);
                    if (!advertiserInfo) {
                        console.error(`Advertiser info not found for user ID: ${advertiserTelegramUser}`);
                        break;
                    }
            
                    // Get affiliate's user ID
                    const affiliateTelegramUser = await getUserByTonAddress(event.data.affiliate);
                    if (!affiliateTelegramUser) {
                        console.error(`Affiliate address not found: ${event.data.affiliate}`);
                        break;
                    }
            
                    // Get affiliate's user info
                    const affiliateInfo = await getUserInfo(affiliateTelegramUser);
                    if (!affiliateInfo) {
                        console.error(`Affiliate info not found for user ID: ${affiliateTelegramUser}`);
                        break;
                    }
            
                    // Fetch the affiliate data from the blockchain
                    const affiliateData = await fetchAffiliateData(event.data.contractAddress, event.data.affiliateId);
                    if (!affiliateData) {
                        console.error(`Failed to fetch affiliate data for ID: ${event.data.affiliateId}`);
                        break;
                    }
            
                    if (affiliateData.state === 0) { // PENDING APPROVAL
                        // Send message to the advertiser
                        const message = `Affiliate request pending approval:
                                            Affiliate ID: ${event.data.affiliateId}
                                            Affiliate Info: ${JSON.stringify(affiliateInfo)}\nPlease review and approve.`;
                        await sendTelegramMessage(advertiserInfo.telegramId, message);
                        console.log(`Message sent to advertiser: ${advertiserInfo.telegramId}`);
                    } else {
                        // Send message to the affiliate
                        const message = `Congratulations! Your affiliate account has been created with ID: ${event.data.affiliateId} and is now active.`;
                        await sendTelegramMessage(affiliateInfo.telegramId, message);
                        console.log(`Message sent to affiliate: ${affiliateInfo.telegramId}`);
                    }
                } catch (error) {
                    console.error(`Error processing AffiliateCreatedEvent: ${error}`, error);
                }
                break;
            }
            

            case 'AdvertiserApprovedAffiliateEvent': {
                try {
                    // Get affiliate's user ID
                    const affiliateTelegramUser = await getUserByTonAddress(event.data.affiliate);
                    if (!affiliateTelegramUser) {
                        console.error(`Affiliate address not found: ${event.data.affiliate}`);
                        break;
                    }
            
                    // Get affiliate's user info
                    const affiliateInfo = await getUserInfo(affiliateTelegramUser);
                    if (!affiliateInfo) {
                        console.error(`Affiliate info not found for user ID: ${affiliateTelegramUser}`);
                        break;
                    }
            
                    // Get advertiser's user ID
                    const advertiserTelegramUser = await getUserByTonAddress(event.data.advertiserAddress);
                    if (!advertiserTelegramUser) {
                        console.error(`Advertiser address not found: ${event.data.advertiserAddress}`);
                        break;
                    }
            
                    // Get advertiser's user info
                    const advertiserInfo = await getUserInfo(advertiserTelegramUser);
                    if (!advertiserInfo) {
                        console.error(`Advertiser info not found for user ID: ${advertiserTelegramUser}`);
                        break;
                    }
            
                    // Prepare and send the message to the affiliate
                    const message = `Your affiliate: ${event.data.affiliateId} in campaign: ${event.data.campaignId} was approved by the advertiser.`;
                    await sendTelegramMessage(affiliateInfo.telegramId, message);
                    console.log(`Message sent to affiliate: ${affiliateInfo.telegramId}`);
                } catch (error) {
                    console.error(`Error processing AdvertiserApprovedAffiliateToAllowedListEvent: ${error}`, error);
                }
                break;
            }

            case 'AdvertiserRemovedAffiliateEvent': {
                try {
                    // Get affiliate's user ID
                    const affiliateTelegramUser = await getUserByTonAddress(event.data.affiliate);
                    if (!affiliateTelegramUser) {
                        console.error(`Affiliate address not found: ${event.data.affiliate}`);
                        break;
                    }
            
                    // Get affiliate's user info
                    const affiliateInfo = await getUserInfo(affiliateTelegramUser);
                    if (!affiliateInfo) {
                        console.error(`Affiliate info not found for user ID: ${affiliateTelegramUser}`);
                        break;
                    }
            
                    // Get advertiser's user ID
                    const advertiserTelegramUser = await getUserByTonAddress(event.data.advertiserAddress);
                    if (!advertiserTelegramUser) {
                        console.error(`Advertiser address not found: ${event.data.advertiserAddress}`);
                        break;
                    }
            
                    // Get advertiser's user info
                    const advertiserInfo = await getUserInfo(advertiserTelegramUser);
                    if (!advertiserInfo) {
                        console.error(`Advertiser info not found for user ID: ${advertiserTelegramUser}`);
                        break;
                    }
            
                    // Prepare and send the message to the affiliate
                    const message = `Your affiliate: ${event.data.affiliateId} in campaign: ${event.data.campaignId} was removed by the advertiser.`;
                    await sendTelegramMessage(affiliateInfo.telegramId, message);
                    console.log(`Message sent to affiliate: ${affiliateInfo.telegramId}`);
                } catch (error) {
                    console.error(`Error processing AdvertiserRemovedAffiliateEvent: ${error}`, error);
                }
                break;
            }
            
            default:
                console.log(`No specific handling for event type ${event.type}`);
        }
    }
}

// Server loop to fetch and process events periodically
const fetchAndProcessEvents = async (): Promise<void> => {
    try {
        const lastProcessedLt = await getLastProcessedLt();
        console.log('Last Processed LT:', lastProcessedLt);

        const events: EmitLogEvent[] = await getLatestEvents(lastProcessedLt);
        if (events.length > 0) {
            await processEvents(events);

            const maxLt = events.reduce(
                (max, event) => (event.createdLt > max ? event.createdLt : max),
                lastProcessedLt
            );
            await saveLastProcessedLt(maxLt);
            console.log('Updated Last Processed LT:', maxLt);
        }
    } catch (error) {
        console.error('Error fetching or processing events:', error);
    }
};


// Schedule the event fetcher to run periodically
setInterval(fetchAndProcessEvents, 10 * 1000);  // every 10 seconds




