import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { Wallet } from './Wallet';
  import { Campaign } from './Campaign';
  
  @Entity()
  export class CampaignRole {
    @PrimaryGeneratedColumn()
    id: number; // local PK
  
    @Column({ type: 'varchar', length: 255 })
    campaignId: string; // references Campaign.id
  
    @Column({ type: 'bigint' })
    walletId: number; // references wallets.id
  
    @Column({ length: 50 })
    role: string; // e.g. 'ADVERTISER' or 'AFFILIATE'
  
    /**
     * affiliateId from the blockchain or another system,
     * used only if role = 'AFFILIATE'.
     */
    @Column({ type: 'int', nullable: true })
    affiliateId: number;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    // Many roles can reference the same campaign
    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaignId' })
    campaign: Campaign;
  
    // Many roles can reference the same wallet
    @ManyToOne(() => Wallet)
    @JoinColumn({ name: 'walletId' })
    wallet: Wallet;
  }
  