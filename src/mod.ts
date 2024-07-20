/**
 * Manages the migrations for a libSQL database by applying the SQL migration
 * scripts in a directory to the database.
 * @module
 */

import { migratorConstructor } from "./migrator.ts";
import { createMigrationScriptIterator } from "./migration-script-iterator.ts";

/**
 * Creates a new migrator instance.
 */
export const Migrator = migratorConstructor;
export { createMigrationScriptIterator };
