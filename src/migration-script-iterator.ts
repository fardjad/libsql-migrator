import { expandGlob } from "@std/fs";
import { type MigrationWithSQL, MigratorInternal } from "./migrator.ts";
import { basename, extname } from "@std/path";

/**
 * Creates an iterator that yields {@link MigrationWithSQL} objects from a directory.
 *
 * @param migrationsDirectoryPath The path to the directory containing the migration scripts.
 */
export const createMigrationScriptIterator = async function* (
  migrationsDirectoryPath: string,
): AsyncIterable<MigrationWithSQL> {
  for await (
    const file of expandGlob("*.sql", {
      root: migrationsDirectoryPath,
      followSymlinks: true,
      includeDirs: false,
    })
  ) {
    const name = basename(file.path, extname(file.path));
    const sql = await Deno.readTextFile(file.path);
    yield {
      name,
      versionstamp: MigratorInternal.extractVersionstamp(name),
      sql,
    };
  }
};
