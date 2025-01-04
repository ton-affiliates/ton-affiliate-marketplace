// import { Address } from "@ton/core";


// function translateRawAddress(rawAddress: { workChain: number; hash: { type: string; data: number[] } }): Address {
//     if (!rawAddress || rawAddress.hash.type !== 'Buffer') {
//         throw new Error('Invalid raw address format');
//     }

//     const workChain = rawAddress.workChain;
//     const hashBuffer = Buffer.from(rawAddress.hash.data);

//     if (hashBuffer.length !== 32) {
//         throw new Error(`Invalid address hash length: ${hashBuffer.length}`);
//     }

//     return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
// }


// // Subscribe to the Redis channel
// redisClient.subscribe('CampaignCreatedEventChannel', (message) => {
//     const event = parseWithBigInt(message);

//     // Filter by advertiser address
//     if (translateRawAddress(event.advertiser).toString() === currentUserInTonConnect.toString()) {
//         console.log('Relevant event:', event);

//         // Handle the event (e.g., update UI)
//         handleCampaignCreatedEvent(event);
//     }
// });


// // Example event handler
// function handleCampaignCreatedEvent(event: any) {
//     console.log('Handling CampaignCreatedEvent...');
    
//     console.log('Campaign ID:', event.campaignId);
//     console.log('advertiser:', translateRawAddress(event.advertiser).toString());
//     console.log('campaignContractAddress:', translateRawAddress(event.campaignContractAddress).toString());

//     // TODO: Add your logic here (e.g., updating the mini-app UI)
// }