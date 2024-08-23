import { Blockchain } from '@ton/sandbox';
import { toNano, Address } from '@ton/core';
import { AffiliateMarketplace } from '../dist/tact_AffiliateMarketplace';
import { Affiliate } from '../dist/tact_Affiliate';
import '@ton/test-utils';

// Import events and event loaders
import { loadAffiliateCreatedEvent } from './events';

describe('AffiliateMarketplace Negative Tests', () => {
    let blockchain;
    let affiliateMarketplaceContract;
    let affiliateContract;
    let deployer;
    let bot;
    let advertiser;
    let publisher;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        bot = await blockchain.treasury('bot');
        advertiser = await blockchain.treasury('advertiser');
        publisher = await blockchain.treasury('publisher');
        affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address));

        // Deploy the AffiliateMarketplace contract
        const deployResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            deploy: true,
            success: true,
        });
    });

    // Negative Test Case 1: Only Advertiser Can Deploy New Affiliate
    it('should fail if a non-advertiser tries to create an affiliate', async () => {
        const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            unauthorizedParty.getSender(),
            {
                value: toNano('0.15'),
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: publisher.address,
                cpc: toNano('0.1'),
                amount: toNano('10')
            }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: unauthorizedParty.address,
            to: affiliateMarketplaceContract.address,
            success: false
        });
    });

    // Negative Test Case 2: Publisher Must Be Different From Advertiser
    it('should fail if advertiser tries to create an affiliate with themselves as the publisher', async () => {
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.15'),
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: advertiser.address,
                cpc: toNano('0.1'),
                amount: toNano('10')
            }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: false
        });
    });

    // Negative Test Case 3: Publisher Cannot Be Zero Address
    it('should fail if the publisher address is zero', async () => {
        const zeroAddress = Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000');
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.15'),
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: zeroAddress,
                cpc: toNano('0.1'),
                amount: toNano('10')
            }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: false
        });
    });

    // Negative Test Case 4: Insufficient Funds for Transaction Fee
    it('should fail if there are insufficient funds for the transaction fee', async () => {
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.001'), 
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: publisher.address,
                cpc: toNano('0.1'),
                amount: toNano('10')
            }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: false
        });
    });

    // Negative Test Case 5: CPC Below Minimum Value
    it('should fail if CPC is below the minimum value', async () => {
        const minCpc = toNano('0.008'); // Assuming this is the minimum CPC value
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: publisher.address,
                cpc: minCpc - toNano('0.001'),
                amount: toNano('10')
            }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: false
        });
    });

    // Negative Test Case 6: Only Publisher Can Sign
    it('should fail if a non-publisher tries to sign the contract', async () => {
        
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.05'), 
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: publisher.address,
                cpc: toNano('0.1'),
                amount: toNano('10')
            }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: false
        });

        const affiliateContract = blockchain.openContract(await Affiliate.fromInit(affiliateMarketplaceContract.address, 0, publisher.address, toNano('0.1')));
        
        const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
        const publisherSignResult = await affiliateContract.send(
            unauthorizedParty.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'PublisherSigned',
            }
        );

        expect(publisherSignResult.transactions).toHaveTransaction({
            from: unauthorizedParty.address,
            to: affiliateContract.address,
            success: false
        });
    });

    // // Negative Test Case 8: Only Parent Can Invoke InternalUserClick
    // it('should fail if a non-parent address calls InternalUserClick', async () => {
    //     const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
    //     const userClickResult = await affiliateContract.send(
    //         unauthorizedParty.getSender(),
    //         {
    //             value: toNano('0.01'),
    //         },
    //         {
    //             $$type: 'InternalUserClick',
    //         }
    //     );

    //     expect(userClickResult.transactions).toHaveTransaction({
    //         from: unauthorizedParty.address,
    //         to: affiliateContract.address,
    //         success: false
    //     });
    // });

    // // Negative Test Case 9: Incorrect State for User Click
    // it('should fail if InternalUserClick is called in the wrong state', async () => {
    //     const userClickResult = await affiliateContract.send(
    //         affiliateMarketplaceContract.getSender(),
    //         {
    //             value: toNano('0.01'),
    //         },
    //         {
    //             $$type: 'InternalUserClick',
    //         }
    //     );

    //     expect(userClickResult.transactions).toHaveTransaction({
    //         from: affiliateMarketplaceContract.address,
    //         to: affiliateContract.address,
    //         success: false
    //     });
    // });

    // // Negative Test Case 10: Insufficient Contract Balance
    // it('should fail if there is insufficient contract balance for InternalUserClick', async () => {
    //     // Set up the state where the contract balance is insufficient
    //     const userClickResult = await affiliateContract.send(
    //         affiliateMarketplaceContract.getSender(),
    //         {
    //             value: toNano('0.01'),
    //         },
    //         {
    //             $$type: 'InternalUserClick',
    //         }
    //     );

    //     expect(userClickResult.transactions).toHaveTransaction({
    //         from: affiliateMarketplaceContract.address,
    //         to: affiliateContract.address,
    //         success: false
    //     });
    // });

    // // Negative Test Case 11: Only Owner Can Withdraw
    // it('should fail if a non-owner tries to call AdminWithdraw', async () => {
    //     const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
    //     const withdrawResult = await affiliateMarketplaceContract.send(
    //         unauthorizedParty.getSender(),
    //         {
    //             value: toNano('0.01'),
    //         },
    //         {
    //             $$type: 'AdminWithdraw',
    //             amount: toNano('1'),
    //         }
    //     );

    //     expect(withdrawResult.transactions).toHaveTransaction({
    //         from: unauthorizedParty.address,
    //         to: affiliateMarketplaceContract.address,
    //         success: false
    //     });
    // });

    // // Negative Test Case 12: Insufficient Funds for Withdrawal
    // it('should fail if there are insufficient funds for withdrawal', async () => {
    //     const withdrawResult = await affiliateMarketplaceContract.send(
    //         bot.getSender(),
    //         {
    //             value: toNano('0.01'),
    //         },
    //         {
    //             $$type: 'AdminWithdraw',
    //             amount: toNano('100'), // Assuming this amount is greater than the contract's balance
    //         }
    //     );

    //     expect(withdrawResult.transactions).toHaveTransaction({
    //         from: bot.address,
    //         to: affiliateMarketplaceContract.address,
    //         success: false
    //     });
    // });

    // // Negative Test Case 13: Only Bot Can Invoke UserClick
    // it('should fail if a non-bot address tries to call UserClick', async () => {
    //     const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
    //     const userClickResult = await affiliateMarketplaceContract.send(
    //         unauthorizedParty.getSender(),
    //         {
    //             value: toNano('0.01'),
    //         },
    //         {
    //             $$type: 'UserClick',
    //         }
    //     );

    //     expect(userClickResult.transactions).toHaveTransaction({
    //         from: unauthorizedParty.address,
    //         to: affiliateMarketplaceContract.address,
    //         success: false
    //     });
    // });
});
