// src/entity/Campaign.ts

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TelegramAsset } from './TelegramAsset';
import {
  getEventDefinitionByOpCode,
} from '@common/UserEventsConfig';

export interface RequiredPrivileges {
  internal: string[];
  external: string[];
}

@Entity('campaigns')
export class Campaign {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'id' })
  id: string;

  @ManyToOne(() => TelegramAsset, (telegramAsset) => telegramAsset.campaigns, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'telegram_asset_id' })
  telegramAsset: TelegramAsset | null;

  @Column({ type: 'varchar', length: 255, name: 'contract_address' })
  contractAddress: string;

  @Column({ type: 'varchar', length: 255, name: 'name', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 255, name: 'category', nullable: true })
  category: string | null;

  /**
   * We store an array of numeric op codes (e.g., [0, 1, 2])
   * instead of an enum array of `UserEventType`.
   */
  @Column({
    type: 'bigint',
    array: true,
    name: 'verified_events',
    default: [],
  })
  eventsToVerify: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 1) Checks if the bot can verify events
   *    - Must have an associated TelegramAsset
   *    - Bot must be admin (`botIsAdmin === true`)
   *    - Must have the required privileges for *all* events in `eventsToVerify`.
   */
  canBotVerifyEvents(): boolean {
    if (!this.telegramAsset || !this.telegramAsset.botIsAdmin) {
      return false;
    }

    // Which privileges do we need for the eventsToVerify array?
    const requiredPrivs = this.getRequiredAdminPrivilegesToVerifyEvents();

    // Check if the Telegram asset's `adminPrivileges` includes them all.
    // (Your existing code might do partial or all-match logic. This example does "must have all.")
    for (const needed of requiredPrivs.internal) {
      if (!this.telegramAsset.adminPrivileges.includes(needed)) {
        return false;
      }
    }
    return true;
  }

  

  /**
   * 2) Returns an array of required privileges based on the events in `eventsToVerify`.
   *    We read from the config => find each event => gather its required interal privileges
   *    for the relevant asset type (e.g. "supergroup" vs. "channel").
   */
  getRequiredAdminPrivilegesToVerifyEvents(): RequiredPrivileges {
    
    if (!this.telegramAsset) {
      throw new Error("No assetType associated with campaign: " + this.id);
    }

    // We'll load definitions from the config and gather unique privileges in two Sets.
    const requiredInternal = new Set<string>();
    const requiredExternal = new Set<string>();

    for (const opCodeNum of this.eventsToVerify) {
      // Retrieve the full event definition (which has .assetTypes).
      const def = getEventDefinitionByOpCode(opCodeNum);
      if (!def) {
        continue; // not in config
      }

      // Among def.assetTypes, find the one that matches this.telegramAsset!.type (e.g. 'channel' or 'supergroup')
      const assetPrivileges = def.assetTypes.find((a) => a.type === this.telegramAsset!.type);
      if (!assetPrivileges) {
        // If we don't have a matching asset type definition, skip
        continue;
      }

      // Add required INTERNAL privileges to our Set
      for (const priv of assetPrivileges.internalRequiredAdminPrivileges) {
        requiredInternal.add(priv);
      }

      // Add required EXTERNAL privileges to our Set
      for (const priv of assetPrivileges.externalRequiredAdminPrivileges) {
        requiredExternal.add(priv);
      }
    }

    // Return an object with both arrays
    return {
      internal: [...requiredInternal],
      external: [...requiredExternal],
    }
  };
}
