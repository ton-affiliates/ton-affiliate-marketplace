// src/migrations/InitialSchema1736681774554.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1736681774554 implements MigrationInterface {
  // Disable wrapping this migration in a single transaction (if desired).
  public static transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    //5) Create telegram_assets TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telegram_assets" (
        "chat_id"         VARCHAR(255) PRIMARY KEY,
        "handle"          VARCHAR(255) NULL,
        "invite_link"     VARCHAR(500) NULL,
        "name"            VARCHAR(255) NULL,
        "description"     TEXT NULL,
        "type"            VARCHAR(255) NULL,
        "is_public"       BOOLEAN NOT NULL DEFAULT true,
        "photo"           BYTEA NULL,
        "bot_status"      VARCHAR(50) NOT NULL DEFAULT 'unknown',
        "admin_privileges" TEXT[] NOT NULL DEFAULT '{}',
        "member_count"    INT NOT NULL DEFAULT 0,
        "created_at"      TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT NOW()
      );
  `);



    // 6) Create campaigns TABLE (with new state column and check constraint)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"                VARCHAR(255) PRIMARY KEY,
        "contract_address"  VARCHAR(255) NOT NULL,
        "name"              VARCHAR(255) NULL,
        "category"          VARCHAR(255) NULL,
        "verified_events"   BIGINT[] NOT NULL DEFAULT '{}',
        "telegram_asset_id" VARCHAR(255) NULL,
        "verify_user_is_human_on_referral" BOOLEAN NOT NULL DEFAULT true,
        "state"             VARCHAR(50) NOT NULL DEFAULT 'DEPLOYED_ON_CHAIN',
        "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "chk_campaign_state" CHECK (
          "state" IN ('DEPLOYED_ON_CHAIN', 'TELEGRAM_DETAILS_SET', 'BLOCKCHIAN_DETIALS_SET')
        ),
        CONSTRAINT "fk_telegram_asset"
          FOREIGN KEY ("telegram_asset_id")
          REFERENCES "telegram_assets"("chat_id")
      );
    `);

    // 6.1) Create trigger function to enforce state transitions on campaigns.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_campaign_state_transition()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Allow updates when there is no change in state.
        IF NEW.state = OLD.state THEN
          RETURN NEW;
        END IF;

        -- Once the final state is reached, no further changes are allowed.
        IF OLD.state = 'BLOCKCHIAN_DETIALS_SET' THEN
          RAISE EXCEPTION 'Campaign in final state BLOCKCHIAN_DETIALS_SET cannot be updated';
        END IF;

        -- Enforce allowed state transitions:
        -- DEPLOYED_ON_CHAIN -> TELEGRAM_DETAILS_SET
        -- TELEGRAM_DETAILS_SET -> BLOCKCHIAN_DETIALS_SET
        IF (OLD.state = 'DEPLOYED_ON_CHAIN' AND NEW.state = 'TELEGRAM_DETAILS_SET')
           OR (OLD.state = 'TELEGRAM_DETAILS_SET' AND NEW.state = 'BLOCKCHIAN_DETIALS_SET') THEN
          RETURN NEW;
        END IF;

        RAISE EXCEPTION 'Invalid campaign state transition from % to %', OLD.state, NEW.state;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 6.2) Create trigger on campaigns table referencing the state transition function.
    await queryRunner.query(`
      CREATE TRIGGER trg_enforce_campaign_state_transition
      BEFORE UPDATE ON "campaigns"
      FOR EACH ROW
      EXECUTE PROCEDURE enforce_campaign_state_transition();
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

    // 10) Create notifications TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" SERIAL PRIMARY KEY,
        "wallet_address" VARCHAR(255) NOT NULL,
        "message" TEXT NOT NULL,
        "campaign_id" VARCHAR(255) NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "read_at" TIMESTAMP NULL,
        "link" VARCHAR(500) NULL
      );
    `);

    // 11) Create telegram_events TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telegram_events" (
        "id" SERIAL PRIMARY KEY,
        "op_code" INTEGER NOT NULL,
        "user_telegram_id" BIGINT NOT NULL,
        "is_premium" BOOLEAN NOT NULL,
        "is_processed" BOOLEAN NOT NULL DEFAULT false,
        "chat_id" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);


    // 12) events table - events emitted from the Blockchain
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "id" SERIAL PRIMARY KEY,
        "event_type" VARCHAR(255) NOT NULL,
        "payload" JSONB NOT NULL,
        "created_lt" VARCHAR(50),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

     // 13) Create referrals TABLE
     await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referrals" (
        "id" SERIAL PRIMARY KEY,
        "user_telegram_id" BIGINT NOT NULL,
        "campaign_id" VARCHAR(255) NOT NULL,
        "affiliate_id" INT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse creation order.
    await queryRunner.query(`DROP TABLE IF EXISTS "referrals";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_offsets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_roles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_assets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);

    // Drop ENUM types last.
    await queryRunner.query(`DROP TYPE IF EXISTS role_type;`);
  }
}
