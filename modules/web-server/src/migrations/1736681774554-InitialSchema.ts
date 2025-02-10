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

    // 6) Create campaigns TABLE (with new state column and check constraint)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"                VARCHAR(255) PRIMARY KEY,
        "contract_address"  VARCHAR(255) NOT NULL,
        "name"              VARCHAR(255) NULL,
        "category"          VARCHAR(255) NULL,
        "verified_events"   BIGINT[] NOT NULL DEFAULT '{}',
        "telegram_asset_id" VARCHAR(255) NULL,
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
        -- Allowed transitions:
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

    // 11) Create events TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "id" SERIAL PRIMARY KEY,
        "event_type" VARCHAR(255) NOT NULL,
        "payload" JSONB NOT NULL,
        "created_lt" VARCHAR(50),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 12) Create user_events TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_events" (
        "id" SERIAL PRIMARY KEY,
        "user_telegram_id" BIGINT NOT NULL,
        "is_premium" BOOLEAN NOT NULL,
        "event_op_code" BIGINT NOT NULL,
        "event_name" VARCHAR(255) NOT NULL,
        "is_processed" BOOLEAN NOT NULL DEFAULT false,
        "campaign_id" VARCHAR(255) NOT NULL,
        "affiliate_id" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 13) Create the function for user_events to prevent is_processed regression.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_isProcessed_regression()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.is_processed = true AND NEW.is_processed = false THEN
          RAISE EXCEPTION 'Cannot revert is_processed from true to false';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 14) Create trigger on user_events table referencing that function.
    await queryRunner.query(`
      CREATE TRIGGER trg_prevent_isProcessed_regression
      BEFORE UPDATE ON "user_events"
      FOR EACH ROW
      EXECUTE PROCEDURE prevent_isProcessed_regression();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse creation order.
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_prevent_isProcessed_regression ON "user_events";`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_isProcessed_regression();`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events";`);
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
