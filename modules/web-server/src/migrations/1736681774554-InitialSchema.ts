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
        "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 2) wallets TABLE (address is the PK, user_id references users(id))
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
    //    Now "wallet_id" must be a VARCHAR(255) if it references wallets(address).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id"                VARCHAR(255) PRIMARY KEY,
        "wallet_id"         VARCHAR(255) NOT NULL,               -- changed from BIGINT
        "asset_type"        VARCHAR(255),
        "asset_name"        VARCHAR(255),
        "asset_category"    VARCHAR(255),
        "asset_title"       VARCHAR(255),
        "asset_description" TEXT,
        "invite_link"       VARCHAR(500),
        "asset_photo"       BYTEA,
        "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_wallet_campaign"
          FOREIGN KEY ("wallet_id")
          REFERENCES "wallets"("address")  -- changed from ("id")
      );
    `);

    // 4) campaign_roles TABLE
    //    Similarly, change "wallet_id" to VARCHAR(255) referencing wallets(address).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_roles" (
        "id"            SERIAL PRIMARY KEY,
        "campaign_id"   VARCHAR(255) NOT NULL,
        "wallet_id"     VARCHAR(255) NOT NULL,   -- changed from BIGINT
        "role"          VARCHAR(50) NOT NULL,
        "affiliate_id"  INT,
        "created_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_campaign"
          FOREIGN KEY ("campaign_id")
          REFERENCES "campaigns"("id"),
        CONSTRAINT "fk_wallet"
          FOREIGN KEY ("wallet_id")
          REFERENCES "wallets"("address")  -- changed from ("id")
      );
    `);

    // 5) processed_offsets TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_offsets" (
        "id"         SERIAL PRIMARY KEY,
        "last_lt"    VARCHAR(50) NOT NULL DEFAULT '0',
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 6) events TABLE
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
    // Reverse the creation order
    await queryRunner.query(`DROP TABLE IF EXISTS "events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_offsets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_roles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
