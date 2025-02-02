
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1736681774554 implements MigrationInterface {
  // Disable wrapping this migration in a single transaction.
  public static transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Create ENUM type for user_event_type
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE user_event_type AS ENUM (
          'SOLVED_CAPTCHA',
          'JOINED',
          'RETAINED_TWO_WEEKS',
          'RETAINED_ONE_MONTH',
          'LEFT_CHAT'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END
      $$;
    `);

    // 2) Create users TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                BIGINT PRIMARY KEY,
        "telegram_username" VARCHAR(255),
        "first_name"        VARCHAR(255),
        "last_name"         VARCHAR(255),
        "photo_url"         VARCHAR(255),
        "telegram_language" VARCHAR(10),
        "auth_date"         TIMESTAMP,
        "can_message"       BOOLEAN NOT NULL DEFAULT false,
        "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 3) Create wallets TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallets" (
        "address"      VARCHAR(255) PRIMARY KEY,
        "wallet_type"  VARCHAR(50),
        "public_key"   VARCHAR(255),
        "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 4) Create user_wallets TABLE (many-to-many)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_wallets" (
        "user_id"         BIGINT NOT NULL,
        "wallet_address"  VARCHAR(255) NOT NULL,
        "created_at"      TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_user_wallets" PRIMARY KEY ("user_id", "wallet_address"),
        CONSTRAINT "fk_user_wallets_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_user_wallets_wallet"
          FOREIGN KEY ("wallet_address")
          REFERENCES "wallets"("address")
          ON DELETE CASCADE
      );
    `);

    // 5) Create telegram_assets TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telegram_assets" (
        "chat_id"         VARCHAR(255) PRIMARY KEY,
        "handle"          VARCHAR(255) NULL,
        "invite_link"     VARCHAR(500) NULL,
        "name"            VARCHAR(255) NULL,
        "description"     TEXT NULL,
        "type"            VARCHAR(255) NULL,
        "photo"           BYTEA NULL,
        "bot_is_admin"    BOOLEAN NOT NULL DEFAULT false,
        "admin_privileges" TEXT[] NOT NULL DEFAULT '{}',
        "member_count"    INT NOT NULL DEFAULT 0,
        "created_at"      TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 6) Create campaigns TABLE (campaigns now reference telegram_assets)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"                         VARCHAR(255) PRIMARY KEY,
        "contract_address"           VARCHAR(255) NOT NULL,
        "name"                       VARCHAR(255) NULL,
        "category"                   VARCHAR(255) NULL,
        "verified_events"            user_event_type[] NOT NULL DEFAULT '{}',
        "state"                      VARCHAR(50) NOT NULL DEFAULT 'DEPLOYED',
        "telegram_asset_id"          VARCHAR(255) NULL,
        "created_at"                 TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"                 TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_telegram_asset"
          FOREIGN KEY ("telegram_asset_id")
          REFERENCES "telegram_assets"("chat_id")
      );
    `);

    // 7) Create ENUM type for role_type for campaign_roles TABLE
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE role_type AS ENUM ('advertiser', 'affiliate');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END
      $$;
    `);

    // 8) Create campaign_roles TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_roles" (
        "id"             SERIAL PRIMARY KEY,
        "campaign_id"    VARCHAR(255) NOT NULL,
        "wallet_address" VARCHAR(255) NOT NULL,
        "role"           role_type NOT NULL,
        "affiliate_id"   INT,
        "created_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_campaign"
          FOREIGN KEY ("campaign_id")
          REFERENCES "campaigns"("id"),
        CONSTRAINT "fk_wallet"
          FOREIGN KEY ("wallet_address")
          REFERENCES "wallets"("address")
      );
    `);

    // 9) Create processed_offsets TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_offsets" (
        "id"         SERIAL PRIMARY KEY,
        "last_lt"    VARCHAR(50) NOT NULL DEFAULT '0',
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 10) Create events TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "id" SERIAL PRIMARY KEY,
        "event_type" VARCHAR(255) NOT NULL,
        "payload" JSONB NOT NULL,
        "created_lt" VARCHAR(50),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse creation order
    await queryRunner.query(`DROP TABLE IF EXISTS "events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_offsets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_roles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_assets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);

    // Drop ENUM types last
    await queryRunner.query(`DROP TYPE IF EXISTS role_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_event_type;`);
  }
}
