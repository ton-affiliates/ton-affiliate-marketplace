// utils.ts
import { beginCell, Cell, Address } from '@ton/core';


export const USDT_MASTER_ADDRESS = Address.parse("kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy");
export const USDT_WALLET_BYTECODE = "b5ee9c7201020f010003d1000114ff00f4a413f4bcf2c80b01020162020302f8d001d0d3030171b08e48135f038020d721ed44d0d303fa00fa40fa40d104d31f01840f218210178d4519ba0282107bdd97deba12b1f2f48040d721fa003012a0401303c8cb0358fa0201cf1601cf16c9ed54e0fa40fa4031fa0031f401fa0031fa00013170f83a02d31f012082100f8a7ea5ba8e85303459db3ce03304050201200d0e01f203d33f0101fa00fa4021fa4430c000f2e14ded44d0d303fa00fa40fa40d15309c7052471b0c00021b1f2ad522bc705500ab1f2e0495115a120c2fff2aff82a54259070546004131503c8cb0358fa0201cf1601cf16c921c8cb0113f40012f400cb00c920f9007074c8cb02ca07cbffc9d004fa40f401fa00200602d0228210178d4519ba8e84325adb3ce034218210595f07bcba8e843101db3ce032208210eed236d3ba8e2f30018040d721d303d1ed44d0d303fa00fa40fa40d1335142c705f2e04a403303c8cb0358fa0201cf1601cf16c9ed54e06c218210d372158cbadc840ff2f00809019820d70b009ad74bc00101c001b0f2b19130e2c88210178d451901cb1f500a01cb3f5008fa0223cf1601cf1626fa025007cf16c9c8801801cb055004cf1670fa024063775003cb6bccccc945370700b42191729171e2f839206e938124279120e2216e94318128739101e25023a813a0738103a370f83ca00270f83612a00170f836a07381040982100966018070f837a0bcf2b0048050fb005803c8cb0358fa0201cf1601cf16c9ed5403f4ed44d0d303fa00fa40fa40d12372b0c002f26d07d33f0101fa005141a004fa40fa4053bac705f82a5464e070546004131503c8cb0358fa0201cf1601cf16c921c8cb0113f40012f400cb00c9f9007074c8cb02ca07cbffc9d0500cc7051bb1f2e04a09fa0021925f04e30d26d70b01c000b393306c33e30d55020a0b0c01f2ed44d0d303fa00fa40fa40d106d33f0101fa00fa40f401d15141a15288c705f2e04926c2fff2afc882107bdd97de01cb1f5801cb3f01fa0221cf1658cf16c9c8801801cb0526cf1670fa02017158cb6accc903f839206e943081169fde718102f270f8380170f836a0811a7770f836a0bcf2b0028050fb00030c0060c882107362d09c01cb1f2501cb3f5004fa0258cf1658cf16c9c8801001cb0524cf1658fa02017158cb6accc98011fb00007a5054a1f82fa07381040982100966018070f837b60972fb02c8801001cb055005cf1670fa027001cb6a8210d53276db01cb1f5801cb3fc9810082fb0059002003c8cb0358fa0201cf1601cf16c9ed540027bfd8176a2686981fd007d207d206899fc15209840021bc508f6a2686981fd007d207d2068af81c";

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

console.log('contractAddress: \n');
let contractAddress = 'kQBu9Ap6sgyLXe6xAIqhA4x9MMixz--H3gFALL2lx8uUxDI_';
let addressFormats = translateAddress(contractAddress);
console.log(addressFormats);


console.log('contractWalletAddressFromUsdT: \n');
let contractWalletAddress = parseBOCAddress("b5ee9c72010101010024000043800dfc2dfc728b7e7e4a428446b003c7190137838f43082feaad593768e935fdad70");
addressFormats = translateAddress(contractWalletAddress.toString());
console.log(addressFormats);


console.log('contractWalletAddressFromTx: \n');
let contractWalletAddressStr = 'kQBv4W_jlFvz8lIUIjWAHjjICbwcehhBf1VqybtHSa_ta96X';
addressFormats = translateAddress(contractWalletAddressStr.toString());
console.log(addressFormats);