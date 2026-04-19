import { SQLITE_FEATURE_FLAGS } from '../../capabilities';
import type { DbDialect } from '../../DbDialect';

export const SqliteDialect: DbDialect = {
  engine: 'sqlite',
  capabilities: SQLITE_FEATURE_FLAGS,
  introspect: {
    listTables: () => "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
    listColumns: (_schema: string, table: string) => `PRAGMA table_info(${table});`,
    listIndexes: (_schema: string, table: string) => `PRAGMA index_list(${table});`,
    listForeignKeys: (_schema: string, table: string) => `PRAGMA foreign_key_list(${table});`,
  },
  identifier: (name: string) => `"${name.replace(/"/g, '""')}"`,
  limitClause: (n: number) => `LIMIT ${Math.max(1, Math.floor(n))}`,
  explain: (sql: string) => `EXPLAIN QUERY PLAN ${sql}`,
  buildSystemPromptAddendum: () =>
    'You are working with SQLite. Prefer sqlite_master and PRAGMA introspection.',
};
