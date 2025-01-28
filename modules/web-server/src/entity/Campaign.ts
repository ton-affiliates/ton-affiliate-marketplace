import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './Wallet'; // <-- Make sure this path is correct


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

  /**
   * The raw contract address string stored in the DB
   */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'campaign_contract_address',
    nullable: true, // or false, depending on whether it's optional
  })
  campaignContractAddress: string;

  @ManyToOne(() => Wallet, { eager: false })
  @JoinColumn({ name: 'campaign_contract_address', referencedColumnName: 'address' })
  campaignContractWallet: Wallet;

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

  @Column({ length: 500, nullable: true, name: 'invite_link' })
  inviteLink: string;

  @Column({ type: 'bytea', nullable: true, name: 'asset_photo' })
  assetPhoto: Buffer | null;

  @Column({
    type: 'enum',
    enum: CampaignState,
    default: CampaignState.DEPLOYED,
    name: 'state',
  })
  state: CampaignState;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // If you need updated_at:
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
