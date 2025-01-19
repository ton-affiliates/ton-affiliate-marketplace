import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { User } from './User';
  import { Campaign } from './Campaign';
  
  @Entity('notifications')
  export class Notification {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ type: 'bigint', name: 'user_id' })
    userId: number;
  
    @Column({ type: 'text', nullable: false })
    message: string;
  
    // 1) New campaignId column
    @Column({ type: 'varchar', length: 255, name: 'campaign_id', nullable: true })
    campaignId: string | null;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
    readAt: Date | null;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
    user: User;
  
    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id', referencedColumnName: 'id' })
    campaign: Campaign;
  }
  