import { toNano, Address, fromNano } from '@ton/core';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { Campaign } from '../../wrappers/Campaign';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS, MAX_ATTEMPTS } from '../constants'

//$env:WALLET_MNEMONIC="24 words here"
//echo $env:WALLET_MNEMONIC
//$env:WALLET_VERSION="v4"
//echo $env:WALLET_VERSION

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
	
	const affiliateId = BigInt(args.length > 2 ? args[2] : await ui.input('AffiliateId: '));
	const userActionOpCode = BigInt(args.length > 3 ? args[3] : await ui.input('user Action OP Code: '));
	const isPremiumUser = args.length > 4
		? args[4].trim().toLowerCase() === 'true' // Parse input argument if provided
		: (await ui.input('isPremiumUser: ')).trim().toLowerCase() === 'true'; // Prompt user and parse input
		
	const campaign = provider.open(Campaign.fromAddress(campaignAddress));
	let affiliateBalanceBefore = (await campaign.getAffiliateData(affiliateId))!.totalEarnings;
	
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

    ui.write('Waiting for Campaign to update affiliateBalance...');
	
	// change this to affiliate balance
    let affiliateBalanceAfter = (await campaign.getAffiliateData(affiliateId))!.totalEarnings;
    let attempt = 1;
    while (affiliateBalanceBefore === affiliateBalanceAfter) {
		
		if (attempt == MAX_ATTEMPTS) {
			// tx failed
			ui.write(`Error: TX failed or timedout!`);
			return;
		}
	
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        affiliateBalanceAfter = (await campaign.getAffiliateData(affiliateId))!.totalEarnings;
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
