import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './User';

@Entity('wallets')
export class Wallet {
  /** Make address the PRIMARY KEY */
  @PrimaryColumn({ length: 255, name: 'address' })
  address: string;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({ length: 50, nullable: true, name: 'wallet_type' })
  walletType: string;

  @Column({ length: 255, nullable: true, name: 'public_key' })
  publicKey?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.wallets)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
