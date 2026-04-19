import { ORACLE_FEATURE_FLAGS } from '../../capabilities';
import type { DbDialect } from '../../DbDialect';

export const OracleDialect: DbDialect = {
  engine: 'oracle',
  capabilities: ORACLE_FEATURE_FLAGS,
  introspect: {
    listSchemas: () => 'SELECT username AS schema_name FROM all_users ORDER BY username',
    listTables: (schema: string = 'USER') =>
      `SELECT table_name FROM all_tables WHERE owner = UPPER('${schema}') ORDER BY table_name`,
    listColumns: (schema: string, table: string) =>
      `SELECT column_name, data_type FROM all_tab_columns WHERE owner = UPPER('${schema}') AND table_name = UPPER('${table}') ORDER BY column_id`,
  },
  identifier: (name: string) => `"${name.replace(/"/g, '""')}"`,
  limitClause: (n: number) => `FETCH FIRST ${Math.max(1, Math.floor(n))} ROWS ONLY`,
  explain: (sql: string) => `EXPLAIN PLAN FOR ${sql}`,
  buildSystemPromptAddendum: () =>
    'You are working with Oracle Database. Use Oracle SQL syntax and ALL_* data dictionary views.',
};
