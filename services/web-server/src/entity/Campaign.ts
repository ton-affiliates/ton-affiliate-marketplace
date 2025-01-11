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
  
  @Entity()
  export class Campaign {
    /**
     * A unique string from the blockchain, so we can use @PrimaryColumn (rather than auto-generated).
     * e.g. contract address or on-chain ID.
     */
    @PrimaryColumn({ type: 'varchar', length: 255 })
    id: string;
  
    @Column({ type: 'bigint' })
    walletId: number; // references wallets(id)
  
    @Column({ length: 50, nullable: true })
    assetType: string; // e.g. "CHANNEL"
  
    @Column({ length: 255, nullable: true })
    assetName: string; // e.g. public channel username
  
    @Column({ length: 255, nullable: true })
    assetTitle: string; // e.g. channel's display title
  
    @Column({ type: 'text', nullable: true })
    assetDescription: string;
  
    @Column({ length: 500, nullable: true })
    inviteLink: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    /**
     * The wallet that "owns" or created this campaign.
     */
    @ManyToOne(() => Wallet)
    @JoinColumn({ name: 'walletId' })
    wallet: Wallet;
  }
  