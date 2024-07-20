import type { Client, Transaction } from "@libsql/client";

export type MigrationWithSQL = Migration & {
  /**
   * The SQL script to apply.
   */
  sql: string;
};

type Migration = {
  /**
   * The name of the migration script without the file extension.
   */
  name: string;

  /**
   * The versionstamp of the migration. This is the first part of the name
   * before the first hyphen.
   */
  versionstamp: number;
};

export class MigratorInternal {
  constructor(
    private clientOrTransaction: Client | Transaction,
    private migrations: AsyncIterable<MigrationWithSQL>,
    private migrationsTableName = "migrations",
  ) {}

  async migrate() {
    await this.createMigrationTable();

    const lastMigration = await this.getLastAppliedMigration();

    for await (const migration of this.migrations) {
      if (
        lastMigration !== undefined &&
        migration.versionstamp <= lastMigration.versionstamp
      ) {
        continue;
      }

      await this.clientOrTransaction.execute(migration.sql);
      await this.clientOrTransaction.execute({
        sql: `INSERT INTO ${this.migrationsTableName} (name) VALUES (?);`,
        args: [migration.name],
      });
    }
  }

  static extractVersionstamp(name: string) {
    const maybeversionstamp = name.split("-")[0];

    if (!/^\d+$/.test(maybeversionstamp)) {
      throw new Error("Invalid migration name");
    }

    return Number(maybeversionstamp);
  }

  static nameToMigration(name: string): Migration {
    const versionstamp = MigratorInternal.extractVersionstamp(name);

    return {
      name,
      versionstamp,
    };
  }

  async createMigrationTable() {
    await this.clientOrTransaction.execute(
      `CREATE TABLE IF NOT EXISTS ${this.migrationsTableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );`,
    );
  }

  async getLastAppliedMigration(): Promise<Migration | undefined> {
    await this.createMigrationTable();

    const result = await this.clientOrTransaction.execute(
      `SELECT name FROM ${this.migrationsTableName} ORDER BY id DESC LIMIT 1;`,
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    return {
      name: result.rows[0].name as string,
      versionstamp: MigratorInternal.extractVersionstamp(
        result.rows[0].name as string,
      ),
    } satisfies Migration;
  }
}

/**
 * Applies a series of SQL migration scripts to a LibSQL client or transaction.
 */
type Migrator = {
  /**
   * Apply the migration scripts.
   */
  migrate(): Promise<void>;
};

type MigratorConstructor = new (
  /**
   * The client or transaction to use to apply the migrations.
   * Committing the transaction and closing the connection should be done by
   * the caller.
   */
  clientOrTransaction: Client | Transaction,
  /**
   * An async iterable of migrations to apply.
   */
  migrations: AsyncIterable<MigrationWithSQL>,
  /**
   * The name of the table to use to store the applied migrations. Defaults to
   * "migrations".
   */
  migrationsTableName?: string,
) => Migrator;

export const migratorConstructor: MigratorConstructor = MigratorInternal;
