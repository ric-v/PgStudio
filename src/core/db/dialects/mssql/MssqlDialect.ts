import { MSSQL_FEATURE_FLAGS } from '../../capabilities';
import type { DbDialect } from '../../DbDialect';

export const MssqlDialect: DbDialect = {
  engine: 'mssql',
  capabilities: MSSQL_FEATURE_FLAGS,
  introspect: {
    listSchemas: () => 'SELECT name AS schema_name FROM sys.schemas ORDER BY name;',
    listTables: (schema: string = 'dbo') =>
      `SELECT t.name AS table_name FROM sys.tables t INNER JOIN sys.schemas s ON s.schema_id = t.schema_id WHERE s.name = '${schema}' ORDER BY t.name;`,
    listColumns: (schema: string, table: string) =>
      `SELECT c.name AS column_name, ty.name AS data_type FROM sys.columns c INNER JOIN sys.tables t ON t.object_id = c.object_id INNER JOIN sys.schemas s ON s.schema_id = t.schema_id INNER JOIN sys.types ty ON ty.user_type_id = c.user_type_id WHERE s.name = '${schema}' AND t.name = '${table}' ORDER BY c.column_id;`,
  },
  identifier: (name: string) => `[${name.replace(/]/g, ']]')}]`,
  limitClause: (n: number) => `OFFSET 0 ROWS FETCH NEXT ${Math.max(1, Math.floor(n))} ROWS ONLY`,
  explain: (sql: string) => `SET SHOWPLAN_XML ON; ${sql}; SET SHOWPLAN_XML OFF;`,
  buildSystemPromptAddendum: () =>
    'You are working with Microsoft SQL Server. Use T-SQL syntax and sys catalog views.',
};
