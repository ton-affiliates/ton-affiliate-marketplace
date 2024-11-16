// utils.ts
import { beginCell, Cell, Address } from '@ton/core';

interface AddressFormats {
    rawAddress: string;
    raw: string;
    userFriendly: string;
    base64url: string;
    rawUrlSafe: string;
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

 //console.log('contractAddress: \n');
 //let contractAddress = 'kQAbvOXqra3-pu4fXknkJv6B0xbDtS4IrFjTpjgEuSaMp__w';
 //let addressFormats = translateAddress(contractAddress);
 //console.log(addressFormats);


//console.log('contractWalletAddressFromUsdT: \n');
//let contractWalletAddress = parseBOCAddress("b5ee9c720101010100240000438003779cbd55b5bfd4ddc3ebc93c84dfd03a62d876a5c1158b1a74c7009724d194f0");
//addressFormats = translateAddress(contractWalletAddress.toString());
//console.log(addressFormats);


//console.log('contractWalletAddressFromTx: \n');
 //let contractWalletAddressStr = 'kQBu9Ap6sgyLXe6xAIqhA4x9MMixz--H3gFALL2lx8uUxDI_';
 //addressFormats = translateAddress(contractWalletAddressStr.toString());
 //console.log(addressFormats);