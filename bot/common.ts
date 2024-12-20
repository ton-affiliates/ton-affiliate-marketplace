export enum EventType {
    // General Bot Events
    CAPTCHA_SOLVED,              // User solved a CAPTCHA

    // Channel Events
    CHANNEL_USER_IS_MEMBER,      // User is a member of a channel
    CHANNEL_USER_IS_NOT_MEMBER,  // User is not a member of a channel

    // Group & Supergroup Events
    GROUP_USER_JOINED,           // User joined a group or supergroup
    GROUP_USER_LEFT,             // User left a group or supergroup
    GROUP_USER_COMMENTED,        // User sent a message in a group
    GROUP_USER_MENTIONED,        // User was mentioned in a group message

    // Forum Events
    FORUM_USER_COMMENTED,        // User sent a comment in a forum topic

    // User Engagement & Tracking Events
    USER_STAYED_FOR_PERIOD,      // User stayed in a group/channel for a specific period (e.g., 2 weeks)

    // Payments and Transactions
    PAYMENT_STARTED,             // User initiated a payment
    PAYMENT_COMPLETED,           // Payment was successfully completed
    PAYMENT_FAILED,              //  Payment failed

    // Custom Actions
    MINI_APP_CUSTOM_EVENT      // Reserved for custom events not covered in this enum

    // TODO stars?
}


export enum TelegramAssetType {
    CHANNEL,       
    GROUP,     
    SUPER_GROUP, 
    FORUM,  
    MINI_APP 
}


export interface TelegramAsset {
    id: number;                 // Unique numeric identifier (e.g., "-1001234567890")
    name: string;               // Public username (e.g., "@ChannelName") or "PRIVATE" for private groups/channels
    type: TelegramAssetType;    // Type of the Telegram asset (channel, group, etc.)
}

// examples:

// public channel example
const publicChannel: TelegramAsset = {
    id: -1009876543210,
    name: '@PublicChannelName',
    type: TelegramAssetType.CHANNEL,
};

//private group example
const privateGroup: TelegramAsset = {
    id: -1001234567890,
    name: 'PRIVATE',
    type: TelegramAssetType.GROUP,
};

//Forum in a Supergroup example
const forum: TelegramAsset = {
    id: -1001122334455,
    name: '@SuperGroupForum',
    type: TelegramAssetType.FORUM,
};


export interface TelegramEvent {
    eventType: EventType;             // Event type from the EventType enum
    telegramAsset: TelegramAsset;     // Telegram asset
    userId: number;                  // User ID as a number
    timestamp: number;               // Timestamp as a number (milliseconds since Unix epoch)
    campaignId: number;              // Campaign ID as a number
    affiliateId: number;             // Affiliate ID as a number
}

// examples:


// CAPTCHA Solved Event
const captchaSolvedEvent: TelegramEvent = {
    eventType: EventType.CAPTCHA_SOLVED,
    telegramAsset: {
        id: -1009876543210,
        name: '@PublicChannelName',
        type: TelegramAssetType.CHANNEL,
    },
    userId: 123456,
    timestamp: Date.now(),
    campaignId: 101,
    affiliateId: 202,
};

// Channel User is Member Event
const channelUserIsMemberEvent: TelegramEvent = {
    eventType: EventType.CHANNEL_USER_IS_MEMBER,
    telegramAsset: {
        id: -1009876543210,
        name: '@PublicChannelName',
        type: TelegramAssetType.CHANNEL,
    },
    userId: 789012,
    timestamp: Date.now(),
    campaignId: 103,
    affiliateId: 204,
};

// Private Group User Commented Event
const groupUserCommentedEvent: TelegramEvent = {
    eventType: EventType.GROUP_USER_COMMENTED,
    telegramAsset: {
        id: -1001234567890,
        name: 'PRIVATE',
        type: TelegramAssetType.GROUP,
    },
    userId: 901234,
    timestamp: Date.now(),
    campaignId: 107,
    affiliateId: 208,
};



// Mini app custom event example - how do users incorporate these 'custom events' in their mini apps

// Telegram.WebApp.ready();

// //button.onClick {}
//     Telegram.WebApp.sendData(JSON.stringify({ event: 5 }));
// }

// bot.on('web_app_data', async (ctx) => {
//     const data = ctx.message.web_app_data?.data;
//     if (data) {
//         const parsedData = JSON.parse(data);
//         if (parsedData.event === "opened") {
//             console.log(`Mini App opened by user ${ctx.from.id}`);
//         }
//     }
// });
