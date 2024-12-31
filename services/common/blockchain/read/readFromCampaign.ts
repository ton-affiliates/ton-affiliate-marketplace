import { TonClient4 } from "@ton/ton";
import { getHttpV4Endpoint } from "@orbs-network/ton-access";

// Define types
export interface CampaignDetails {
    regularUsersCostPerAction: Map<number, number>;
    premiumUsersCostPerAction: Map<number, number>;
    isPublicCampaign: boolean;
    campaignValidForNumDays?: number; // Optional
    paymentMethod: number; // 0 for TON, 1 for USDT
    requiresAdvertiserApprovalForWithdrawl: boolean;
}

export interface CampaignData {
    campaignId: number;
    advertiser: string;
    owner: string;
    payout: string;
    campaignDetails: CampaignDetails;
    numAffiliates: number;
    totalAffiliateEarnings: string; // in coins
    state: number;
    campaignStartTimestamp: number;
    lastUserActionTimestamp: number;
    numAdvertiserWithdrawls: number;
    numAdvertiserSignOffs: number;
    numAdvertiserReplenishCampaign: number;
    numAdvertiserReplenishGasFees: number;
    numUserActions: number;
    campaignBalance: string; // in coins
    maxCpaValue: string; // in coins
    contractTonBalance: string; // in coins
    contractAddress: string;
    contractUSDTBalance: string; // in coins
    contractUsdtWallet: string;
    advertiserFeePercentage: number;
    affiliateFeePercentage: number;
    campaignHasSufficientFundsToPayMaxCpa: boolean;
    isCampaignExpired: boolean;
    isCampaignPausedByAdmin: boolean;
    campaignHasSufficientTonToPayGasFees: boolean;
    isCampaignActive: boolean;
    topAffiliates: Map<number, number>;
}

export interface AffiliateData {
    affiliate: string; // Address
    state: number; // uint8
    userActionsStats: Map<number, UserActionStats>;
    premiumUserActionsStats: Map<number, UserActionStats>;
    pendingApprovalEarnings: string; // in coins
    totalEarnings: string; // in coins
    withdrawEarnings: string; // in coins
}

export interface UserActionStats {
    numActions: number;
    lastUserActionTimestamp: number;
}

// Initialize TonClient
const network = "mainnet"; // or "testnet"
const endpoint = await getHttpV4Endpoint({ network });
const client = new TonClient4({ endpoint });

// Fetch campaign data
export async function fetchCampaignData(contractAddress: string): Promise<CampaignData | null> {
    const result = await client.runMethod({
        address: contractAddress,
        method: "campaignData",
    });

    if (result.exitCode !== 0) {
        console.error("Error fetching campaign data:", result.exitCode);
        return null;
    }

    const data = result.stack;

    return {
        campaignId: data[0],
        advertiser: data[1],
        owner: data[2],
        payout: data[3],
        campaignDetails: parseCampaignDetails(data[4]),
        numAffiliates: data[5],
        totalAffiliateEarnings: data[6],
        state: data[7],
        campaignStartTimestamp: data[8],
        lastUserActionTimestamp: data[9],
        numAdvertiserWithdrawls: data[10],
        numAdvertiserSignOffs: data[11],
        numAdvertiserReplenishCampaign: data[12],
        numAdvertiserReplenishGasFees: data[13],
        numUserActions: data[14],
        campaignBalance: data[15],
        maxCpaValue: data[16],
        contractTonBalance: data[17],
        contractAddress: data[18],
        contractUSDTBalance: data[19],
        contractUsdtWallet: data[20],
        advertiserFeePercentage: data[21],
        affiliateFeePercentage: data[22],
        campaignHasSufficientFundsToPayMaxCpa: data[23],
        isCampaignExpired: data[24],
        isCampaignPausedByAdmin: data[25],
        campaignHasSufficientTonToPayGasFees: data[26],
        isCampaignActive: data[27],
        topAffiliates: parseMap(data[28]),
    };
}

// Parse campaign details
function parseCampaignDetails(data: any): CampaignDetails {
    return {
        regularUsersCostPerAction: parseMap(data[0]),
        premiumUsersCostPerAction: parseMap(data[1]),
        isPublicCampaign: data[2],
        campaignValidForNumDays: data[3] !== null ? data[3] : undefined,
        paymentMethod: data[4],
        requiresAdvertiserApprovalForWithdrawl: data[5],
    };
}

// Fetch affiliate data
export async function fetchAffiliateData(contractAddress: string, affiliateId: number): Promise<AffiliateData | null> {
    const result = await client.runMethod({
        address: contractAddress,
        method: "affiliateData",
        stack: [{ type: "int", value: affiliateId }],
    });

    if (result.exitCode !== 0) {
        console.error("Error fetching affiliate data:", result.exitCode);
        return null;
    }

    const data = result.stack;

    return {
        affiliate: data[0],
        state: data[1],
        userActionsStats: parseMap(data[2]),
        premiumUserActionsStats: parseMap(data[3]),
        pendingApprovalEarnings: data[4],
        totalEarnings: data[5],
        withdrawEarnings: data[6],
    };
}

// Helper to parse maps from stack
function parseMap(data: any): Map<number, any> {
    const map = new Map<number, any>();
    for (const [key, value] of data.entries()) {
        map.set(Number(key), value);
    }
    return map;
}
