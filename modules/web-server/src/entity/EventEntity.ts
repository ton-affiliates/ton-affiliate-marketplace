import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('events')
export class EventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: any;

  // Explicitly define the column type for 'created_lt'.
  @Column({
    name: 'created_lt',
    type: 'varchar',  // or 'character varying'
    length: 50,       // optional length
    nullable: true
  })
  createdLt: string | null;  // or just string if you prefer

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
