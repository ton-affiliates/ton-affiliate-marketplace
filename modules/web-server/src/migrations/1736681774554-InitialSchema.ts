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
        "wallet_type"  VARCHAR(50),
        "public_key"   VARCHAR(255),
        "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 3) user_wallets (join table for the many-to-many)
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

    // 4) campaigns TABLE
    //    We add `campaign_contract_address` with a foreign key to `wallets(address)`.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"                         VARCHAR(255) PRIMARY KEY,
        "campaign_contract_address"  VARCHAR(255),
        "name"                       VARCHAR(255),
        "asset_type"                 VARCHAR(255),
        "asset_name"                 VARCHAR(255),
        "asset_category"             VARCHAR(255),
        "asset_description"          TEXT,
        "invite_link"                VARCHAR(500),
        "asset_photo"                BYTEA,
        "state"                      VARCHAR(50) NOT NULL DEFAULT 'DEPLOYED',
        "created_at"                 TIMESTAMP NOT NULL DEFAULT NOW(),
        -- If you want an updated_at column in DB:
        "updated_at"                 TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Trigger function to enforce immutability after final state
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_modification_after_final_state()
      RETURNS TRIGGER AS $$
      BEGIN
          IF OLD.state = 'BLOCKCHAIN_DETAILS_SET' THEN
              RAISE EXCEPTION 'Cannot modify a campaign after it has reached the final state: BLOCKCHAIN_DETAILS_SET';
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Attach trigger to the campaigns table
    await queryRunner.query(`
      CREATE TRIGGER prevent_final_state_modification
      BEFORE UPDATE ON "campaigns"
      FOR EACH ROW
      EXECUTE FUNCTION prevent_modification_after_final_state();
    `);

    // 5) role_type enum
    await queryRunner.query(`
      DO $$
      BEGIN
          CREATE TYPE role_type AS ENUM ('advertiser', 'affiliate');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END
      $$;
    `);

    // 6) campaign_roles TABLE
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

    // 7) processed_offsets TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_offsets" (
        "id"         SERIAL PRIMARY KEY,
        "last_lt"    VARCHAR(50) NOT NULL DEFAULT '0',
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 8) events TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "id" SERIAL PRIMARY KEY,
        "event_type" VARCHAR(255) NOT NULL,
        "payload" JSONB NOT NULL,
        "created_lt" VARCHAR(50),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 9) notifications TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id"             SERIAL PRIMARY KEY,
        "wallet_address" VARCHAR(255) NOT NULL,
        "message"        TEXT NOT NULL,
        "campaign_id"    VARCHAR(255),
        "created_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
        "read_at"        TIMESTAMP,
        "link"           VARCHAR(500),

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

    await queryRunner.query(`DROP TRIGGER IF EXISTS prevent_final_state_modification ON "campaigns";`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_modification_after_final_state;`);

    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "user_wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);

    await queryRunner.query(`DROP TYPE IF EXISTS role_type;`);
  }
}
