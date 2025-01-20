import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('campaigns')
export class Campaign {
  
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'id' })
  id: string;

  @Column({ length: 255, nullable: true, name: 'name' })
  campaignName: string;

  @Column({ length: 255, nullable: true, name: 'asset_type' })
  assetType: string;

  @Column({ length: 255, nullable: true, name: 'asset_name' })
  assetName: string;

  @Column({ length: 255, nullable: true, name: 'asset_category' })
  assetCategory: string;

  @Column({ type: 'text', nullable: true, name: 'asset_description' })
  assetDescription: string;

  // telegram link to channel/group/mini-app
  @Column({ length: 500, nullable: true, name: 'invite_link' })
  inviteLink: string;

  @Column({ type: 'bytea', nullable: true, name: 'asset_photo' })
  assetPhoto: Buffer | null;

  @Column({ type: 'boolean', name: 'is_empty', default: true })
  isEmpty: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
