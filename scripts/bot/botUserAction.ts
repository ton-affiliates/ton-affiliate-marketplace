import { toNano, Address, fromNano } from '@ton/core';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { Campaign } from '../../wrappers/Campaign';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS } from '../constants'


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
	
	const affiliateId = BigInt(args.length > 0 ? args[0] : await ui.input('AffiliateId: '));
	const userActionOpCode = BigInt(args.length > 0 ? args[0] : await ui.input('user Action OP Code: '));
	const isPremiumUser = Boolean(args.length > 0 ? args[0] : await ui.input('isPremiumUser: '));
	
	const campaign = provider.open(Campaign.fromAddress(campaignAddress));
	let campaignBalanceBefore = (await campaign.getCampaignData()).campaignBalance;
	
	 await campaign.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
           $$type: 'BotUserAction',
		   affiliateId: affiliateId,
           userActionOpCode: userActionOpCode,
           isPremiumUser: isPremiumUser
        }
    );

    ui.write('Waiting for affiliateMarketplace to update campaignBalance...');

    let campaignBalanceAfter = (await campaign.getCampaignData()).campaignBalance;
    let attempt = 1;
    while (campaignBalanceBefore === campaignBalanceAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        campaignBalanceAfter = (await campaign.getCampaignData()).campaignBalance;
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
