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
import { getTelegramEventByOpCode, doesEventRequireAdmin, doesEventRequireBotToBeMember } from '@common/TelegramEventsConfig';
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
  BLOCKCHIAN_DETIALS_SET = 'BLOCKCHIAN_DETIALS_SET',
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
   * We store an array of numeric op codes (e.g., [0, 1, 2]) representing Telegram events.
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

  /**
   * Added boolean column to verify if user is human on referral.
   */
  @Column({ type: 'boolean', name: 'verify_user_is_human_on_referral', default: false })
  verifyUserIsHumanOnReferral: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;


/**
 * Checks if any event requires the bot to be a member.
 */
requiresToBeMember(): boolean {
  if (!this.telegramAsset) {
    throw new Error(`No Telegram asset associated with campaign: ${this.id}`);
  }

  // Force asset type to be either "channel" or "group"
  const assetType = this.telegramAsset.type === "channel" ? "channel" : "group";

  for (const opCode of this.eventsToVerify) {
    const opCodeNum = parseInt(opCode.toString(), 10);
    Logger.debug(`[Campaign ${this.id}] Checking if event ${opCodeNum} requires bot to be a member for assetType: ${assetType}`);

    if (doesEventRequireBotToBeMember(opCodeNum, assetType)) {
      return true;
    }
  }

  return false;
}


/**
 * Checks if any event requires admin privileges.
 */
requiresAdminPrivileges(): boolean {
  if (!this.telegramAsset) {
    throw new Error(`No Telegram asset associated with campaign: ${this.id}`);
  }

  // Force asset type to be "channel" or "group"
  const assetType = this.telegramAsset.type === "channel" ? "channel" : "group";

  for (const opCode of this.eventsToVerify) {
    const opCodeNum = parseInt(opCode.toString(), 10);
    Logger.debug(`[Campaign ${this.id}] Checking if event ${opCodeNum} requires admin privileges for assetType: ${assetType}`);

    if (doesEventRequireAdmin(opCodeNum, assetType)) {
      return true;
    }
  }

  return false;
}



/**
 * Determines if the bot can verify events.
 */
canBotVerifyEvents(): boolean {
  if (!this.telegramAsset) {
    return false;
  }

  // asset must be a public asset
  if (!this.telegramAsset.isPublic) {
    return false;
  }

  const requiresToBeMember = this.requiresToBeMember();
  const requiresAdmin = this.requiresAdminPrivileges();

  // If bot is required to be a member but has an invalid status
  if (requiresToBeMember && !['member', 'administrator', 'creator'].includes(this.telegramAsset.botStatus)) {
    Logger.warn(`Bot cannot verify events: required to be a member, but current status is '${this.telegramAsset.botStatus}'`);
    return false;
  }

  // If admin privileges are required, ensure the bot is an admin
  if (requiresAdmin) {
    if (!['administrator', 'creator'].includes(this.telegramAsset.botStatus)) {
      Logger.warn(`Bot cannot verify events: required to be an admin, but current status is '${this.telegramAsset.botStatus}'`);
      return false;
    }

    // Ensure the bot has sufficient admin privileges
    const requiredPrivs = this.getRequiredAdminPrivilegesToVerifyEvents();
    for (const needed of requiredPrivs.internal) {
      if (!this.telegramAsset.adminPrivileges.includes(needed)) {
        Logger.warn(`Bot lacks required privilege '${needed}' to verify events.`);
        return false;
      }
    }
  }

  return true;
}
  

  /**
   * Returns the required privileges for verifying events based on eventsToVerify.
   * It looks up the event definitions from the Telegram events config and gathers
   * the privileges for the asset type associated with this campaign.
   *
   * Now that we store Telegram event op codes, each event definition is expected
   * to contain privilege objects keyed by asset type. This method retrieves the
   * privileges by directly indexing into these objects using the asset type.
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

      for (const opCode of this.eventsToVerify) {
        // Convert value to number in case it isn't already.
        const opCodeNum = parseInt(opCode.toString(), 10);
        Logger.debug(`Checking opCodeNum: ${opCodeNum}`);

        // Retrieve the full event definition from the Telegram events config.
        const def = getTelegramEventByOpCode(opCodeNum);
        if (!def) {
          Logger.warn(
            `[Campaign ${this.id}] No event definition found for opCode ${opCodeNum}. Skipping.`
          );
          continue;
        }

        Logger.debug(
          `[Campaign ${this.id}] Found event definition for opCode ${opCodeNum}: ${JSON.stringify(def)}`
        );

        // Retrieve asset type from campaign
        if (!this.telegramAsset.type) {
          Logger.warn(`[Campaign ${this.id}] telegramAsset type is missing.`);
          continue;
        }

        // Get required privileges from the `requirements` section
        const assetType = this.telegramAsset.type === "channel" ? "channel" : "group";
        const assetRequirements = def.requirements[assetType];

        if (!assetRequirements) {
          Logger.warn(
            `[Campaign ${this.id}] Could not find requirements for assetType "${assetType}" in event definition for opCode ${opCodeNum}. Skipping.`
          );
          continue;
        }

        // Extract internal and external required privileges
        const { internalRequiredAdminPrivileges, externalRequiredAdminPrivileges } = assetRequirements;

        for (const priv of internalRequiredAdminPrivileges) {
          requiredInternal.add(priv);
        }

        for (const priv of externalRequiredAdminPrivileges) {
          requiredExternal.add(priv);
        }
      }

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
