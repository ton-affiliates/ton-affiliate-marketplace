import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './Wallet';

@Entity('campaigns')
export class Campaign {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'id' })
  id: string;

  @Column({ type: 'bigint', name: 'wallet_id' })
  walletId: number;

  @Column({ length: 255, nullable: true, name: 'asset_type' })
  assetType: string;

  @Column({ length: 255, nullable: true, name: 'asset_name' })
  assetName: string;

  @Column({ length: 255, nullable: true, name: 'asset_category' })
  assetCategory: string;

  @Column({ length: 255, nullable: true, name: 'asset_title' })
  assetTitle: string;

  @Column({ type: 'text', nullable: true, name: 'asset_description' })
  assetDescription: string;

  @Column({ length: 500, nullable: true, name: 'invite_link' })
  inviteLink: string;

  @Column({ type: 'bytea', nullable: true, name: 'asset_photo' })
  assetPhoto: Buffer | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
}
