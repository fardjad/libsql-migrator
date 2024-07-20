import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { type MigrationWithSQL, MigratorInternal } from "./migrator.ts";
import { type Client, createClient } from "npm:@libsql/client/node";

class FakeMigrationWithSQL implements AsyncIterable<MigrationWithSQL> {
  constructor(private migrations: MigrationWithSQL[]) {}
  async *[Symbol.asyncIterator]() {
    for (const migration of this.migrations) {
      yield Promise.resolve(migration);
    }
  }
}

const testDatabaseUrl = ":memory:";

// internal methods

describe("extractVersionstamp", () => {
  const table = [
    ["whatever", new Error("Invalid migration name")],
    ["a-whatever", new Error("Invalid migration name")],
    ["a123b-whatever", new Error("Invalid migration name")],
    ["-1-whatever", new Error("Invalid migration name")],
    ["1.2345-whatever", new Error("Invalid migration name")],

    ["1234", 1234],
    ["1234-", 1234],
    ["1234-whatever", 1234],
  ] as Array<[string, number | Error]>;

  for (const [name, expected] of table) {
    describe(`when the name is "${name}"`, () => {
      it(`should return ${expected}`, () => {
        let actual: number | Error;

        try {
          actual = MigratorInternal.extractVersionstamp(name);
        } catch (e) {
          actual = e;
        }

        if (actual instanceof Error && expected instanceof Error) {
          assertEquals(actual.message, expected.message);
          return;
        }
        assertEquals(actual, expected);
      });
    });
  }
});

describe("nameToMigration", () => {
  it("should turn a migration name into a Migration object", () => {
    const name = "1234-whatever";
    const actual = MigratorInternal.nameToMigration(name);
    assertEquals(actual, {
      name,
      versionstamp: 1234,
    });
  });
});

describe("createMigrationTable", () => {
  let client: Client;

  beforeEach(() => {
    client = createClient({ url: testDatabaseUrl });
  });

  afterEach(() => {
    client.close();
  });

  it("should create the migrations table", async () => {
    const migrationsTableName = "migrations";
    const migrator = new MigratorInternal(
      client,
      new FakeMigrationWithSQL([]),
      migrationsTableName,
    );
    await migrator.createMigrationTable();

    const tables = await client.execute({
      sql:
        `SELECT COUNT(name) AS count FROM sqlite_master WHERE name=? AND type='table';`,
      args: [migrationsTableName],
    });

    assertEquals(tables.rows[0].count, 1);
  });
});

describe("getLastAppliedMigration", () => {
  let client: Client;
  let migrator: MigratorInternal;
  const migrationsTableName = "migrations";

  beforeEach(() => {
    client = createClient({ url: ":memory:" });
    migrator = new MigratorInternal(
      client,
      new FakeMigrationWithSQL([]),
      migrationsTableName,
    );
    migrator.createMigrationTable();
  });

  afterEach(() => {
    client.close();
  });

  it("should return undefined if there are no migrations", async () => {
    const migrator = new MigratorInternal(
      client,
      new FakeMigrationWithSQL([]),
      migrationsTableName,
    );
    const actual = await migrator.getLastAppliedMigration();
    assertEquals(actual, undefined);
  });

  it("should return the last applied migration", async () => {
    await client.execute({
      sql: `INSERT INTO ${migrationsTableName} (name) VALUES (?), (?)`,
      args: ["0-first", "0-second"],
    });

    const actual = await migrator.getLastAppliedMigration();
    assertEquals(actual, {
      name: "0-second",
      versionstamp: 0,
    });
  });
});

// exported methods

describe("migrate", () => {
  const migrationsTableName = "migrations";
  let client: Client;
  const migrations = [
    {
      name: "0-first",
      versionstamp: 0,
      sql: "CREATE TABLE first (id INTEGER);",
    },
    {
      name: "1-second",
      versionstamp: 1,
      sql: "CREATE TABLE second (id INTEGER);",
    },
  ];
  let migrator: MigratorInternal;

  describe("when no previous migrations are applied", () => {
    beforeEach(() => {
      client = createClient({ url: ":memory:" });
      migrator = new MigratorInternal(
        client,
        new FakeMigrationWithSQL(migrations),
        migrationsTableName,
      );
    });

    afterEach(() => {
      client.close();
    });

    it("should apply all migrations", async () => {
      await migrator.migrate();

      const tables = await client.execute({
        sql:
          `SELECT COUNT(name) as count FROM sqlite_master WHERE type='table' AND name IN (?, ?);`,
        args: ["first", "second"],
      });

      assertEquals(tables.rows[0].count, 2);
    });
  });

  describe("when a previous migration is applied", () => {
    beforeEach(async () => {
      client = createClient({ url: ":memory:" });
      migrator = new MigratorInternal(
        client,
        new FakeMigrationWithSQL(migrations),
        migrationsTableName,
      );
      await migrator.createMigrationTable();
      await client.execute({
        sql: `INSERT INTO ${migrationsTableName} (name) VALUES (?);`,
        args: ["0-first"],
      });
    });

    afterEach(() => {
      client.close();
    });

    it("should only apply the newer migrations", async () => {
      await migrator.migrate();

      const tables = await client.execute({
        sql:
          `SELECT COUNT(name) as count FROM sqlite_master WHERE type='table' AND name IN (?, ?);`,
        args: ["first", "second"],
      });

      assertEquals(tables.rows[0].count, 1);
    });
  });
});
