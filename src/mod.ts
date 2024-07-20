import {
  type LibSQLMigratorConstructor,
  libSQLMigratorConstructor,
  type Migration,
  type MigrationWithSQL,
  type Migrator,
} from "./migrator.ts";
import { createMigrationScriptIterator } from "./migration-script-iterator.ts";

export type {
  LibSQLMigratorConstructor,
  Migration,
  MigrationWithSQL,
  Migrator,
};

/**
 * Creates a new migrator instance.
 */
export { libSQLMigratorConstructor as LibSQLMigrator };
export { createMigrationScriptIterator };
