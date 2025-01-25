import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { Wallet } from './entity/Wallet';
import { Campaign } from './entity/Campaign';
import { CampaignRole } from './entity/CampaignRole';
import { ProcessedOffset } from './entity/ProcessedOffset';
import { EventEntity } from './entity/EventEntity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '/cloudsql/affiliate-center-447418:us-central1:affiliate-marketplace-db',
  port: Number(process.env.DB_PORT) || 5432, // Port 5432 is the default for PostgreSQL
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '6AAInxH\Irjq|7|v',
  database: process.env.POSTGRES_DB || 'postgres',
  entities: [User, Wallet, Campaign, CampaignRole, ProcessedOffset, EventEntity],
  migrations: ["dist/migrations/*.js"],
  synchronize: false,
  logging: false,
});
