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

  /**
   * Instead of 'wallet_id' as a BIGINT, we store the wallet's address (string) to match 
   * the primary column in 'wallets'
   */
  @Column({ type: 'varchar', length: 255, name: 'wallet_address' })
  walletAddress: string;

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

  /**
   * Because 'wallets'.address is the PK, 
   * we set the JoinColumn to map 'walletAddress' => 'address'
   */
  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_address', referencedColumnName: 'address' })
  wallet: Wallet;
}
