import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { Wallet } from './entity/Wallet';
import { Campaign } from './entity/Campaign';
import { CampaignRole } from './entity/CampaignRole';
import { ProcessedOffset } from './entity/ProcessedOffset';
import { EventEntity } from './entity/EventEntity';
import { Notification } from './entity/Notification';
import { UserEvent } from './entity/UserEvent';
import { TelegramAsset } from './entity/TelegramAsset';

//psql -h db -U my_user -d my_database
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'my_user',
  password: process.env.POSTGRES_PASSWORD || 'my_password',
  database: process.env.POSTGRES_DB || 'my_database',
  entities: [User, Wallet, Campaign, CampaignRole, ProcessedOffset, EventEntity, Notification, UserEvent, TelegramAsset],
  /**
   * Let TypeORM discover compiled migration files
   * in the s/ directory.
   */
  migrations: ["dist/migrations/*.js"],
  synchronize: false,
  logging: false
});
