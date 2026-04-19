import { MYSQL_FEATURE_FLAGS } from '../../capabilities';
import type { DbDialect } from '../../DbDialect';

export const MySqlDialect: DbDialect = {
  engine: 'mysql',
  capabilities: MYSQL_FEATURE_FLAGS,
  introspect: {
    listSchemas: () => 'SHOW DATABASES;',
    listTables: (schema: string = 'information_schema') => `SHOW TABLES FROM \`${schema}\`;`,
    listColumns: (schema: string, table: string) =>
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${table}' ORDER BY ordinal_position;`,
  },
  identifier: (name: string) => `\`${name.replace(/`/g, '``')}\``,
  limitClause: (n: number) => `LIMIT ${Math.max(1, Math.floor(n))}`,
  explain: (sql: string) => `EXPLAIN FORMAT=JSON ${sql}`,
  buildSystemPromptAddendum: () =>
    'You are working with MySQL. Use MySQL syntax and information_schema queries.',
};
