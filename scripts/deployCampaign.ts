import { toNano, Address } from '@ton/core';
import { Campaign } from '../wrappers/Campaign';
import { NetworkProvider } from '@ton/blueprint';
import { USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE, BOT_ADDRESS } from './constants'
import { hexToCell } from './utils';

export async function run(provider: NetworkProvider) {

    const deployer = Address.parse("0QCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL5kn");
	const campaignId = BigInt(7);
    const campaign = provider.open(await Campaign.fromInit(deployer, campaignId, deployer, USDT_MASTER_ADDRESS, hexToCell(USDT_WALLET_BYTECODE)));

    await campaign.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'ParentToChildDeployCampaign',
            campaignId: campaignId,
        }
    );

    await provider.waitForDeploy(campaign.address);
}
