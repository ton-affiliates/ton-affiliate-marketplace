import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './User';

@Entity('wallets')
export class Wallet {
  /**
   * Each wallet is keyed by its address string
   */
  @PrimaryColumn({ length: 255, name: 'address' })
  address: string;

  @Column({ length: 50, nullable: true, name: 'wallet_type' })
  walletType: string;

  @Column({ length: 255, nullable: true, name: 'public_key' })
  publicKey?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Many-to-many with User; 'user_wallets' is the join table.
   */
  @ManyToMany(() => User, (user) => user.wallets)
  users: User[];
}
