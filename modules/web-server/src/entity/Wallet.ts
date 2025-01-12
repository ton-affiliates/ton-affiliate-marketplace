import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { User } from './User';
  
  @Entity()
  export class Wallet {
    @PrimaryGeneratedColumn()
    id: number;  // Internal PK for reference
  
    @Column({ type: 'bigint' })
    userId: number;  // Foreign key referencing "users(id)"
  
    @Column({ length: 255 })
    address: string;  // TON wallet address
  
    @Column({ length: 50, nullable: true })
    walletType: string;  // e.g. "tonwallet", "tonkeeper"
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    /**
     * Link back to the User. We store userId in the DB,
     * but we also define a relation for convenience.
     */
    @ManyToOne(() => User, (user) => user.wallets)
    @JoinColumn({ name: 'userId' }) 
    user: User;
  }
  