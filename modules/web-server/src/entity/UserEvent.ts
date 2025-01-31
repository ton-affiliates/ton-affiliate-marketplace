import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';

import {UserEventType} from "@common/models";

  @Entity({ name: 'user_events' })
  export class UserEvent {
    @PrimaryGeneratedColumn()
    id!: number;
  
    @Column({ type: 'bigint' })
    userId!: number;
  
    @Column({ type: 'boolean' })
    isPremium!: boolean;
  
    @Column({
      type: 'enum',          // <-- IMPORTANT: 'enum' for TypeORM
      enum: UserEventType,   // <-- Provide the enum
    })
    eventType!: UserEventType;  // <-- TypeScript uses our enum
  
    @Column({ default: false })
    isProcessed!: boolean;
  
    @Column({ type: 'varchar', length: 255 })
    campaignId!: string;
  
    @Column({ type: 'varchar', length: 255 })
    affiliateId!: string;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }
  