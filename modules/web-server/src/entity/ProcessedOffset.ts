import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    Unique,
  } from 'typeorm';
  
  /**
   * Stores the "last processed LT" 
   */
  @Entity({ name: 'processed_offsets' })
  export class ProcessedOffset {
    
    @PrimaryGeneratedColumn()
    id: number;
  
    /**
     * We store last_lt as a string in the DB.
     * In code, you can parse it to BigInt as needed.
     */
    @Column({ name: 'last_lt', default: '0', length: 50 })
    lastLt: string;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }
  