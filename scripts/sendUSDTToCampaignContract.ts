import { TonClient, WalletContractV4, beginCell, Address, internal, toNano, TonClient4 } from 'ton';
import { mnemonicToWalletKey, mnemonicToPrivateKey } from 'ton-crypto';
import { hexToCell, USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE, translateAddress } from '../test/utils';
import { NetworkProvider } from '@ton/blueprint';
import { getHttpEndpoint, getHttpV4Endpoint } from '@orbs-network/ton-access';



const mnemonicStr = "wisdom normal seat profit pool slender random age bulk ski since oppose lawn gym path sadness recipe butter scissors script april fatigue cargo deliver";

const CONTRACT_ADDRESS = Address.parse('EQAvJx_TN86bEMTWUJg3G5-uc1BdCLDMcIY7odRsmJ9TJ9WE'); // Replace with your contract's address

// Function to get the Jetton wallet address
async function checkJettonWalletAddress(
    client: TonClient,
    jettonMasterAddress: Address,
    walletAddress: Address
): Promise<Address> {
    const { stack } = await client.callGetMethod(jettonMasterAddress, 'get_wallet_address', [
        { type: 'slice', cell: beginCell().storeAddress(walletAddress).endCell() }
    ]);
    return stack.readAddress();
}

// Function to get the Jetton wallet balance
async function checkJettonBalance(
    client: TonClient,
    jettonWalletAddress: Address
): Promise<string> {
    const { stack } = await client.callGetMethod(jettonWalletAddress, 'get_wallet_data');
    const balance = stack.readBigNumber();
    return balance.toString();
}

// Function to transfer Jetton tokens
async function transferJettonTokens(
    fromMnemonic: string[],
    toAddress: Address,
    jettonMasterAddress: Address,
    transferAmount: string
) {

	const endpoint = await getHttpV4Endpoint({ network: 'testnet' });
    const client2 = new TonClient4({ endpoint });
    //let mnemonics = (process.env.mnemonics || '').toString(); // 🔴 Change to your own, by creating .env file!
    let keyPair = await mnemonicToPrivateKey(fromMnemonic);

    let workchain = 0;
    let wallet_create = WalletContractV4.create({
        workchain,
        publicKey: keyPair.publicKey,
		walletId: 0
    });
    let wallet = client2.open(wallet_create);
    console.log('Wallet address: ', wallet.address);
	
	
	//------------------------------------------------------------------------------------------------------------------------------------------

    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: 'dca02dcbbca33b7f5378edba40fdcf0b7c221d4b1ae65e6ff67d0acf5c5da3e6'
    });

    try {
        const key = await mnemonicToWalletKey(fromMnemonic);
        const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0, walletId: 0}); 
        const walletContract = client.open(wallet);
		
		console.log("Public Key:", key.publicKey.toString('hex'));
		console.log("Derived Wallet Address:", wallet.address.toString());
		let addressFormats = translateAddress(wallet.address.toString());
		console.log(addressFormats);


        const jettonWalletAddress = await checkJettonWalletAddress(client, jettonMasterAddress, wallet.address);
		console.log("Jetton wallet address");
		console.log(jettonWalletAddress);
        const jettonBalanceBefore = await checkJettonBalance(client, jettonWalletAddress);
		console.log(jettonBalanceBefore);
	} catch (error) {
        console.error('Error during Jetton transfer:', error);
    }
}

export async function run(provider: NetworkProvider) {
    const fromMnemonic = mnemonicStr.split(" "); // Replace with your mnemonic
    const toAddress = CONTRACT_ADDRESS;
    const jettonMasterAddress = USDT_MASTER_ADDRESS;
    const transferAmount = "150";
	
	console.log(fromMnemonic);

    await transferJettonTokens(fromMnemonic, toAddress, jettonMasterAddress, transferAmount);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

