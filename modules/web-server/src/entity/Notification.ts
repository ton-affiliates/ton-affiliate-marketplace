// entity/Notification.ts (full class)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './Wallet';
import { Campaign } from './Campaign';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'wallet_address' })
  walletAddress: string;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ type: 'varchar', length: 255, name: 'campaign_id', nullable: true })
  campaignId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt: Date | null;

  @Column({ type: 'varchar', length: 500, name: 'link', nullable: true })
  link: string | null;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_address', referencedColumnName: 'address' })
  wallet: Wallet;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaign_id', referencedColumnName: 'id' })
  campaign: Campaign;
}
