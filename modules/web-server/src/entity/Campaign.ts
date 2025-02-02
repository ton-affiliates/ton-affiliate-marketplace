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
import { UserEventType } from '@common/models';
import { TelegramAsset } from './TelegramAsset';

export enum CampaignState {
  DEPLOYED = 'DEPLOYED',
  TELEGRAM_DETAILS_SET = 'TELEGRAM_DETAILS_SET',
  BLOCKCHAIN_DETAILS_SET = 'BLOCKCHAIN_DETAILS_SET',
}

@Entity('campaigns')
export class Campaign {
  // The campaign ID coming from the blockchain.
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'id' })
  id: string;

  // Foreign key: the Telegram asset associated with this campaign.
  // (This could be nullable if not set yet.)
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

  // The category of the telegram asset 
  @Column({ type: 'varchar', length: 255, name: 'category', nullable: true })
  category: string | null;

  // This field stores which events (from the blockchain) need verifying.
  @Column({
    type: 'enum',
    enum: UserEventType,
    array: true,
    name: 'verified_events',
    default: [],
  })
  eventsToVerify: UserEventType[];

  @Column({
    type: 'varchar',
    length: 50,
    name: 'state',
    default: CampaignState.DEPLOYED,
  })
  state: CampaignState;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Determines if the bot is able to verify events for this campaign.
   *
   * Logic:
   *   - If there is no associated Telegram asset or the bot is not admin, return false.
   *   - The bot must have 'can_invite_users' privilege.
   *   - If the campaign's eventsToVerify include any retained events (JOINED,
   *     RETAINED_TWO_WEEKS, or RETAINED_ONE_MONTH), then the bot must have either
   *     'can_manage_chat' or 'can_restrict_members'.
   *
   * @returns True if the bot can verify events; false otherwise.
   */
  canBotVerifyEvents(): boolean {
    if (!this.telegramAsset) {
      return false;
    }
    // Check if the bot is admin in the associated Telegram asset.
    if (!this.telegramAsset.botIsAdmin) {
      return false;
    }
    // The bot must always have 'can_invite_users'
    if (!this.telegramAsset.adminPrivileges.includes('can_invite_users')) {
      return false;
    }
    // Determine if any retained events need to be verified.
    const needsRetained =
      this.eventsToVerify.includes(UserEventType.JOINED) ||
      this.eventsToVerify.includes(UserEventType.RETAINED_TWO_WEEKS) ||
      this.eventsToVerify.includes(UserEventType.RETAINED_ONE_MONTH);
    if (needsRetained) {
      // For retained events, check if at least one of the required privileges is present.
      if (
        !this.telegramAsset.adminPrivileges.includes('can_manage_chat') &&
        !this.telegramAsset.adminPrivileges.includes('can_restrict_members')
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Computes and returns the list of privileges required to verify the campaign's events.
   *
   * Logic:
   *   - For any event verification, 'can_invite_users' is required.
   *   - If any retained events (JOINED, RETAINED_TWO_WEEKS, RETAINED_ONE_MONTH) are present,
   *     then 'can_manage_chat or can_restrict_members' is also required.
   *
   * @returns An array of required privilege strings.
   */
  getRequiredPrivileges(): string[] {
    const required: string[] = [];
    // Always required.
    required.push('can_invite_users');
    const needsRetained =
      this.eventsToVerify.includes(UserEventType.JOINED) ||
      this.eventsToVerify.includes(UserEventType.RETAINED_TWO_WEEKS) ||
      this.eventsToVerify.includes(UserEventType.RETAINED_ONE_MONTH);
    if (needsRetained) {
      required.push('can_manage_chat or can_restrict_members');
    }
    return required;
  }
}
