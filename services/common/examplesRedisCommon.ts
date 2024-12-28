// Examples for redisCommon.ts

import { saveCampaign, getCampaign, addAffiliateToCampaign, getCampaignAffiliates, saveUserInfo, getUserInfo, addUserAddress, getUserIdByAddress } from './common/redisCommon';
import { TelegramCategory, TelegramAssetType, TelegramAsset } from './common/redisCommon';

(async () => {


    // Example: Save advertiser telegram information
    const advertiserTelegramId = '987654321';  // telegram id for now
    await saveUserInfo(advertiserTelegramId, {
        telegramId: 987654321,
        handle: '@ExampleAdvertiserHandle',
        name: 'Abu Ali'
    });

    console.log('Advertiser information saved successfully.');

    // from ton connect
    const advertiserTonAddress = '0QCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL5kn';  // from tonconnect
    await addUserAddress(advertiserTelegramId, advertiserTonAddress);
    console.log('Added new address to user.');

    let advertiserInfo = await getUserInfo(advertiserTelegramId);
    if (advertiserInfo) {
        console.log('Retrieved Advertiser Info:', advertiserInfo);
    } else {
        console.log('Advertiser not found.');
    }


    // Example: Save a new campaign -telegram data
    const campaignId = 'campaign123';
    const telegramAsset: TelegramAsset = {
        id: -1001234567890,
        name: '@ExampleChannel',
        type: TelegramAssetType.CHANNEL,
        isPublic: true,
        url: 'https://t.me/ExampleChannel',
    };

    await saveCampaign(campaignId, {
        name: 'Example Campaign',
        description: 'This is a test campaign for example purposes.',
        category: TelegramCategory.TECHNOLOGY,
        telegramAsset,
        advertiserAddress: advertiserTonAddress,
    });

    console.log('Campaign saved successfully.');

    // Example: Retrieve campaign information
    const campaignData = await getCampaign(campaignId);
    if (campaignData) {
        console.log('Retrieved Campaign Data:', campaignData);
    } else {
        console.log('Campaign not found.');
    }

    // Example: Add an affiliate to a campaign (after affiliate clicks 'generate new affilaite')
    const affiliateAddress = 'EQDef5678AffiliateTONAddress';
    const wasAdded = await addAffiliateToCampaign(campaignId, affiliateAddress);
    console.log(wasAdded ? 'Affiliate added successfully.' : 'Affiliate already exists in the campaign.');

    // Example: Retrieve all affiliates of a campaign
    const affiliates = await getCampaignAffiliates(campaignId);
    console.log('Campaign Affiliates:', affiliates);

    // Example: Save user information
    const userId = '123456789';  // telegram id for now
    await saveUserInfo(userId, {
        telegramId: 123456789,
        handle: '@ExampleUser',
        name: 'John Doe'
    });

    console.log('User information saved successfully.');

    // Example: Retrieve user information
    let userInfo = await getUserInfo(userId);
    if (userInfo) {
        console.log('Retrieved User Info:', userInfo);
    } else {
        console.log('User not found.');
    }

    // Example: Add a TON address to an existing user
    const userTonAddress = 'EQLastTONAddress';  // from tonconnect
    await addUserAddress(userId, userTonAddress);
    console.log('Added new address to user.');

    userInfo = await getUserInfo(userId);
    if (userInfo) {
        console.log('Retrieved User Info:', userInfo);  // this time with the TON address
    } else {
        console.log('User not found.');
    }

    // Example: Retrieve user ID by TON address
    const retrievedUserId = await getUserIdByAddress('EQAbc1234ExampleTONAddress');
    if (retrievedUserId) {
        console.log('Retrieved User ID for Address:', retrievedUserId);
    } else {
        console.log('No user found for the given address.');
    }

    // and then userInfo using the ID
    userInfo = await getUserInfo(userId);
    if (userInfo) {
        console.log('Retrieved User Info:', userInfo);  // this time with the TON address
    } else {
        console.log('User not found.');
    }


})();
