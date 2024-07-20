import { migratorConstructor } from "./migrator.ts";
import { createMigrationScriptIterator } from "./migration-script-iterator.ts";

/**
 * Creates a new migrator instance.
 */
export const Migrator = migratorConstructor;
export { createMigrationScriptIterator };
