// src/entity/TelegramAsset.ts

import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
  import { Campaign } from './Campaign';
  
  @Entity('telegram_assets')
  export class TelegramAsset {
    // This is the Telegram chat ID (as a string). For channels this may be a negative number.
    @PrimaryColumn({ type: 'varchar', length: 255, name: 'chat_id' })
    chatId: string;
  
    // The public username or handle of the asset (e.g. "MyChannel")
    @Column({ type: 'varchar', length: 255, name: 'handle', nullable: true })
    handle: string | null;
  
    // The canonical invite link (e.g. "https://t.me/MyChannel")
    @Column({ type: 'varchar', length: 500, name: 'invite_link', nullable: true })
    inviteLink: string | null;
  
    // The asset's display name (for example, the channel title)
    @Column({ type: 'varchar', length: 255, name: 'name', nullable: true })
    name: string | null;
    
    // The asset's description (if provided)
    @Column({ type: 'text', name: 'description', nullable: true })
    description: string | null;
  
    // The type of the asset (e.g., CHANNEL, GROUP, etc.)
    @Column({ type: 'varchar', length: 255, name: 'type', nullable: true })
    type: string | null;
  
    // The raw photo data for the asset (if downloaded)
    @Column({ type: 'bytea', name: 'photo', nullable: true })
    photo: Buffer | null;
  
    // Whether the bot is an administrator in this asset
    @Column({ type: 'boolean', name: 'bot_is_admin', default: false })
    botIsAdmin: boolean;
  
    // The list of privileges the bot has in this asset
    @Column({ type: 'text', array: true, name: 'admin_privileges', default: [] })
    adminPrivileges: string[];
  
    // The current member count of the asset (e.g., subscriber count)
    @Column({ type: 'int', name: 'member_count', default: 0 })
    memberCount: number;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    // One Telegram asset can be associated with many campaigns.
    @OneToMany(() => Campaign, (campaign) => campaign.telegramAsset)
    campaigns: Campaign[];
  
  }
  