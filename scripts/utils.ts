// utils.ts
import { beginCell, Cell, Address, Dictionary, toNano } from '@ton/core';
import { USDT_MASTER_ADDRESS } from './constants'
import { TonClient } from '@ton/ton'

export interface AddressFormats {
    rawAddress: string;
    raw: string;
    userFriendly: string;
    base64url: string;
    rawUrlSafe: string;
}

// Function to calculate Jetton Wallet Address
export async function getUSDTWalletAddress (ownerAddressStr: string, client: TonClient) {
  let ownerAddress = Address.parse(ownerAddressStr);
  const ownerAddressCell = beginCell().storeAddress(ownerAddress).endCell();
  const result = await client.runMethod(USDT_MASTER_ADDRESS, 'get_wallet_address', [{ type: 'slice', cell: ownerAddressCell }]);
  return result.stack.readAddress();
}

export function translateAddress(address: string): AddressFormats {
    const parsedAddress = Address.parse(address);

    // Manually construct the "raw address" in workchain:hex format
    const rawAddress = `${parsedAddress.workChain}:${parsedAddress.hash.toString('hex')}`;

    // Generate other address formats
    const raw = parsedAddress.toString({ urlSafe: false, bounceable: false });
    const userFriendly = parsedAddress.toString({ urlSafe: false, bounceable: true });
    const base64url = parsedAddress.toString({ urlSafe: true, bounceable: true });
    const rawUrlSafe = parsedAddress.toString({ urlSafe: true, bounceable: false });

    return {
        rawAddress,      // e.g., "0:abcdef1234567890..."
        raw,
        userFriendly,
        base64url,
        rawUrlSafe
    };
}


export function hexToCell(hex: string): Cell {
	const bytes = Buffer.from(hex, 'hex');
    return Cell.fromBoc(bytes)[0]; // Convert the byte buffer to a Cell
}

export function base64ToCell(base64: string): Cell {
    const bytes = Buffer.from(base64, 'base64');
    return Cell.fromBoc(bytes)[0]; // Convert the byte buffer to a Cell
}

export function stringToCell(str: string): Cell {
    const cellBuilder = beginCell();
    cellBuilder.storeBuffer(Buffer.from(str, 'utf-8')); // Encode the string as UTF-8 and store in cell
    return cellBuilder.endCell();
}


function hexToString(hex: string): string {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        const byte = hex.slice(i, i + 2);
        str += String.fromCharCode(parseInt(byte, 16));
    }
    return str;
}

function base64ToString(base64: string): string {
    const buffer = Buffer.from(base64, 'base64'); // Decode the Base64 string to a buffer
    return buffer.toString('utf-8'); // Convert the buffer to a UTF-8 string
}

function hextoAddressStr(hexAddress: string): string {
	
	const addressBuffer = Buffer.from(hexAddress, 'hex');

	// Define the workchain ID, commonly `0` or `-1`
	const workchainId = 0;

	// Create the Address object
	const address = new Address(workchainId, addressBuffer);

	return address.toString(); // Outputs the address in TON’s user-friendly format
}


function parseBOCAddress(bocHex: string): Address {
    // Convert the hex string to a buffer
    const bocBuffer = Buffer.from(bocHex, 'hex');

    // Parse the buffer as a BOC and get the first cell (root cell)
    const cell = Cell.fromBoc(bocBuffer)[0];

    // Use beginParse to safely interpret the cell as an address
    const address = cell.beginParse().loadAddress();
    
    if (!address) {
        throw new Error('Failed to parse address from BOC.');
    }

    return address;
}

/**
 * Converts a user-entered USDT amount (e.g., "100.5" or 100.5) to 6-decimal representation.
 * @param {string | number} amount - The user-entered amount in human-readable format (e.g., 100.5).
 * @returns {bigint} - The amount converted to 6-decimal representation as a bigint.
 */
export function toUSDT(amount: string | number): bigint {
    const factor = BigInt(10 ** 6);
    const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!Number.isFinite(parsedAmount)) {
        throw new Error("Invalid amount: Must be a finite number.");
    }
    return BigInt(Math.round(parsedAmount * 10 ** 6));
}

/**
 * Converts a USDT amount from 6-decimal representation to a human-readable format.
 * @param {bigint} amount - The amount in 6-decimal representation.
 * @returns {string} - The amount in human-readable format.
 */
export function fromUSDT(amount: bigint): string {
    const factor = 10 ** 6;
    return (Number(amount) / factor).toFixed(6); // Format with 6 decimals
}

export function parseBigIntToPriceMap(input: string): Dictionary<bigint, bigint> {
    const map = Dictionary.empty<bigint, bigint>();

    if (input) {
        // Remove curly brackets and whitespace
        const sanitizedInput = input.trim().replace(/^\{|\}$/g, '').replace(/\s+/g, '');
        
        const pairs = sanitizedInput.split(','); // Split into key-value pairs
        for (const pair of pairs) {
            const [key, value] = pair.split(':');
            if (key && value) {
                map.set(BigInt(key), toNano(value));
            }
        }
    }

    return map;
}




// /**
//  * Loads a dictionary of affiliateId to amountToWithdraw from user input or a provided argument.
//  * @param input Optional input string in the format "{0: 100, 1: 0.1}".
//  * @returns A Dictionary<BigInt, BigInt> mapping affiliateId to amountToWithdraw.
//  */
// async function loadAffiliateIdToAmountMap(userInput: string): Promise<Dictionary<bigint, bigint>> {
//     const affiliateIdToAmountMap = Dictionary.empty<bigint, bigint>();

//     try {
//         // Parse JSON-like input (e.g., "{1: 100, 2: 200}")
//         const parsedInput: Record<string, number> = JSON.parse(
//             userInput.replace(/(\w+):/g, '"$1":') // Convert to valid JSON format
//         );

//         // Populate the dictionary
//         for (const [key, value] of Object.entries(parsedInput)) {
//             const affiliateId = BigInt(key);
//             const amountToWithdraw = value;
// 			console.log(`Withdraw ${amountToWithdraw} for affiliate ${affiliateId}`);
// 			affiliateIdToAmountMap.set(affiliateId, toNano(amountToWithdraw.toString()));
//         }
//     } catch (error) {
//         console.error("Invalid input format. Please provide input as {1: 100, 2: 200}.");
//         throw error;
//     }

//     return affiliateIdToAmountMap;
// }


// Example usage:
//const usdtInNano = toUSDT("10.5"); // Converts "10.5" USDT to 10,500,000
//console.log(usdtInNano); // Output: 10500000n

//const usdtHumanReadable = fromUSDT(usdtInNano); // Converts back to "10.500000"
//console.log(usdtHumanReadable); // Output: "10.500000"


 //console.log('contractAddress: \n');
 //let contractAddress = 'kQAbvOXqra3-pu4fXknkJv6B0xbDtS4IrFjTpjgEuSaMp__w';
 //let addressFormats = translateAddress(contractAddress);
 //console.log(addressFormats);


//console.log('contractWalletAddressFromUsdT: \n');
//let contractWalletAddress = parseBOCAddress("b5ee9c720101010100240000438003779cbd55b5bfd4ddc3ebc93c84dfd03a62d876a5c1158b1a74c7009724d194f0");
//let addressFormats = translateAddress(contractWalletAddress.toString());
//console.log(addressFormats);


//console.log('contractWalletAddressFromTx: \n');
 //let contractWalletAddressStr = 'kQBu9Ap6sgyLXe6xAIqhA4x9MMixz--H3gFALL2lx8uUxDI_';
 //addressFormats = translateAddress(contractWalletAddressStr.toString());
 //console.log(addressFormats);



async function main() {
    console.log('contractWalletAddressFromUsdT:\n');

    const bocHex = "b5ee9c7201010101002400004380004cdc3cf9748272d04a3daac35e7498f7bef36e02c8e947b3ee50c9a429aa9c30";

    try {
        let contractWalletAddress = parseBOCAddress(bocHex);
        let addressFormats = translateAddress(contractWalletAddress.toString());

        console.log(addressFormats);
    } catch (error) {
        console.error('Error parsing BOC address:', error);
    }
}

// Run the main function
main();
