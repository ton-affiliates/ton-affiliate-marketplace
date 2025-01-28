// constants.ts
import { Address, toNano } from '@ton/core';



console.log(import.meta.env.VITE_BOT_ADDRESS);
console.log(import.meta.env.VITE_AFFILIATE_MARKETPLACE_ADDRESS);
console.log(import.meta.env.VITE_USDT_MASTER_ADDRESS);
console.log(import.meta.env.VITE_HTTP_ENDPOINT_NETWORK);

export const USDT_WALLET_BYTECODE = 
import.meta.env.VITE_USDT_WALLET_BYTECODE;

export const USDT_MASTER_ADDRESS = Address.parse(
  import.meta.env.VITE_USDT_MASTER_ADDRESS
);

export const BOT_ADDRESS = Address.parse(
  import.meta.env.VITE_BOT_ADDRESS
);

export const AFFILIATE_MARKETPLACE_ADDRESS = Address.parse(
  import.meta.env.VITE_AFFILIATE_MARKETPLACE_ADDRESS
);

export const HTTP_ENDPOINT_NETWORK = import.meta.env.VITE_HTTP_ENDPOINT_NETWORK;

// General configuration
export const MIN_BUFFER_GAS_FEES = toNano(import.meta.env.VITE_MIN_BUFFER_GAS_FEES || "0.5");
export const GAS_FEE = toNano(import.meta.env.VITE_GAS_FEE || "0.05");
export const MAX_ATTEMPTS = Number(import.meta.env.VITE_MAX_ATTEMPTS || 20);

export const ADVERTISER_FEE_PERCENTAGE = BigInt(import.meta.env.VITE_ADVERTISER_FEE_PERCENTAGE || 0); // 0%
export const AFFILIATE_FEE_PERCENTAGE = BigInt(import.meta.env.VITE_AFFILIATE_FEE_PERCENTAGE || 200); // 2%

// Bot OpCodes
export const BOT_OP_CODE_USER_CLICK = BigInt(0);
export const BOT_OP_CODE_USER_RETAINED_TWO_WEEKS = BigInt(1);

// Dictionary mapping each opcode to a friendly label
export const BOT_ACTION_LABELS = new Map<bigint, string>([
  [BOT_OP_CODE_USER_CLICK, 'User Click'],
  [BOT_OP_CODE_USER_RETAINED_TWO_WEEKS, 'User Retained For 2 Weeks'],
]);