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

  @Column({ type: 'varchar', length: 255, name: 'campaign_id' })
  campaignId: string;

  @Column({ type: 'bigint', name: 'wallet_id' })
  walletId: number;

  @Column({ length: 50, name: 'role' })
  role: string;

  @Column({ type: 'int', nullable: true, name: 'affiliate_id' })
  affiliateId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
}
