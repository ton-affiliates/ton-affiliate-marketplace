import { toNano, Address, fromNano, Dictionary, Cell, beginCell } from '@ton/core';
import { getUSDTWalletAddress }  from "../usdtUtils";
import { Campaign } from '../../wrappers/Campaign';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { USDT_MASTER_ADDRESS, translateAddress } from '../utils'; 
import {TonClient, internal}from 'ton';
import { randomBytes } from 'crypto';



export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();

    const campaignAddress = Address.parse("EQDZj4jAQ4qQSScHYzmyJGRUhHWlKCzkSzat-bIWZ6Mi4wWB"); //  args.length > 0 ? args[0] : await ui.input('Campaign address'));

    if (!(await provider.isContractDeployed(campaignAddress))) {
        ui.write(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }
	
	console.log(campaignAddress);
	
    const campaign = provider.open(Campaign.fromAddress(campaignAddress));
    let campaignData = await campaign.getCampaignData();
	
	const campaignBalanceBefore = campaignData.contractUSDTBalance;
	console.log(campaignData);
	
	console.log("Before:");
	console.log(fromNano(campaignBalanceBefore));
	console.log(campaignData.campaignDetails.paymentMethod);
	
	const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: 'dca02dcbbca33b7f5378edba40fdcf0b7c221d4b1ae65e6ff67d0acf5c5da3e6'
    });
	
	// Calculate sender's Jetton Wallet Address (USDT Wallet)
	let userAddressStr = provider.sender().address!.toString();
    const senderJettonWalletAddress = await getUSDTWalletAddress(userAddressStr, client);
    console.log(`Sender Jetton Wallet Address: ${senderJettonWalletAddress.toString()}`);
	
	let userAddress = Address.parse(userAddressStr);
	
	// ---------
	
	// Generate random query ID
    const randomQueryId = BigInt('0x' + randomBytes(8).toString('hex'));

    // Create forward payload (optional comment)
    const forwardPayload = beginCell()
        .storeUint(0, 32) // 0 opcode means we have a comment
        .storeStringTail('Replenish Campaign with USDT')
        .endCell();

	const usdtAmount = 10n * 10n ** 6n; // Convert 10 USDT to 6 decimals
    const forwardTonAmount = toNano('0.02'); // TON for forwarding
    const jettonTransferPayload: Cell = beginCell()
        .storeUint(0xf8a7ea5, 32) // OP code for Jetton transfer
        .storeUint(randomQueryId, 64) // Query ID
        .storeCoins(usdtAmount) // Amount of USDT to send
        .storeAddress(campaignAddress) // Recipient address
        .storeAddress(userAddress) // Response address for excess gas
        .storeBit(0) // No custom payload
        .storeCoins(forwardTonAmount) // Forwarded TON amount
        .storeBit(1) // Forward payload is stored as a reference
        .storeRef(forwardPayload)
        .endCell();
	  
	// Send the message using `provider.sender()`
    await provider.sender().send({
        value: toNano('0.1'), // TON to cover gas fees
        to: senderJettonWalletAddress, // Sender's Jetton Wallet Address
        body: jettonTransferPayload,
        bounce: true,
    });
    console.log('Jetton transfer sent successfully!');
	
	ui.write('Waiting for campaign to update USDT balance...');
	
	campaignData = await campaign.getCampaignData();
	let campaignBalanceAfter = (await campaign.getCampaignData()).contractUSDTBalance;
	
    let attempt = 1;
    while (campaignBalanceBefore === campaignBalanceAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        campaignBalanceAfter = (await campaign.getCampaignData()).contractUSDTBalance;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully! New Balance: ' + campaignBalanceAfter);

};


