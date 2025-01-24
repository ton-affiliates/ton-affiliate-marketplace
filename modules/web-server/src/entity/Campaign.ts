import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Define the enum for campaign states
export enum CampaignState {
  DEPLOYED = 'DEPLOYED',
  TELEGRAM_DETAILS_SET = 'TELEGRAM_DETAILS_SET',
  BLOCKCHAIN_DETAILS_SET = 'BLOCKCHAIN_DETAILS_SET',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'id' })
  id: string;

  @Column({ length: 255, nullable: true, name: 'name' })
  campaignName: string;

  @Column({ length: 255, nullable: true, name: 'asset_type' })
  assetType: string;

  @Column({ length: 255, nullable: true, name: 'asset_name' })
  assetName: string;

  @Column({ length: 255, nullable: true, name: 'asset_category' })
  assetCategory: string;

  @Column({ type: 'text', nullable: true, name: 'asset_description' })
  assetDescription: string;

  // Telegram link to channel/group/mini-app
  @Column({ length: 500, nullable: true, name: 'invite_link' })
  inviteLink: string;

  @Column({ type: 'bytea', nullable: true, name: 'asset_photo' })
  assetPhoto: Buffer | null;

  // State column to manage campaign states
  @Column({
    type: 'enum',
    enum: CampaignState,
    default: CampaignState.DEPLOYED,
    name: 'state',
  })
  state: CampaignState;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
