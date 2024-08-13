import { Blockchain } from '@ton/sandbox';
import { toNano, fromNano, Address } from '@ton/core';
import { AffiliateMarketplace } from '../dist/tact_AffiliateMarketplace';
import { Affiliate } from '../dist/tact_Affiliate';
import '@ton/test-utils';

// Import events and event loaders
import {
    loadAffiliateCreatedEvent,
    loadAdvertiserSignedEvent,
    loadPublisherSignedEvent,
    loadFundsAddedEvent,
    loadPublisherPaidEvent,
    loadAffiliateRemovedEvent
} from './events';

type EmitLogEvent = {
    type: string;
    data: any;
};

const logs: EmitLogEvent[] = [];

describe('AffiliateMarketplace Integration Test', () => {
    let blockchain;
    let affiliateMarketplaceContract;
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

    it('should create campaign, sign by both parties, add funds, and handle user click', async () => {
        
        const cpc = toNano('0.1');

        // Create Affiliate
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            {
                value: toNano('0.15'), 
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: publisher.address,
                cpc: cpc,
            }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: bot.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        let affiliateContractAddress: string | null = null;
        for (const external of createAffiliateResult.externals) {
            if (external.body) {
                const decodedAffiliate = loadAffiliateCreatedEvent(external.body);
                logs.push({ type: 'AffiliateCreatedEvent', data: decodedAffiliate });
                expect(decodedAffiliate).toMatchObject({
                    $$type: 'AffiliateCreatedEvent',
                    affiliateId: 0,
                    advertiser: advertiser.address.toString(),
                    publisher: publisher.address.toString(),
                    cpc: cpc,
                });
                affiliateContractAddress = decodedAffiliate.affiliateContractAddress;
            }
        }

        expect(affiliateContractAddress).not.toBeNull();
        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: Address.parse(affiliateContractAddress),
            success: true,
            deploy: true,
        });

        const affiliateContract = blockchain.openContract(await Affiliate.fromInit(affiliateMarketplaceContract.address, 0, advertiser.address, publisher.address, cpc));

        // Advertiser signs the contract
        const advertiserSignedResult = await affiliateContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'AdvertiserSigned',
            }
        );

        expect(advertiserSignedResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateContract.address,
            success: true,
        });

        for (const external of advertiserSignedResult.externals) {
            if (external.body) {
                const decodedEvent = loadAdvertiserSignedEvent(external.body);
                logs.push({ type: 'AdvertiserSignedEvent', data: decodedEvent });
                expect(decodedEvent).toMatchObject({
                    $$type: 'AdvertiserSignedEvent',
                    affiliateId: 0,
                    advertiser: advertiser.address.toString(),
                    publisher: publisher.address.toString(),
                    cpc: cpc,
                });
            }
        }

        // Publisher signs the contract
        const publisherSignedResult = await affiliateContract.send(
            publisher.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'PublisherSigned',
            }
        );

        expect(publisherSignedResult.transactions).toHaveTransaction({
            from: publisher.address,
            to: affiliateContract.address,
            success: true,
        });

        for (const external of publisherSignedResult.externals) {
            if (external.body) {
                const decodedEvent = loadPublisherSignedEvent(external.body);
                logs.push({ type: 'PublisherSignedEvent', data: decodedEvent });
                expect(decodedEvent).toMatchObject({
                    $$type: 'PublisherSignedEvent',
                    affiliateId: 0,
                    advertiser: advertiser.address.toString(),
                    publisher: publisher.address.toString(),
                    cpc: cpc,
                });
            }
        }

        // Advertiser adds funds to the campaign
        const addFundsResult = await affiliateContract.send(
            advertiser.getSender(),
            {
                value: toNano('2'), // Amount to add
            },
            {
                $$type: 'AddFunds',
            }
        );

        expect(addFundsResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateContract.address,
            success: true,
        });

        for (const external of addFundsResult.externals) {
            if (external.body) {
                const decodedEvent = loadFundsAddedEvent(external.body);
                logs.push({ type: 'FundsAddedToCampaignEvent', data: decodedEvent });
                expect(decodedEvent).toMatchObject({
                    $$type: 'FundsAddedToCampaignEvent',
                    affiliateId: 0,
                    amountAdded: toNano('2'),
                });
            }
        }

        // Handle User Click
        const userClickResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'UserClick',
                affiliateId: 0,
                advertiser: advertiser.address,
                publisher: publisher.address,
                cpc: cpc,
            }
        );

        expect(userClickResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: affiliateContract.address,
            success: true,
        });

        for (const external of userClickResult.externals) {
            if (external.body) {
                const decodedEvent = loadPublisherPaidEvent(external.body);
                logs.push({ type: 'PublisherPaidEvent', data: decodedEvent });
                expect(decodedEvent).toMatchObject({
                    $$type: 'PublisherPaidEvent',
                    affiliateId: 0,
                    advertiser: advertiser.address.toString(),
                    publisher: publisher.address.toString(),
                    cpc: cpc,
                });
            }
        }

        // Check that the click was registered and CPC was paid
        const numUserClicks = await affiliateContract.getNumUserClicks();
        expect(numUserClicks).toBe(1n);

        // Remove the affiliate
        const removeAffiliateResult = await affiliateContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.02'),
            },
            {
                $$type: 'RemoveAffiliateAndWithdrawFunds',
            }
        );

        expect(removeAffiliateResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateContract.address,
            success: true,
        });

        for (const external of removeAffiliateResult.externals) {
            if (external.body) {
                const decodedEvent = loadAffiliateRemovedEvent(external.body);
                logs.push({ type: 'AffiliateRemovedEvent', data: decodedEvent });
                expect(decodedEvent).toMatchObject({
                    $$type: 'AffiliateRemovedEvent',
                    affiliateId: 0,
                    advertiser: advertiser.address.toString(),
                    publisher: publisher.address.toString(),
                    cpc: cpc,
                });
            }
        }

        // Custom replacer function to handle BigInt serialization
        function replacer(key, value) {
            return typeof value === 'bigint' ? fromNano(value).toString() + " TON" : value;
        }

        // Output the final logs
        console.log("Final logs:", JSON.stringify(logs, replacer, 2));

        const parentBalance = await affiliateMarketplaceContract.getBalance();
        console.log("Parent contract balance: " + fromNano(parentBalance) + " TON");

        const affiliateBalance = await affiliateContract.getBalance();
        console.log("Affiliate contract balance: " + fromNano(affiliateBalance) + " TON");

        const advertiserBalance = await advertiser.getBalance();
        console.log("Advertiser balance: " + fromNano(advertiserBalance) + " TON");

        const publisherBalance = await publisher.getBalance();
        console.log("Publisher balance: " + fromNano(publisherBalance) + " TON");

    });



});
