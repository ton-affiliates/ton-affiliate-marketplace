const Redis = require('redis');

const redisClient = Redis.createClient();

const seedCampaigns = async () => {
  try {
    await redisClient.connect();

    const campaigns = [
      {
        campaignId: "3969379339",
        advertiser: "EQCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL39o",
        owner: "EQC7JRZSSZMiQEnw_bShtIfuLbIyFNfIHE8S2IJBVshgL-1W",
        payout: "EQCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL39o",
        campaignDetails: {
          regularUsersCostPerAction: "0: 0.2",
          premiumUsersCostPerAction: "0: 0.2",
          allowedAffiliates: "",
          isPublicCampaign: true,
          campaignExpiresInNumDays: "No Expiration",
          paymentMethod: "USDT",
          requiresAdvertiserApprovalForWithdrawl: false,
        },
        numAffiliates: "0",
        totalAffiliateEarnings: "0",
        state: "1",
        campaignStartTimestamp: "22/12/2024, 13:37:20",
        lastUserActionTimestamp: "01/01/1970, 2:00:00",
        numAdvertiserWithdrawls: "0",
        numAdvertiserSignOffs: "0",
        numUserActions: "0",
        campaignBalance: "0",
        maxCpaValue: "0.2",
        contractTonBalance: "0.172914241",
        contractAddress: "EQAjGgLZ8HE-cRFlWnmPJXTxkaPpmwpgTvrsdMtZmi4Ef4Aq",
        contractUSDTBalance: "0",
        contractUsdtJettonWallet: "EQBROtQznU4a0Gyroul5q2xY2TnGGTwtLHazLWZVtx6cwB_h",
        advertiserFeePercentage: "0",
        affiliateFeePercentage: "200",
        campaignHasSufficientFundsToPayMaxCpa: false,
        isCampaignExpired: false,
        isCampaignPausedByAdmin: false,
        campaignHasSufficientTonToPayGasFees: false,
        isCampaignActive: false,
        topAffiliates: "",
      },
      {
        campaignId: "3969379340",
        advertiser: "EQFakeAdvertiser...",
        owner: "EQFakeOwner...",
        payout: "EQFakePayout...",
        campaignDetails: {
        regularUsersCostPerAction: "0: 0.3",
        premiumUsersCostPerAction: "0: 0.4",
        allowedAffiliates: "",
        isPublicCampaign: true,
        campaignExpiresInNumDays: "No Expiration",
        paymentMethod: "TON",
        requiresAdvertiserApprovalForWithdrawl: true,
        },
        numAffiliates: "5",
        totalAffiliateEarnings: "1.5",
        state: "1",
        campaignStartTimestamp: "21/12/2024, 13:37:20",
        lastUserActionTimestamp: "01/01/1970, 2:00:00",
        numAdvertiserWithdrawls: "0",
        numAdvertiserSignOffs: "0",
        numUserActions: "0",
        campaignBalance: "1",
        maxCpaValue: "0.4",
        contractTonBalance: "0.5",
        contractAddress: "EQFakeAddress...",
        contractUSDTBalance: "1",
        contractUsdtJettonWallet: "EQFakeWallet...",
        advertiserFeePercentage: "0",
        affiliateFeePercentage: "200",
        campaignHasSufficientFundsToPayMaxCpa: true,
        isCampaignExpired: false,
        isCampaignPausedByAdmin: false,
        campaignHasSufficientTonToPayGasFees: true,
        isCampaignActive: true,
        topAffiliates: "Affiliate1, Affiliate2",
    },
    ];

    for (const campaign of campaigns) {
      const key = `campaign:${campaign.campaignId}`;
      const flattenedCampaign = flattenCampaign(campaign);

      // Use hSet to save the flattened campaign
      await redisClient.hSet(key, flattenedCampaign);
    }

    console.log("Campaigns seeded successfully!");
  } catch (error) {
    console.error("Error seeding Redis:", error);
  } finally {
    await redisClient.quit();
  }
};

// Function to flatten a nested object
const flattenCampaign = (campaign) => {
  const flattened = {};

  for (const [key, value] of Object.entries(campaign)) {
    if (typeof value === "object" && value !== null) {
      // Serialize nested objects
      flattened[key] = JSON.stringify(value);
    } else {
      // Directly assign primitive values
      flattened[key] = String(value);
    }
  }

  return flattened;
};

seedCampaigns();
