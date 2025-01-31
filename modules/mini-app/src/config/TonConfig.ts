// src/config/TonConfig.ts
import { Address, toNano } from '@ton/core';

export class TonConfig {
  static readonly USDT_WALLET_BYTECODE = import.meta.env.VITE_USDT_WALLET_BYTECODE;

  static readonly USDT_MASTER_ADDRESS = Address.parse(
    import.meta.env.VITE_USDT_MASTER_ADDRESS
  );

  static readonly BOT_ADDRESS = Address.parse(
    import.meta.env.VITE_BOT_ADDRESS
  );

  static readonly AFFILIATE_MARKETPLACE_ADDRESS = Address.parse(
    import.meta.env.VITE_AFFILIATE_MARKETPLACE_ADDRESS
  );

  static readonly HTTP_ENDPOINT_NETWORK = import.meta.env.VITE_HTTP_ENDPOINT_NETWORK;

  // General configuration
  static readonly MIN_BUFFER_GAS_FEES = toNano(import.meta.env.VITE_MIN_BUFFER_GAS_FEES || "0.5");
  static readonly GAS_FEE = toNano(import.meta.env.VITE_GAS_FEE || "0.05");
  static readonly MAX_ATTEMPTS = Number(import.meta.env.VITE_MAX_ATTEMPTS || 20);

  static readonly ADVERTISER_FEE_PERCENTAGE = BigInt(import.meta.env.VITE_ADVERTISER_FEE_PERCENTAGE || 0);
  static readonly AFFILIATE_FEE_PERCENTAGE = BigInt(import.meta.env.VITE_AFFILIATE_FEE_PERCENTAGE || 200);
}
