import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../wrappers/Campaign';
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

    const campaign = provider.open(Campaign.fromAddress(campaignAddress));
    const campaignData = await campaign.getCampaignData();

    // Helper function to format dictionaries
    const formatDictionaryIntToCoin = (dictionary: Dictionary<bigint, bigint>) => {
        const formatted = [];
        for (const key of dictionary.keys()) { // Iterate over keys
            const value = dictionary.get(key); // Get value for the key
            if (value !== undefined) {
                formatted.push(`${key.toString()}: ${fromNano(value)}`);
            }
        }
        return formatted.join(', ');
    };
	
	const formatDictionaryAddressBoolean = (dictionary: Dictionary<Address, Boolean>) => {
        const formatted = [];
        for (const key of dictionary.keys()) { // Iterate over keys
            const value = dictionary.get(key); // Get value for the key
            if (value !== undefined) {
                formatted.push(`${key.toString()}: ${value}`);
            }
        }
        return formatted.join(', ');
    };
	
	const currentTimestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
	const campaignExpiresInNumDays =
		campaignData.campaignDetails.campaignValidForNumDays == null
			? "No Expiration"
			: Math.max(
				  0,
				  Math.ceil(
					  (Number(campaignData.campaignStartTimestamp) +
						  Number(campaignData.campaignDetails.campaignValidForNumDays) * 24 * 60 * 60 -
						  currentTimestamp) /
						  (24 * 60 * 60)
				  )
			  );


    // Format the output
    const formattedOutput = {
        campaignId: campaignData.campaignId.toString(),
        advertiser: campaignData.advertiser.toString(),
        owner: campaignData.owner.toString(),
        payout: campaignData.payout.toString(),
        campaignDetails: {
            regularUsersCostPerAction: formatDictionaryIntToCoin(campaignData.campaignDetails.regularUsersCostPerAction),
            premiumUsersCostPerAction: formatDictionaryIntToCoin(campaignData.campaignDetails.premiumUsersCostPerAction),
            allowedAffiliates: formatDictionaryAddressBoolean(campaignData.campaignDetails.allowedAffiliates),
            isPublicCampaign: campaignData.campaignDetails.isPublicCampaign,
            campaignExpiresInNumDays: campaignExpiresInNumDays,
            paymentMethod: campaignData.campaignDetails.paymentMethod == BigInt(0) ? "TON" : "USDT",
            requiresAdvertiserApprovalForWithdrawl: campaignData.campaignDetails.requiresAdvertiserApprovalForWithdrawl,
        },
        numAffiliates: campaignData.numAffiliates.toString(),
        totalAffiliateEarnings: fromNano(campaignData.totalAffiliateEarnings),
        state: campaignData.state.toString(),
        campaignStartTimestamp: new Date(Number(campaignData.campaignStartTimestamp) * 1000).toLocaleString(),
        lastUserActionTimestamp: new Date(Number(campaignData.lastUserActionTimestamp) * 1000).toLocaleString(),
        numAdvertiserWithdrawls: campaignData.numAdvertiserWithdrawls.toString(),
        numAdvertiserSignOffs: campaignData.numAdvertiserSignOffs.toString(),
        numUserActions: campaignData.numUserActions.toString(),
        campaignBalance: fromNano(campaignData.campaignBalance),
        maxCpaValue: fromNano(campaignData.maxCpaValue),
        contractTonBalance: fromNano(campaignData.contractTonBalance),
        contractAddress: campaignData.contractAddress.toString(),
        contractUSDTBalance: fromNano(campaignData.contractUSDTBalance),
        contractUsdtJettonWallet: campaignData.contractUsdtJettonWallet.toString(),
        feePercentage: campaignData.feePercentage.toString(),
        campaignHasSufficientFundsToPayMaxCpa: campaignData.campaignHasSufficientFundsToPayMaxCpa,
        isCampaignExpired: campaignData.isCampaignExpired,
        isCampaignPausedByAdmin: campaignData.isCampaignPausedByAdmin,
        campaignHasSufficientTonToPayGasFees: campaignData.campaignHasSufficientTonToPayGasFees,
        isCampaignActive: campaignData.isCampaignActive,
        topAffiliates: formatDictionaryIntToCoin(campaignData.topAffiliates),
    };

    console.log(formattedOutput);
}
