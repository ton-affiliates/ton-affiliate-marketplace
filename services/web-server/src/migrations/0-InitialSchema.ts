import { MigrationInterface, QueryRunner } from 'typeorm';

export class ZeroInitialSchema implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) USERS TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                BIGINT PRIMARY KEY,   -- Telegram user ID (unique)
        "telegram_username" VARCHAR(255),
        "telegram_language" VARCHAR(10),
        "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 2) WALLETS TABLE (each wallet belongs to exactly one user)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallets" (
        "id"           SERIAL PRIMARY KEY,
        "user_id"      BIGINT NOT NULL,
        "address"      VARCHAR(255) NOT NULL,    -- TON wallet address
        "wallet_type"  VARCHAR(50),              -- e.g. "tonwallet", "tonkeeper"
        "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_user_wallet"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
      );
    `);

    // 3) CAMPAIGNS TABLE (associated with the wallet that created/owns the campaign)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"                VARCHAR(255) PRIMARY KEY,  -- Unique ID from the blockchain
        "wallet_id"         BIGINT NOT NULL,           -- References wallets(id)
        "asset_type"        VARCHAR(50),               -- e.g., "CHANNEL"
        "asset_name"        VARCHAR(255),              -- e.g., public channel username
        "asset_title"       VARCHAR(255),
        "asset_description" TEXT,
        "invite_link"       VARCHAR(500),
        "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_wallet_campaign"
          FOREIGN KEY ("wallet_id")
          REFERENCES "wallets"("id")
      );
    `);

    // 4) CAMPAIGN_ROLES TABLE (link each wallet to a campaign with a specific role)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_roles" (
        "id"           SERIAL PRIMARY KEY,
        "campaign_id"  VARCHAR(255) NOT NULL,   -- References campaigns(id)
        "wallet_id"    BIGINT NOT NULL,         -- References wallets(id)
        "role"         VARCHAR(50) NOT NULL,    -- e.g. 'ADVERTISER' or 'AFFILIATE'
        "affiliate_id" INT,                     -- Additional ID if needed for affiliates
        "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_campaign"
          FOREIGN KEY ("campaign_id")
          REFERENCES "campaigns"("id"),
        CONSTRAINT "fk_wallet"
          FOREIGN KEY ("wallet_id")
          REFERENCES "wallets"("id")
      );
    `);

     // A simple table with a single row
     await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_offsets" (
        "id" SERIAL PRIMARY KEY,
        "network" VARCHAR(50) NOT NULL,
        "last_lt" VARCHAR(50) NOT NULL DEFAULT '0',
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_network" UNIQUE ("network")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_offsets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_roles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
