import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './Wallet';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column({ name: 'telegram_username', nullable: true })
  telegramUsername: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl: string;

  @Column({ name: 'telegram_language', nullable: true, length: 10 })
  telegramLanguage: string;

  @Column({ name: 'auth_date', nullable: true })
  authDate: Date;

  @Column({ name: 'can_message', type: 'boolean', default: false })
  canMessage: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Many-to-many with Wallet. The "user_wallets" table is our join table.
   */
  @ManyToMany(() => Wallet, (wallet) => wallet.users)
  @JoinTable({
    name: 'user_wallets', // the join table name
    joinColumns: [{ name: 'user_id' }],
    inverseJoinColumns: [{ name: 'wallet_address' }],
  })
  wallets: Wallet[];
}
