import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TelegramAssetType, UserEventType } from '@common/models';

export enum CampaignState {
  DEPLOYED = 'DEPLOYED',
  TELEGRAM_DETAILS_SET = 'TELEGRAM_DETAILS_SET',
  BLOCKCHAIN_DETAILS_SET = 'BLOCKCHAIN_DETAILS_SET',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'id' })
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'handle', nullable: true })
  handle: string | null;

  @Column({ type: 'varchar', length: 255, name: 'campaign_contract_address' })
  campaignContractAddress: string;

  @Column({ type: 'varchar', length: 255, name: 'name', nullable: true })
  campaignName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'asset_type', nullable: true })
  assetType: string | null;

  @Column({ type: 'varchar', length: 255, name: 'asset_name', nullable: true })
  assetName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'asset_category', nullable: true })
  assetCategory: string | null;

  @Column({ type: 'text', nullable: true, name: 'asset_description' })
  assetDescription: string | null;

  @Column({ type: 'varchar', length: 500, name: 'invite_link', nullable: true })
  inviteLink: string | null;

  @Column({ type: 'bytea', nullable: true, name: 'asset_photo' })
  assetPhoto: Buffer | null;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'state',
    default: CampaignState.DEPLOYED,
  })
  state: CampaignState;

  @Column({ type: 'boolean', name: 'bot_is_admin', default: false })
  botIsAdmin: boolean;

  @Column({ type: 'text', array: true, name: 'admin_privileges', default: [] })
  adminPrivileges: string[];

  @Column({ type: 'int', name: 'member_count', default: 0 })
  memberCount: number;

  @Column({
    type: 'enum',
    enum: UserEventType,
    array: true,
    name: 'verified_events',
    default: [],
  })
  eventsToVerify: UserEventType[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Helper: interpret the DB's assetType string as an enum.
   */
  private stringToTelegramAssetType(value: string | null): TelegramAssetType | null {
    if (!value) return null;
    switch (value.toUpperCase()) {
      case 'CHANNEL':
        return TelegramAssetType.CHANNEL;
      // Add other cases if needed
      default:
        return null;
    }
  }

  /**
   * Returns an array of privileges that are required to verify
   * the events in `eventsToVerify`.
   *
   * Customize this logic as needed.
   */
  getRequiredPrivileges(): string[] {
    const needed = new Set<string>();

    needed.add('can_invite_users');  // for all events we need this

    // If verifying RETAINED events, we might need membership-check privileges
    const wantsRetained =
      this.eventsToVerify.includes(UserEventType.JOINED) ||
      this.eventsToVerify.includes(UserEventType.RETAINED_TWO_WEEKS) ||
      this.eventsToVerify.includes(UserEventType.RETAINED_ONE_MONTH);

    if (wantsRetained) {
      // For example, assume we need 'can_manage_chat' or 'can_restrict_members'
      // to track membership over time
      if (!this.adminPrivileges.includes('can_manage_chat') &&
          !this.adminPrivileges.includes('can_restrict_members')) {
        needed.add('can_manage_chat or can_restrict_members');
      }
    }

    return Array.from(needed);
  }

  /**
   * Checks if the bot is able to verify the campaign's chosen events,
   * i.e. if it is an admin, the campaign is a channel, and the bot
   * has all required privileges.
   */
  canBotVerifyEvents(): boolean {
    // 1) Must be admin
    if (!this.botIsAdmin) {
      return false;
    }

    // 2) Must be a channel to do membership-based checks (or adjust as needed)
    const assetEnum = this.stringToTelegramAssetType(this.assetType);
    if (assetEnum !== TelegramAssetType.CHANNEL) {
      return false;
    }

    // 3) Check if we have all required privileges
    const requiredPrivs = this.getRequiredPrivileges();

    // If your logic is "all privileges must be included" in the adminPrivileges,
    // do an 'every' check. 
    return requiredPrivs.every((p) => this.adminPrivileges.includes(p));
  }
}
