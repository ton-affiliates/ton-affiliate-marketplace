import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './Wallet';

@Entity('user')
export class User {
  @PrimaryColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column({ name: 'telegram_username', nullable: true })
  telegramUsername: string;

  @Column({ name: 'telegram_language', nullable: true, length: 10 })
  telegramLanguage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[];
}
