import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS, GAS_FEE } from '../constants'

export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();

    const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS));
	const payout = Address.parse(args.length > 0 ? args[0] : await ui.input('Payout address'));	
	
	const userInputAsString: string = await ui.input(`Enter amount to withdraw: `);
	const parsedInput: number = parseFloat(userInputAsString); // Convert input to a number
	
	ui.write(`amount entered by user: ${parsedInput}`);

	if (isNaN(parsedInput) || parsedInput <= 0) {
		ui.write(`amount must be a positive integer!`);
		return;
	}
	
	let balanceBefore = await affiliateMarketplace.getBalance();
	
    await affiliateMarketplace.send(
        provider.sender(),
        {
            value: toNano(GAS_FEE),
        },
        {
			$$type: 'AdminWithdraw',
			amount: toNano(userInputAsString),
			wallets: Dictionary.empty<Address, boolean>().set(payout, true)
        }
    );
		
    ui.write('Waiting for marketplace to update balance...');

    let balanceAfter = await affiliateMarketplace.getBalance();
    let attempt = 1;
    while (balanceBefore === balanceAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        balanceAfter = await affiliateMarketplace.getBalance();
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Affiliate Marketplace updated successfully!');
}
