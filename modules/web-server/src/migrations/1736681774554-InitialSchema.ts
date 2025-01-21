import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1736681774554 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) users TABLE
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

    // 2) wallets TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallets" (
        "address"      VARCHAR(255) PRIMARY KEY,
        "user_id"      BIGINT NOT NULL,
        "wallet_type"  VARCHAR(50),
        "public_key"   VARCHAR(255),
        "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_user_wallet"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
      );
    `);

    // 3) campaigns TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"                VARCHAR(255) PRIMARY KEY,
        "name"              VARCHAR(255),
        "asset_type"        VARCHAR(255),
        "asset_name"        VARCHAR(255),
        "asset_category"    VARCHAR(255),
        "asset_description" TEXT,
        "invite_link"       VARCHAR(500),
        "asset_photo"       BYTEA,
        "is_empty"          BOOLEAN NOT NULL DEFAULT true,
        "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 4) Create an ENUM type in Postgres for "role_type"
    await queryRunner.query(`
      DO $$
      BEGIN
          CREATE TYPE role_type AS ENUM ('advertiser', 'affiliate');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END
      $$;
    `);

    // 5) campaign_roles TABLE
    //    Notice we changed:
    //      - "role" to type "role_type"
    //      - "is_empty" to "is_active" per your entity
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_roles" (
        "id"             SERIAL PRIMARY KEY,
        "campaign_id"    VARCHAR(255) NOT NULL,
        "wallet_address" VARCHAR(255) NOT NULL,
        "role"           role_type NOT NULL,
        "affiliate_id"   INT,
        "is_active"      BOOLEAN NOT NULL DEFAULT false,
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

    // 6) processed_offsets TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_offsets" (
        "id"         SERIAL PRIMARY KEY,
        "last_lt"    VARCHAR(50) NOT NULL DEFAULT '0',
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 7) events TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "id" SERIAL PRIMARY KEY,
        "event_type" VARCHAR(255) NOT NULL,
        "payload" JSONB NOT NULL,
        "created_lt" VARCHAR(50),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 8) notifications TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id"             SERIAL PRIMARY KEY,
        "wallet_address" VARCHAR(255) NOT NULL,
        "message"        TEXT NOT NULL,
        "campaign_id"    VARCHAR(255),
        "created_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
        "read_at"        TIMESTAMP,
        CONSTRAINT "fk_wallet_notifications"
          FOREIGN KEY ("wallet_address")
          REFERENCES "wallets"("address"),
        CONSTRAINT "fk_campaign_notifications"
          FOREIGN KEY ("campaign_id")
          REFERENCES "campaigns"("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse creation in the opposite order
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_offsets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_roles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    // Optionally, drop the enum type if you want a fully clean rollback
    await queryRunner.query(`DROP TYPE IF EXISTS role_type;`);
  }
}
