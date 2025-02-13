// src/entity/Referral.ts

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Campaign } from './Campaign';
  
  @Entity('referrals')
  export class Referral {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ name: 'user_telegram_id', type: 'bigint' })
    userTelegramId: number;
  
    @Column({ type: 'varchar', length: 255, name: 'campaign_id' })
    campaignId: string;
  
    @Column({ type: 'int', name: 'affiliate_id' })
    affiliateId: number;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    /**
     * Optional: a relationship to the Campaign entity.
     * Allows you to do `referral.campaign.name`, etc.
     */
    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id', referencedColumnName: 'id' })
    campaign: Campaign;
  }
  