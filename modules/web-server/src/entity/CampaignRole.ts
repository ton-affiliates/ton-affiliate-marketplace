import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './Wallet';
import { Campaign } from './Campaign';

export enum RoleType {
  ADVERTISER = 'advertiser',
  AFFILIATE = 'affiliate',
}

@Entity('campaign_roles')
export class CampaignRole {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  // The campaign is still identified by a string ID (campaign_id):
  @Column({ type: 'varchar', length: 255, name: 'campaign_id' })
  campaignId: string;

  @Column({ type: 'varchar', length: 255, name: 'wallet_id' })
  walletAddress: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    name: 'role',
  })
  role: RoleType;

  @Column({ type: 'int', nullable: true, name: 'affiliate_id' })
  affiliateId: number;

  @Column({ type: 'boolean', name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * ManyToOne to the Campaign by "campaign_id"
   * The local column is "campaign_id"; the remote PK is "campaigns.id".
   */
  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaign_id', referencedColumnName: 'id' })
  campaign: Campaign;

  /**
   * ManyToOne to the Wallet by "walletAddress"
   * The local column is "wallet_id"; the remote PK is "wallets.address".
   */
  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id', referencedColumnName: 'address' })
  wallet: Wallet;
}
