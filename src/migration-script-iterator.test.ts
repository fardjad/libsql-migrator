import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { createMigrationScriptIterator } from "./migration-script-iterator.ts";

describe("createMigrationScriptIterator", () => {
  it("should throw an error when the directory does not exist", () => {
    const migrationsDirectoryPath = new URL(
      "./__fixtures__/nonexistent",
      import.meta.url,
    ).pathname;

    assertRejects(async () => {
      await Array.fromAsync(
        createMigrationScriptIterator(migrationsDirectoryPath),
      );
    });
  });

  it("should return an iterator that yields migrations with SQL", async () => {
    const migrationsDirectoryPath = new URL(
      "./__fixtures__/migrations",
      import.meta.url,
    ).pathname;
    const migrations = [];
    for await (
      const migration of createMigrationScriptIterator(
        migrationsDirectoryPath,
      )
    ) {
      migrations.push(migration);
    }

    assertEquals(migrations, [
      {
        name: "1",
        versionstamp: 1,
        sql: "-- 1.sql",
      },
      {
        name: "2",
        versionstamp: 2,
        sql: "-- 2.sql",
      },
    ]);
  });
});
