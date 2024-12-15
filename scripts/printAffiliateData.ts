import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign, UserActionStats } from '../wrappers/Campaign';
import { AffiliateMarketplace } from '../wrappers/AffiliateMarketplace';
import { NetworkProvider } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS } from './constants';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS));
    const campaignId = BigInt(args.length > 0 ? args[0] : await ui.input('Campaign id'));
    const advertiser = Address.parse(args.length > 1 ? args[1] : await ui.input('Advertiser address'));

    let campaignAddress = await affiliateMarketplace.getCampaignContractAddress(campaignId, advertiser);
    if (!(await provider.isContractDeployed(campaignAddress))) {
        ui.write(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }

    const affiliateId = BigInt(args.length > 2 ? args[2] : await ui.input('Affiliate id'));

    const campaign = provider.open(Campaign.fromAddress(campaignAddress));
    const affiliateData = await campaign.getAffiliateData(affiliateId);

    if (affiliateData == null) {
        ui.write(`Error: No such affiliate with the given affiliateId!`);
        return;
    }

    const formatDictionaryIntToUserActionStats = (dictionary: Dictionary<bigint, UserActionStats>) => {
        const formatted = [];
        for (const key of dictionary.keys()) {
            const value = dictionary.get(key);
            if (value !== undefined) {
                const lastActionDate = new Date(Number(value.lastUserActionTimestamp) * 1000).toLocaleString();
                formatted.push(`${key.toString()}: { numActions: ${value.numActions}, lastUserActionTimestamp: ${lastActionDate} }`);
            }
        }
        return formatted.join(', ');
    };

    const formattedOutput = {
        campaignId: campaignId.toString(),
        advertiser: advertiser.toString(),
        affiliateId: affiliateId,
        affiliate: affiliateData.affiliate.toString(),
        userActionsStats: formatDictionaryIntToUserActionStats(affiliateData.userActionsStats),
        premiumUserActionsStats: formatDictionaryIntToUserActionStats(affiliateData.premiumUserActionsStats),
        pendingApprovalEarnings: fromNano(affiliateData.pendingApprovalEarnings),
        withdrawableEarnings: fromNano(affiliateData.withdrawEarnings),
        totalEarningsOverTime: fromNano(affiliateData.totalEarnings)
    };

    console.log(formattedOutput);
}
