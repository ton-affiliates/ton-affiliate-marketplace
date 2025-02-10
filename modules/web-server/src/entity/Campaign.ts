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
import { getEventDefinitionByOpCode } from '@common/UserEventsConfig';
import { Logger } from '../utils/Logger';

export interface RequiredPrivileges {
  internal: string[];
  external: string[];
}

/**
 * Allowed campaign states.
 */
export enum CampaignState {
  DEPLOYED_ON_CHAIN = 'DEPLOYED_ON_CHAIN',
  TELEGRAM_DETAILS_SET = 'TELEGRAM_DETAILS_SET',
  BLOCKCHIAN_DETIALS_SET = 'BLOCKCHIAN_DETIALS_SET'
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

  /**
   * The state of the campaign.
   * - Initially: DEPLOYED_ON_CHAIN
   * - Then moves to TELEGRAM_DETAILS_SET when the advertiser sets Telegram details
   * - Finally moves to BLOCKCHIAN_DETIALS_SET when blockchain details are set.
   * 
   * Once in the final state (BLOCKCHIAN_DETIALS_SET) no further changes are allowed.
   */
  @Column({
    type: 'enum',
    enum: CampaignState,
    default: CampaignState.DEPLOYED_ON_CHAIN,
  })
  state: CampaignState;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Checks if the bot can verify events:
   *   - There must be an associated TelegramAsset.
   *   - The bot must be admin (botIsAdmin === true).
   *   - The asset must have all required privileges for *all* events in eventsToVerify.
   */
  canBotVerifyEvents(): boolean {
    if (!this.telegramAsset || !this.telegramAsset.botIsAdmin) {
      return false;
    }

    const requiredPrivs = this.getRequiredAdminPrivilegesToVerifyEvents();

    // Ensure all required internal privileges are present.
    for (const needed of requiredPrivs.internal) {
      if (!this.telegramAsset.adminPrivileges.includes(needed)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the required privileges for verifying events based on eventsToVerify.
   * It looks up the event definitions from the config and gathers the privileges
   * for the asset type associated with this campaign.
   */
  public getRequiredAdminPrivilegesToVerifyEvents(): RequiredPrivileges {
    if (!this.telegramAsset) {
      throw new Error('No assetType associated with campaign: ' + this.id);
    }

    const requiredInternal = new Set<string>();
    const requiredExternal = new Set<string>();

    Logger.debug(`[Campaign ${this.id}] getRequiredAdminPrivilegesToVerifyEvents: 
      eventsToVerify = ${JSON.stringify(this.eventsToVerify)}, 
      assetType = ${this.telegramAsset.type}`);

    for (const opCodeStr of this.eventsToVerify) {
      // Convert value to number
      const opCodeNum = parseInt(opCodeStr.toString(), 10);
      Logger.debug(`Checking opCodeNum: ${opCodeNum}`);

      // Retrieve the full event definition.
      const def = getEventDefinitionByOpCode(opCodeNum);
      if (!def) {
        Logger.warn(
          `[Campaign ${this.id}] No event definition found for opCode ${opCodeNum}. Skipping.`
        );
        continue;
      }

      Logger.debug(
        `[Campaign ${this.id}] Found event definition for opCode ${opCodeNum}: ${JSON.stringify(def)}`
      );

      // Find privileges for the matching asset type.
      const assetPrivileges = def.assetTypes.find(
        (a) => a.type === this.telegramAsset!.type
      );

      if (!assetPrivileges) {
        Logger.warn(
          `[Campaign ${this.id}] Could not find matching assetType for opCode ${opCodeNum}. 
          Looking for assetType = "${this.telegramAsset!.type}", 
          but def.assetTypes = ${JSON.stringify(def.assetTypes)}.
          Skipping.`
        );
        continue;
      }

      Logger.debug(
        `[Campaign ${this.id}] Found matching assetPrivileges for opCode ${opCodeNum}: ${JSON.stringify(assetPrivileges)}`
      );

      for (const priv of assetPrivileges.internalRequiredAdminPrivileges) {
        requiredInternal.add(priv);
      }

      for (const priv of assetPrivileges.externalRequiredAdminPrivileges) {
        requiredExternal.add(priv);
      }
    }

    // for ALL asset types we need to redirect
    requiredInternal.add("can_invite_users");
    requiredExternal.add("Add members");

    Logger.debug(
      `[Campaign ${this.id}] Final required internal: ${JSON.stringify([...requiredInternal])}, ` +
      `external: ${JSON.stringify([...requiredExternal])}`
    );

    return {
      internal: [...requiredInternal],
      external: [...requiredExternal],
    };
  }
}
