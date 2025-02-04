import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_events' })
export class UserEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', name: 'user_telegram_id' })
  userTelegramId!: number;

  @Column({ type: 'boolean', name: 'is_premium' })
  isPremium!: boolean;

  @Column({ type: 'bigint', name: 'event_op_code' })
  eventOpCode!: number;

  @Column({ type: 'varchar', length: 255, name: 'event_name' })
  eventName!: string;

  @Column({ type: 'boolean', name: 'is_processed', default: false })
  isProcessed!: boolean;

  @Column({ type: 'varchar', length: 255, name: 'campaign_id' })
  campaignId!: string;

  @Column({ type: 'varchar', length: 255, name: 'affiliate_id' })
  affiliateId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
