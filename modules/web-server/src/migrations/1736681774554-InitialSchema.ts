import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1736681774554 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) user TABLE with updated columns
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id"                BIGINT PRIMARY KEY,
        "telegram_username" VARCHAR(255),
        "first_name"        VARCHAR(255),  -- new column
        "last_name"         VARCHAR(255),  -- new column
        "photo_url"         VARCHAR(255),  -- new column
        "telegram_language" VARCHAR(10),
        "auth_date"         TIMESTAMP,     -- new column
        "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 2) wallet TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet" (
        "id"           SERIAL PRIMARY KEY,
        "user_id"      BIGINT NOT NULL,
        "address"      VARCHAR(255) NOT NULL,
        "wallet_type"  VARCHAR(50),
        "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_user_wallet"
          FOREIGN KEY ("user_id")
          REFERENCES "user"("id")
      );
    `);

    // 3) campaign TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign" (
        "id"                VARCHAR(255) PRIMARY KEY,
        "wallet_id"         BIGINT NOT NULL,
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
          REFERENCES "wallet"("id")
      );
    `);

    // 4) campaign_role TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_role" (
        "id"            SERIAL PRIMARY KEY,
        "campaign_id"   VARCHAR(255) NOT NULL,
        "wallet_id"     BIGINT NOT NULL,
        "role"          VARCHAR(50) NOT NULL,
        "affiliate_id"  INT,
        "created_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_campaign"
          FOREIGN KEY ("campaign_id")
          REFERENCES "campaign"("id"),
        CONSTRAINT "fk_wallet"
          FOREIGN KEY ("wallet_id")
          REFERENCES "wallet"("id")
      );
    `);

    // 5) processed_offset TABLE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_offset" (
        "id"         SERIAL PRIMARY KEY,
        "last_lt"    VARCHAR(50) NOT NULL DEFAULT '0',
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_offset";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_role";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user";`);
  }
}
