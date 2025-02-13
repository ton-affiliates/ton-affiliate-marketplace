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
import { getTelegramEventByOpCode } from '@common/TelegramEventsConfig';
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
        `[Campaign ${this.id}] Found event definition for opCode ${opCodeNum}: ${JSON.stringify(
          def
        )}`
      );

      // Retrieve privileges based on the telegram asset type directly from the event definition.
      const assetType = this.telegramAsset.type;
      if (!assetType) {
        Logger.warn(`[Campaign ${this.id}] telegramAsset type is missing.`);
        continue; // or throw an error, depending on your logic
      }

      const internalPrivs = def.internalRequiredAdminPrivileges[assetType];
      const externalPrivs = def.externalRequiredAdminPrivileges[assetType];

      if (!internalPrivs && !externalPrivs) {
        Logger.warn(
          `[Campaign ${this.id}] Could not find privileges for assetType "${assetType}" in event definition for opCode ${opCodeNum}. Skipping.`
        );
        continue;
      }

      if (internalPrivs) {
        for (const priv of internalPrivs) {
          requiredInternal.add(priv);
        }
      }

      if (externalPrivs) {
        for (const priv of externalPrivs) {
          requiredExternal.add(priv);
        }
      }
    }

    Logger.debug(
      `[Campaign ${this.id}] Final required internal: ${JSON.stringify([...requiredInternal])}, ` +
      `external: ${JSON.stringify([...requiredExternal])}`
    );

    // for all campaigns we need to redirect users
    requiredInternal.add("can_invite_users")
    requiredExternal.add("Add members")

    return {
      internal: [...requiredInternal],
      external: [...requiredExternal],
    };
  }
}
