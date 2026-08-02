import {
  WEBSHOP_CANONICAL_TABLES,
  canonicalJson,
  sha256,
} from "./webshop-schema-contract.mjs";

/**
 * Reconstructs the signed WebshopSchemaFingerprintV1 projection from catalog
 * metadata.  It deliberately names every relation schema and does not depend
 * on search_path.  The same helper is used by the empty-baseline fixture and
 * the operator cutover postcondition check.
 */
export async function inspectWebshopSchema(client, manifest) {
  const relationRows = await client.query(`
    SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'webshop' AND c.relkind IN ('r', 'p')
     ORDER BY c.relname
  `);
  const tableNames = relationRows.rows.map((row) => row.table_name);
  const publicLegacy = await client.query(`
    SELECT c.relname
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
       AND c.relname = ANY($1::text[])
     ORDER BY c.relname
  `, [manifest.relocatedBusinessTables]);
  const columns = await client.query(`
    SELECT c.table_name, c.column_name, c.ordinal_position, c.is_nullable,
           c.udt_schema, c.udt_name, c.column_default
      FROM information_schema.columns c
     WHERE c.table_schema = 'webshop'
     ORDER BY c.table_name, c.ordinal_position
  `);
  const constraints = await client.query(`
    SELECT r.relname AS table_name, c.conname, c.contype,
           pg_get_constraintdef(c.oid, true) AS definition
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
     WHERE n.nspname = 'webshop'
     ORDER BY r.relname, c.conname
  `);
  const indexes = await client.query(`
    SELECT r.relname AS table_name, i.relname AS index_name,
           pg_get_indexdef(i.oid, 0, true) AS definition
      FROM pg_index x
      JOIN pg_class r ON r.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      JOIN pg_class i ON i.oid = x.indexrelid
     WHERE n.nspname = 'webshop'
     ORDER BY r.relname, i.relname
  `);
  const triggers = await client.query(`
    SELECT r.relname AS table_name, t.tgname AS trigger_name,
           pg_get_triggerdef(t.oid, true) AS definition
      FROM pg_trigger t
      JOIN pg_class r ON r.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
     WHERE n.nspname = 'webshop' AND NOT t.tgisinternal
     ORDER BY r.relname, t.tgname
  `);
  const crossSchemaFks = await client.query(`
    SELECT src.relname AS source_table, dstn.nspname AS destination_schema,
           dst.relname AS destination_table
      FROM pg_constraint c
      JOIN pg_class src ON src.oid = c.conrelid
      JOIN pg_namespace srcn ON srcn.oid = src.relnamespace
      JOIN pg_class dst ON dst.oid = c.confrelid
      JOIN pg_namespace dstn ON dstn.oid = dst.relnamespace
     WHERE c.contype = 'f' AND srcn.nspname = 'webshop'
       AND dstn.nspname = 'public'
     ORDER BY src.relname, dst.relname
  `);
  const projection = {
    version: "WebshopSchemaFingerprintV1",
    tables: tableNames.map((table) => ({
      name: table,
      columns: columns.rows.filter((row) => row.table_name === table).map((row) => ({
        columnDefault: row.column_default,
        isNullable: row.is_nullable,
        name: row.column_name,
        udtName: row.udt_name,
        udtSchema: row.udt_schema,
      })).sort((left, right) => left.name.localeCompare(right.name)),
      constraints: constraints.rows.filter((row) => row.table_name === table).map((row) => ({
        definition: row.definition,
        name: row.conname,
        type: row.contype,
      })),
      indexes: indexes.rows.filter((row) => row.table_name === table).map((row) => ({
        definition: row.definition,
        name: row.index_name,
      })),
      triggers: triggers.rows.filter((row) => row.table_name === table).map((row) => ({
        definition: row.definition,
        name: row.trigger_name,
      })),
    })),
  };
  return {
    crossSchemaFks: crossSchemaFks.rows,
    fingerprint: sha256(canonicalJson(projection)),
    isExactCanonicalTableSet:
      JSON.stringify(tableNames) ===
      JSON.stringify([...WEBSHOP_CANONICAL_TABLES].sort()),
    publicLegacyTables: publicLegacy.rows.map((row) => row.relname),
    projection,
    tableNames,
    triggerNames: triggers.rows.map((row) => row.trigger_name),
  };
}

/**
 * This is intentionally a separate legacy projection. It exists only to
 * recognize one exact pre-split public state; it is never a migration source
 * and it cannot turn arbitrary public objects into an approved cutover input.
 */
export async function inspectLegacyWebshopPublicSchema(client, manifest) {
  const tableNames = [...manifest.relocatedBusinessTables].sort();
  const relationRows = await client.query(`
    SELECT c.relname AS table_name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
       AND c.relname = ANY($1::text[])
     ORDER BY c.relname
  `, [tableNames]);
  const actualTableNames = relationRows.rows.map((row) => row.table_name);
  const columns = await client.query(`
    SELECT c.table_name, c.column_name, c.ordinal_position, c.is_nullable,
           c.udt_schema, c.udt_name, c.column_default
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = ANY($1::text[])
     ORDER BY c.table_name, c.ordinal_position
  `, [tableNames]);
  const constraints = await client.query(`
    SELECT r.relname AS table_name, c.conname, c.contype,
           pg_get_constraintdef(c.oid, true) AS definition
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
     WHERE n.nspname = 'public' AND r.relname = ANY($1::text[])
     ORDER BY r.relname, c.conname
  `, [tableNames]);
  const indexes = await client.query(`
    SELECT r.relname AS table_name, i.relname AS index_name,
           pg_get_indexdef(i.oid, 0, true) AS definition
      FROM pg_index x
      JOIN pg_class r ON r.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      JOIN pg_class i ON i.oid = x.indexrelid
     WHERE n.nspname = 'public' AND r.relname = ANY($1::text[])
     ORDER BY r.relname, i.relname
  `, [tableNames]);
  const projection = {
    version: "WebshopLegacyPublicSchemaFingerprintV1",
    tables: actualTableNames.map((table) => ({
      name: table,
      columns: columns.rows.filter((row) => row.table_name === table).map((row) => ({
        columnDefault: row.column_default,
        isNullable: row.is_nullable,
        name: row.column_name,
        udtName: row.udt_name,
        udtSchema: row.udt_schema,
      })).sort((left, right) => left.name.localeCompare(right.name)),
      constraints: constraints.rows.filter((row) => row.table_name === table).map((row) => ({
        definition: row.definition,
        name: row.conname,
        type: row.contype,
      })),
      indexes: indexes.rows.filter((row) => row.table_name === table).map((row) => ({
        definition: row.definition,
        name: row.index_name,
      })),
    })),
  };
  return {
    fingerprint: sha256(canonicalJson(projection)),
    isExactLegacyTableSet: JSON.stringify(actualTableNames) === JSON.stringify(tableNames),
    tableNames: actualTableNames,
  };
}
