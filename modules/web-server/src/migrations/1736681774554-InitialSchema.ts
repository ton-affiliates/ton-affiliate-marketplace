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
    //    Changed "campaign_contract_address" to be NOT NULL
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"                         VARCHAR(255) PRIMARY KEY,
        "handle"                     VARCHAR(255),
        "campaign_contract_address"  VARCHAR(255) NOT NULL,  -- <--- NOW NOT NULL
        "name"                       VARCHAR(255),
        "asset_type"                 VARCHAR(255),
        "asset_name"                 VARCHAR(255),
        "asset_category"             VARCHAR(255),
        "asset_description"          TEXT,
        "invite_link"                VARCHAR(500),
        "asset_photo"                BYTEA,
        "state"                      VARCHAR(50) NOT NULL DEFAULT 'DEPLOYED',
        "bot_is_admin"               BOOLEAN NOT NULL DEFAULT false,
        "admin_privileges"           TEXT[] DEFAULT '{}',
        "member_count"               INT NOT NULL DEFAULT 0,
        "verified_events"            user_event_type[] DEFAULT '{}',  -- We'll define user_event_type below
        "created_at"                 TIMESTAMP NOT NULL DEFAULT NOW(),
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

    // Create user_event_type enum (must happen before campaigns if we reference it in campaigns. 
    // If campaigns references user_event_type in verified_events, we need the enum created first).
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

    // 9) Because we reference user_event_type in campaigns.verified_events, ensure it's there:
    //    If you prefer a single CREATE TABLE statement for campaigns, move this block above
    //    that creation or combine them. This snippet shows you can do it here or earlier.

    // 10) user_events table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_events" (
        "id" SERIAL PRIMARY KEY,
        "user_id" BIGINT NOT NULL,
        "is_premium" BOOLEAN NOT NULL,
        "event_type" user_event_type NOT NULL,
        "is_processed" BOOLEAN NOT NULL DEFAULT false,
        "campaign_id" VARCHAR(255) NOT NULL,
        "affiliate_id" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 11) We need to prevent isProcessed from going true->false or other fields from changing.
    //     We'll do a trigger that checks:
    //       - No other fields except is_processed changed.
    //       - is_processed cannot go from true to false.
    // Create a function:
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_user_events_one_way_update()
      RETURNS TRIGGER AS $$
      BEGIN
          -- 1) If isProcessed changed from true to false, disallow
          IF OLD.is_processed = TRUE AND NEW.is_processed = FALSE THEN
              RAISE EXCEPTION 'Cannot change isProcessed from true back to false';
          END IF;

          -- 2) No other fields except is_processed can change.
          IF (OLD.user_id IS DISTINCT FROM NEW.user_id)
             OR (OLD.is_premium IS DISTINCT FROM NEW.is_premium)
             OR (OLD.event_type IS DISTINCT FROM NEW.event_type)
             OR (OLD.campaign_id IS DISTINCT FROM NEW.campaign_id)
             OR (OLD.affiliate_id IS DISTINCT FROM NEW.affiliate_id)
             OR (OLD.created_at IS DISTINCT FROM NEW.created_at)
          THEN
             RAISE EXCEPTION 'Cannot change fields other than isProcessed in user_events row.';
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Attach the trigger to user_events
    await queryRunner.query(`
      CREATE TRIGGER user_events_one_way_update
      BEFORE UPDATE ON "user_events"
      FOR EACH ROW
      EXECUTE FUNCTION enforce_user_events_one_way_update();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse creation in the opposite order

    // 1) Drop trigger & function for user_events
    await queryRunner.query(`DROP TRIGGER IF EXISTS user_events_one_way_update ON "user_events";`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS enforce_user_events_one_way_update;`);

    // 2) Drop user_events table
    await queryRunner.query(`DROP TABLE IF EXISTS "user_events";`);

    // 3) Drop notifications, events, processed_offsets, etc.
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_offsets";`);

    // 4) Drop campaign_roles
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_roles";`);

    // 5) Drop triggers & function for campaigns
    await queryRunner.query(`DROP TRIGGER IF EXISTS prevent_final_state_modification ON "campaigns";`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_modification_after_final_state;`);

    // 6) Drop campaigns
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns";`);

    // 7) Drop user_wallets, wallets, users
    await queryRunner.query(`DROP TABLE IF EXISTS "user_wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);

    // 8) Drop the enums (role_type, user_event_type)
    await queryRunner.query(`DROP TYPE IF EXISTS role_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_event_type;`);
  }
}
