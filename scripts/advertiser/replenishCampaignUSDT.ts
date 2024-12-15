import { toNano, Address, fromNano, Dictionary, Cell, beginCell } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { translateAddress, fromUSDT, toUSDT } from '../utils';
import { getUSDTWalletAddress } from '../usdtUtils' 
import {TonClient, internal}from 'ton';
import { randomBytes } from 'crypto';
import * as Constants from "../constants";


function calculateBufferInNanoTON(usdtAmount: number): bigint {
    
	if (usdtAmount <= 0) {
        throw new Error('USDT amount must be a positive number!');
    }

    const bufferPercentage = 2; // Buffer is 2% of the USDT amount
    const usdtBuffer = usdtAmount * (bufferPercentage / 100); // Calculate 2.5% of USDT
    const usdtToTonRate = 5; // 1 TON = 5 USDT
    const tonBuffer = usdtBuffer / usdtToTonRate; // Convert USDT buffer to TON

    const nanoTONFactor = 10n ** 9n; // Convert TON to nanoTON
    const bufferInNanoTON = BigInt(Math.ceil(tonBuffer * Number(nanoTONFactor))); // Ensure rounding up

    return bufferInNanoTON;
}


export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();
	
	const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromAddress(Constants.AFFILIATE_MARKETPLACE_ADDRESS));
    const campaignId = BigInt(args.length > 0 ? args[0] : await ui.input('Campaign id'));
	const advertiser = Address.parse(args.length > 1 ? args[1] : await ui.input('Advertiser address'));	
	
	let campaignAddress = await affiliateMarketplace.getCampaignContractAddress(campaignId, advertiser);
	if (!(await provider.isContractDeployed(campaignAddress))) {
        ui.write(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }
	
	const campaign = provider.open(Campaign.fromAddress(campaignAddress));
    let campaignData = await campaign.getCampaignData();
	
	const campaignBalanceBefore = campaignData.contractUSDTBalance;
	console.log("campaignBalanceBefore(fromNano): " + fromNano(campaignBalanceBefore));
	
	if (campaignData.campaignDetails.paymentMethod !== 1n) {
		ui.write(`Error: Campaign at address ${campaignAddress} is not USDT!`);
        return;
	}
	
	const client = new TonClient({
        endpoint: Constants.TON_CLIENT_ENDPOINT,
        apiKey: Constants.TON_CLIENT_API_KEY
    });
	
	// Calculate sender's Jetton Wallet Address (USDT Wallet)
	let userAddressStr = provider.sender().address!.toString();
    const senderJettonWalletAddress = await getUSDTWalletAddress(userAddressStr, client);
    console.log(`Sender Jetton Wallet Address: ${senderJettonWalletAddress.toString()}`);
	
	let userAddress = Address.parse(userAddressStr);
	
	// ---------
	
	const userInputUSDT: string = await ui.input('Enter USDT amount to replenish as integer (e.g., 100, 250, 1000, etc...):');
	const parsedUSDT: number = parseInt(userInputUSDT, 10); // Convert input to a number

	ui.write(`USDT amount entered by user: ${parsedUSDT}`);

	if (isNaN(parsedUSDT) || parsedUSDT <= 0) {
		ui.write(`USDT amount must be a positive integer!`);
		return;
	}
	
	const bufferNanoTON = calculateBufferInNanoTON(parsedUSDT);
	
	ui.write(`Calculated buffer (TON): ${fromNano(bufferNanoTON)} TON`);
	
    // Minimum buffer in TON (e.g., 1 TON)
	let contractTonBalance = campaignData.contractTonBalance;
    let minimumBufferNanoTON = contractTonBalance >= Constants.MIN_BUFFER_GAS_FEES ? toNano("0") : (Constants.MIN_BUFFER_GAS_FEES - contractTonBalance);
	minimumBufferNanoTON = minimumBufferNanoTON + toNano("0.02");
    const finalBufferNanoTON = bufferNanoTON > minimumBufferNanoTON ? bufferNanoTON : minimumBufferNanoTON;

    // Output final buffer in TON
    ui.write(`Final Buffer (TON): ${fromNano(finalBufferNanoTON)} TON`);
	
	// Generate random query ID
    const randomQueryId = BigInt('0x' + randomBytes(8).toString('hex'));

    // Create forward payload (optional comment)
    const forwardPayload = beginCell()
        .storeUint(0, 32) // 0 opcode means we have a comment
        .storeStringTail('Replenish Campaign with USDT')
        .endCell();

    const forwardTonAmount = finalBufferNanoTON; // TON for forwarding to contract
	const usdtAmountNano = toUSDT(parsedUSDT); // Convert to 6 decimals (nano USDT)
	
	console.log('usdtAmountNano: ' + usdtAmountNano);
	
    const jettonTransferPayload: Cell = beginCell()
        .storeUint(0xf8a7ea5, 32) // OP code for Jetton transfer
        .storeUint(randomQueryId, 64) // Query ID
        .storeCoins(usdtAmountNano) // Amount of USDT to send
        .storeAddress(campaignAddress) // Recipient address
        .storeAddress(campaignAddress) // Response address for excess gas
        .storeBit(0) // No custom payload
        .storeCoins(forwardTonAmount) // Forwarded TON amount
        .storeBit(1) // Forward payload is stored as a reference
        .storeRef(forwardPayload)
        .endCell();
		
	// Fixed gas fee (e.g., 0.05 TON for the transaction)
	const fixedGasFee = toNano('0.05');

	// Calculate the total value to send (forwarded TON + gas fee)
	const totalValueToSend = forwardTonAmount + fixedGasFee;
	  
	// Send the message using `provider.sender()`
    await provider.sender().send({
        value: totalValueToSend, // TON to cover gas fees
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
		
		if (attempt == Constants.MAX_ATTEMPTS) {
			// tx failed
			ui.write(`Error: TX failed or timedout!`);
			return;
		}
	
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        campaignBalanceAfter = (await campaign.getCampaignData()).contractUSDTBalance;
        attempt++;
    }
	
	console.log("\n campaignBalanceAfter(fromNano): " + fromNano(campaignBalanceAfter));
	// convert from 9 decials to string -> 6 decimals -> back to string
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');

};


