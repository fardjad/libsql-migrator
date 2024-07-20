# libSQL Migrator

[![JSR][JSR badge]][JSR]

[JSR]: https://jsr.io/@fardjad/libsql-migrator
[JSR badge]: https://jsr.io/badges/@fardjad/libsql-migrator

This module manages the migrations for a libSQL database by applying the SQL
migration scripts in a directory to the database.

## Installation

```sh
deno add @fardjad/libsql-migrator
```

## Usage

This module expects a directory containing at least one SQL migration scripts.
The files in the directory must match the regex `\d+-.*\.sql`. The numeric part
before the hyphen is used to determine the order of the scripts.

Assuming the following directory structure:

```
migrations/
  0001-create-users-table.sql
  0002-add-address-column.sql
  0003-add-index.sql
```

Running the following code will apply the migration scripts to the database:

```typescript
import {
  createMigrationScriptIterator,
  LibSQLMigrator,
} from "@fardjad/libsql-migrator";
import { createClient } from "npm:@libsql/client/node";

const client = createClient({
  url: new URL("./db.sqlite", import.meta.url).toString(),
});

migrator = new LibSQLMigrator(
  client,
  createMigrationScriptIterator(
    new URL("./migrations", import.meta.url).toString(),
  ),
);
await migrator.migrate();

client.close();
```
