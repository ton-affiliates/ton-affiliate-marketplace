import { toNano, Address } from '@ton/core';
import { AffiliateMarketplace } from '../wrappers/AffiliateMarketplace';
import { NetworkProvider } from '@ton/blueprint';
import { hexToCell, USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE, BOT_ADDRESS } from './utils'

export async function run(provider: NetworkProvider) {

    // Initialize contract object
    const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromInit(BOT_ADDRESS, USDT_MASTER_ADDRESS, hexToCell(USDT_WALLET_BYTECODE)));

    await affiliateMarketplace.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(affiliateMarketplace.address);

    // run methods on `affiliateMarketplace`
}
