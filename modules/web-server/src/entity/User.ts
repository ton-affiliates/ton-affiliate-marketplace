import {
    Entity,
    PrimaryColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { Wallet } from './Wallet';
  
  @Entity()
  export class User {
    /**
     * The Telegram user ID, which is unique and used as our primary key.
     * If Telegram IDs can be negative, still store them in BIGINT (TypeORM uses 'number' in TS).
     */
    @PrimaryColumn({ type: 'bigint' })
    id: number;
  
    @Column({ nullable: true })
    telegramUsername: string;
  
    @Column({ nullable: true, length: 10 })
    telegramLanguage: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    /**
     * One user can have multiple wallets.
     * The Wallet entity has a ManyToOne(User) reference.
     */
    @OneToMany(() => Wallet, (wallet) => wallet.user)
    wallets: Wallet[];
  }
  