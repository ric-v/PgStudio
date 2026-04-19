import { POSTGRES_FEATURE_FLAGS } from '../../capabilities';
import type { DbDialect } from '../../DbDialect';

import * as PostgresSql from '../../../../commands/sql/postgres';

const introspect = {
  listSchemas: () => `
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
ORDER BY schema_name;
`,
  listTables: (schema: string = 'public') => `
SELECT table_name
FROM information_schema.tables
WHERE table_schema = '${schema}'
ORDER BY table_name;
`,
  listColumns: (schema: string, table: string) => `
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = '${schema}'
AND table_name = '${table}'
ORDER BY ordinal_position;
`,
  search: (term: string) => `
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name ILIKE '%${term.replace(/'/g, "''")}%'
ORDER BY table_schema, table_name;
`,
};

export const PostgresDialect: DbDialect = {
  engine: 'postgres',
  capabilities: POSTGRES_FEATURE_FLAGS,
  introspect,
  sql: PostgresSql,
  identifier: (name: string) => `"${name.replace(/"/g, '""')}"`,
  limitClause: (n: number) => `LIMIT ${Math.max(1, Math.floor(n))}`,
  explain: (sql: string) => `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
  buildSystemPromptAddendum: () =>
    'You are working with PostgreSQL. Prefer pg_catalog and information_schema where appropriate.',
};
