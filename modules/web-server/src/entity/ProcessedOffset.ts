import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('processed_offset')
export class ProcessedOffset {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'last_lt', default: '0', length: 50 })
  lastLt: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
