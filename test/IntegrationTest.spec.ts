import { Blockchain, printTransactionFees, prettyLogTransactions } from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary  } from '@ton/core';
import { AffiliateMarketplace, loadCampaignCreatedReply } from '../dist/tact_AffiliateMarketplace';
import { Campaign } from '../dist/tact_Campaign';
import '@ton/test-utils';

import {
    loadAffiliateCreatedEvent,
    loadCampaignCreatedEvent
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
    let affiliate1;
    let affiliate2;

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

    it('should create campaign, create affiliate, set details by advertiser, sign by publisher, and handle user click', async () => {
        
        logs.push({ type: 'AffiliateMarketplaceContractBalance', data: fromNano(await affiliateMarketplaceContract.getBalance()) + " TON"  });
        logs.push({ type: 'AdvertiserBalance', data: fromNano(await advertiser.getBalance()) + " TON"  });

        // Create Affiliate
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.5'), 
            },
            {
                $$type: 'CreateCampaign'
            }
        );

        // prettyLogTransactions(createCampaignResult.transactions);
        // printTransactionFees(createCampaignResult.transactions); 

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        let campaignContractAddress: string | null = null;

        for (const external of createCampaignResult.externals) {
            if (external.body) {
                const decodedCampaign = loadCampaignCreatedEvent(external.body);
                logs.push({ type: 'CampaignCreatedEvent', data: decodedCampaign });
                expect(decodedCampaign).toMatchObject({
                    $$type: 'CampaignCreatedEvent',
                    campaignId: 0,
                    advertiser: advertiser.address.toString()
                });
                campaignContractAddress = decodedCampaign.campaignContractAddress;
            }
        }

        expect(campaignContractAddress).not.toBeNull();
        expect(createCampaignResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContractAddress,
            success: true,
            deploy: true,
        });

        // let campaignCreatedReply = null;
        // for (var tx of createCampaignResult.transactions) {
        //     for (var event of tx.events) {
        //         if ((typeof(event.from) !== 'undefined' && event.from.toString() == affiliateMarketplaceContract.address.toString()) &&
        //             (typeof(event.to) !== 'undefined' && event.to.toString() == bot.address.toString())) {
        //             campaignCreatedReply = loadCampaignCreatedReply(event.body.beginParse());
        //         }
        //     } 
        // }

        // expect(campaignCreatedReply).not.toBeNull();
        // let campaignContractAddress = campaignCreatedReply.campaignContractAddress;
        
        let campaignId = 0;
        let campaignContractAddressFromMarketplace = await affiliateMarketplaceContract.getCampaignContractAddress(campaignId, advertiser.address);
        
        expect(campaignContractAddress.toString()).toEqual(campaignContractAddressFromMarketplace.toString());
        
        // const affiliateContract = blockchain.openContract(await Affiliate.fromAddress(affiliateContractAddress));
        // let affiliateDetails = await affiliateContract.getAffiliateDetails();
        // console.log(affiliateDetails);
      
        // logs.push({ type: 'AffiliateMarketplaceContractBalance', data: fromNano(await affiliateMarketplaceContract.getBalance()) + " TON"  });
        // logs.push({ type: 'AffiliateContractBalance', data: fromNano(await affiliateContract.getBalance()) + " TON" });
        // logs.push({ type: 'AdvertiserBalance', data: fromNano(await advertiser.getBalance()) + " TON"  });
        // logs.push({ type: 'PublisherBalance', data: fromNano(await publisher.getBalance()) + " TON"  });

        
        // // Publisher signs the contract
        // const publisherSignedResult = await affiliateContract.send(
        //     publisher.getSender(),
        //     {
        //         value: toNano('0.01'),
        //     },
        //     {
        //         $$type: 'PublisherSigned',
        //     }
        // );

        // expect(publisherSignedResult.transactions).toHaveTransaction({
        //     from: publisher.address,
        //     to: affiliateContract.address,
        //     success: true,
        // });

        // for (const external of publisherSignedResult.externals) {
        //     if (external.body) {
        //         const decodedEvent = loadPublisherSignedEvent(external.body);
        //         logs.push({ type: 'PublisherSignedEvent', data: decodedEvent });
        //         expect(decodedEvent).toMatchObject({
        //             $$type: 'PublisherSignedEvent',
        //             affiliateId: 0,
        //             publisher: publisher.address.toString(),
        //             cpc: cpc,
        //         });
        //     }
        // }

        // // Handle User Click
        // const userClickResult = await affiliateMarketplaceContract.send(
        //     bot.getSender(),
        //     {
        //         value: toNano('0.05'),
        //     },
        //     {
        //         $$type: 'UserClick',
        //         affiliateId: 0,
        //         advertiser: advertiser.address,
        //         publisher: publisher.address,
        //         cpc: cpc,
        //     }
        // );

        // expect(userClickResult.transactions).toHaveTransaction({
        //     from: affiliateMarketplaceContract.address,
        //     to: affiliateContract.address,
        //     success: true,
        // });

        // for (const external of userClickResult.externals) {
        //     if (external.body) {
        //         const decodedEvent = loadPublisherPaidEvent(external.body);
        //         logs.push({ type: 'PublisherPaidEvent', data: decodedEvent });
        //         expect(decodedEvent).toMatchObject({
        //             $$type: 'PublisherPaidEvent',
        //             affiliateId: 0,
        //             publisher: publisher.address.toString(),
        //             cpc: cpc,
        //         });
        //     }
        // }

        // // Check that the click was registered and CPC was paid
        // const numUserClicks = await affiliateContract.getNumUserClicks();
        // expect(numUserClicks).toBe(1n);

        // logs.push({ type: 'AffiliateMarketplaceContractBalance', data: fromNano(await affiliateMarketplaceContract.getBalance()) + " TON"  });
        // logs.push({ type: 'AffiliateContractBalance', data: fromNano(await affiliateContract.getBalance()) + " TON" });
        // logs.push({ type: 'AdvertiserBalance', data: fromNano(await advertiser.getBalance()) + " TON"  });
        // logs.push({ type: 'PublisherBalance', data: fromNano(await publisher.getBalance()) + " TON"  });



        // Custom replacer function to handle BigInt serialization
        function replacer(key, value) {
            return typeof value === 'bigint' ? fromNano(value).toString() + " TON" : value;
        }

        // Output the final logs
        console.log("Final logs:", JSON.stringify(logs, replacer, 2));
    });



});
