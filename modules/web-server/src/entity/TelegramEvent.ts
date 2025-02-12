// src/entity/TelegramEvent.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TelegramEventType } from "@common/Enums"

@Entity({ name: 'telegram_events' })
export class TelegramEvent {
  
  @PrimaryGeneratedColumn()
  id!: number;

  // Store the event type as an integer based on the TelegramEventType enum.
  @Column({ type: 'int', name: 'op_code' })
  opCode!: TelegramEventType;

  @Column({ type: 'bigint', name: 'user_telegram_id' })
  userTelegramId!: number;

  @Column({ type: 'boolean', name: 'is_premium' })
  isPremium!: boolean;

  @Column({ type: 'boolean', name: 'is_processed', default: false })
  isProcessed!: boolean;

  @Column({ type: 'varchar', length: 255, name: 'chat_id' })
  chatId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
