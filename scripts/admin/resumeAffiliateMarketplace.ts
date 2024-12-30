import { toNano, Address, fromNano } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS } from '../constants'

export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();

	const affiliateMarketplaceContract = provider.open(await AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS));
	let stoppedBefore = await affiliateMarketplaceContract.getStopped();
	if (!stoppedBefore) {
        ui.write(`Error: Contract at address ${AFFILIATE_MARKETPLACE_ADDRESS} is already resumed!`);
        return;
    }
	
    await affiliateMarketplaceContract.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        "Resume"
    );
	
    ui.write('Waiting for affiliate marketplace to update stopped flag...');

    let stoppedAfter = await affiliateMarketplaceContract.getStopped();
    let attempt = 1;
    while (stoppedBefore === stoppedAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        stoppedAfter = await affiliateMarketplaceContract.getStopped();
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('AffiliateMarketplace updated successfully!');
}
