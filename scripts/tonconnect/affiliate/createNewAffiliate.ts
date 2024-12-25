import TonConnect from '@tonconnect/sdk';
import { Address, Cell, toNano } from '@ton/core';
import { sleep } from './utils/sleep';
import { MAX_ATTEMPTS, GAS_FEE, AFFILIATE_MARKETPLACE_ADDRESS } from './constants';

async function main() {
    const tonConnect = new TonConnect();
    const wallet = await tonConnect.restoreConnection();
    if (!wallet) {
        throw new Error('No wallet connection found.');
    }

    // UI Inputs
    const campaignId = BigInt(prompt('Enter Campaign ID:') || '0');
    const advertiserAddress = Address.parse(prompt('Enter Advertiser Address:') || '');

    // Affiliate Marketplace Address
    const affiliateMarketplaceAddress = Address.parse(AFFILIATE_MARKETPLACE_ADDRESS);

    // Prepare the method call for `getCampaignContractAddress`
    const marketplaceMethodCell = new Cell();
    marketplaceMethodCell.bits.writeUint(0xgetCampaignContractAddressMethodId, 32); // Replace with correct method ID
    marketplaceMethodCell.bits.writeUint(campaignId, 64);
    marketplaceMethodCell.bits.writeAddress(advertiserAddress);

    const getAddressResponse = await wallet.sendTransaction({
        validUntil: Date.now() + 10000, // 10 seconds
        from: wallet.address,
        to: affiliateMarketplaceAddress.toString(),
        amount: toNano('0.05').toString(), // Minimal amount for query
        payload: marketplaceMethodCell.toBoc().toString('base64'),
    });

    const campaignAddress = Address.parse(getAddressResponse);
    console.log(`Campaign Address: ${campaignAddress}`);

    // Check if the contract is deployed
    if (!(await isContractDeployed(campaignAddress))) {
        console.error(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }

    // Retrieve campaign data (numAffiliates)
    const numAffiliatesBefore = await getCampaignData(campaignAddress);
    console.log(`Number of Affiliates Before: ${numAffiliatesBefore}`);

    // Prepare transaction to add a new affiliate
    const newAffiliateMethodCell = new Cell();
    newAffiliateMethodCell.bits.writeUint(0xAffiliateCreateNewAffiliateMethodId, 32); // Replace with correct method ID

    await wallet.sendTransaction({
        validUntil: Date.now() + 10000, // 10 seconds
        from: wallet.address,
        to: campaignAddress.toString(),
        amount: GAS_FEE.toString(),
        payload: newAffiliateMethodCell.toBoc().toString('base64'),
    });

    // Wait for update
    console.log('Waiting for campaign to update numAffiliates...');
    let numAffiliatesAfter = await getCampaignData(campaignAddress);
    let attempt = 1;

    while (numAffiliatesBefore === numAffiliatesAfter) {
        if (attempt === MAX_ATTEMPTS) {
            console.error('Error: Transaction failed or timed out!');
            return;
        }

        console.log(`Attempt ${attempt}`);
        await sleep(2000); // Wait 2 seconds before next attempt
        numAffiliatesAfter = await getCampaignData(campaignAddress);
        attempt++;
    }

    console.log('Campaign updated successfully!');
}

// Helper to check if a contract is deployed
async function isContractDeployed(address: Address): Promise<boolean> {
    const tonConnect = new TonConnect();
    const response = await tonConnect.getAddressState(address.toString());
    return response.state === 'active';
}

// Helper to get campaign data
async function getCampaignData(address: Address): Promise<number> {
    const tonConnect = new TonConnect();
    const response = await tonConnect.runGetMethod(address.toString(), 'getCampaignData');
    return response.result[0]; // Adjust based on method response format
}

// Run the main function
main().catch(console.error);
