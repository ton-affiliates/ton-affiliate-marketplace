import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { AffiliateMarketplace } from '../wrappers/AffiliateMarketplace';
import '@ton/test-utils';

describe('AffiliateMarketplace', () => {
    let blockchain: Blockchain;
    let bot: any;
    let deployer: SandboxContract<TreasuryContract>;
    let affiliateMarketplace: SandboxContract<AffiliateMarketplace>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        bot = await blockchain.treasury('bot')
        affiliateMarketplace = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await affiliateMarketplace.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplace.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and affiliateMarketplace are ready to use
    });
});
