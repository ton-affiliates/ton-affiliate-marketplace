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

@Entity('campaign_roles')
export class CampaignRole {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  // The campaign is still identified by a string ID (campaign_id):
  @Column({ type: 'varchar', length: 255, name: 'campaign_id' })
  campaignId: string;

  /**
   * Now referencing the wallet by its string 'address' (PK).
   * So the column is type 'varchar(255)' to match `wallets(address)`.
   */
  @Column({ type: 'varchar', length: 255, name: 'wallet_id' })
  walletAddress: string;

  @Column({ length: 50, name: 'role' })
  role: string;

  @Column({ type: 'int', nullable: true, name: 'affiliate_id' })
  affiliateId: number;

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
