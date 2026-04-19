import * as vscode from 'vscode';
import { ConnectionManager } from '../services/ConnectionManager';
import { getDialect } from '../core/db/registry';
import { DEFAULT_DB_ENGINE, resolveDbEngine } from '../core/db/DbEngine';

interface TableInfo {
  schema: string;
  tableName: string;
}

interface ColumnInfo {
  schema: string;
  tableName: string;
  columnName: string;
  dataType: string;
}

export class SqlCompletionProvider implements vscode.CompletionItemProvider {
  private tableCache: Map<string, TableInfo[]> = new Map();
  private columnCache: Map<string, ColumnInfo[]> = new Map();
  private lastCacheUpdate: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  private readFirstValue(row: Record<string, unknown>, preferredKeys: string[]): string {
    for (const key of preferredKeys) {
      if (typeof row[key] === 'string' && row[key]) {
        return row[key] as string;
      }
    }

    const firstValue = Object.values(row)[0];
    return typeof firstValue === 'string' ? firstValue : String(firstValue ?? '');
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]> {
    const completionItems: vscode.CompletionItem[] = [];

    try {
      // Get connection info from notebook metadata or active connection
      const connectionInfo = await this._getConnectionInfo(document);
      if (!connectionInfo) {
        return [];
      }

      const { connectionId, database, engine } = connectionInfo;
      const cacheKey = `${connectionId}-${engine}-${database}`;

      // Update cache if needed
      if (this._shouldUpdateCache(cacheKey)) {
        await this._updateCache(connectionId, database, engine, cacheKey);
      }

      // Get current line and word being typed
      const lineText = document.lineAt(position).text;
      const wordRange = document.getWordRangeAtPosition(position);
      const currentWord = wordRange ? document.getText(wordRange) : '';

      // Parse query to find referenced tables
      const fullText = document.getText();
      const referencedTables = this._extractTableNames(fullText);

      // Add SQL keywords
      completionItems.push(...this._getSqlKeywords());

      // Add table suggestions with high priority
      const tables = this.tableCache.get(cacheKey) || [];
      completionItems.push(...this._getTableCompletions(tables, referencedTables));

      // Add column suggestions based on context
      const columns = this.columnCache.get(cacheKey) || [];
      completionItems.push(...this._getColumnCompletions(columns, referencedTables, lineText));

    } catch (error) {
      console.error('SQL completion error:', error);
    }

    return completionItems;
  }

  private async _getConnectionInfo(document: vscode.TextDocument): Promise<{ connectionId: string; database: string; engine: string } | null> {
    // For notebooks, get from metadata
    if (document.uri.scheme === 'vscode-notebook-cell') {
      const notebook = vscode.workspace.notebookDocuments.find(nb =>
        nb.getCells().some(cell => cell.document.uri.toString() === document.uri.toString())
      );

      if (notebook?.metadata) {
        const metadata = notebook.metadata;
        const connections = vscode.workspace.getConfiguration().get<any[]>('postgresExplorer.connections') || [];
        const connection = connections.find(c => c.id === metadata.connectionId);
        const engine = resolveDbEngine(metadata.engine || connection?.engine || DEFAULT_DB_ENGINE);

        let database = metadata.databaseName || connection?.database;
        if (!database) {
          database = engine === 'mysql' ? 'mysql' : engine === 'sqlite' ? ':memory:' : 'postgres';
        }

        return {
          connectionId: metadata.connectionId,
          database,
          engine,
        };
      }
    }

    // For regular files, try to get from workspace state or recent connection
    // This is a fallback - ideally user should use notebooks for better context
    return null;
  }

  private _shouldUpdateCache(cacheKey: string): boolean {
    const lastUpdate = this.lastCacheUpdate.get(cacheKey);
    if (!lastUpdate) {
      return true;
    }
    return Date.now() - lastUpdate > this.CACHE_TTL;
  }

  private async _updateCache(connectionId: string, database: string, engine: string, cacheKey: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration();
      const connections = config.get<any[]>('postgresExplorer.connections') || [];
      const connection = connections.find(c => c.id === connectionId);

      if (!connection) {
        return;
      }

      const resolvedEngine = resolveDbEngine(engine || connection.engine || DEFAULT_DB_ENGINE);
      const dialect = getDialect(resolvedEngine);
      let client;
      try {
        client = await ConnectionManager.getInstance().getPooledClient({
          id: connection.id,
          host: connection.host,
          port: connection.port,
          username: connection.username,
          engine: resolvedEngine,
          database: database,
          name: connection.name
        });

        let tables: TableInfo[] = [];
        let columns: ColumnInfo[] = [];

        if (resolvedEngine === 'sqlite') {
          const tablesResult = await client.query(dialect.introspect.listTables?.() || 'SELECT name FROM sqlite_master WHERE type = \'table\' ORDER BY name;');
          tables = tablesResult.rows
            .map((row: any) => {
              const tableName = this.readFirstValue(row as Record<string, unknown>, ['table_name', 'name', 'tbl_name']);
              return {
                schema: 'main',
                tableName,
              };
            })
            .filter((t: TableInfo) => !!t.tableName);

          for (const table of tables) {
            const pragmaResult = await client.query(dialect.introspect.listColumns?.('', table.tableName) || `PRAGMA table_info(${table.tableName});`);
            const tableColumns = pragmaResult.rows.map((row: any) => ({
              schema: table.schema,
              tableName: table.tableName,
              columnName: this.readFirstValue(row as Record<string, unknown>, ['column_name', 'name']),
              dataType: this.readFirstValue(row as Record<string, unknown>, ['data_type', 'type']),
            }));
            columns.push(...tableColumns);
          }
        } else if (resolvedEngine === 'mysql') {
          const tablesQuery = dialect.introspect.listTables?.(database) || `SHOW TABLES FROM \`${database}\`;`;
          const tablesResult = await client.query(tablesQuery);
          tables = tablesResult.rows
            .map((row: any) => ({
              schema: database,
              tableName: this.readFirstValue(row as Record<string, unknown>, ['table_name', 'TABLE_NAME', `Tables_in_${database}`]),
            }))
            .filter((t: TableInfo) => !!t.tableName);

          for (const table of tables) {
            const columnsQuery = dialect.introspect.listColumns?.(database, table.tableName) || `
              SELECT column_name, data_type
              FROM information_schema.columns
              WHERE table_schema = '${database}' AND table_name = '${table.tableName}'
              ORDER BY ordinal_position
            `;
            const columnsResult = await client.query(columnsQuery);
            const tableColumns = columnsResult.rows.map((row: any) => ({
              schema: database,
              tableName: table.tableName,
              columnName: this.readFirstValue(row as Record<string, unknown>, ['column_name', 'COLUMN_NAME', 'Field']),
              dataType: this.readFirstValue(row as Record<string, unknown>, ['data_type', 'DATA_TYPE', 'Type']),
            }));
            columns.push(...tableColumns);
          }
        } else {
          // Fetch tables (PostgreSQL and fallback behavior)
          const tablesQuery = dialect.introspect.listTables?.(database) || `
                    SELECT schemaname as schema, tablename as table_name
                    FROM pg_tables
                    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                    ORDER BY schemaname, tablename
                `;
          const tablesResult = await client.query(tablesQuery);
          tables = tablesResult.rows.map((row: any) => ({
            schema: this.readFirstValue(row as Record<string, unknown>, ['schema', 'TABLE_SCHEMA', 'Database']),
            tableName: this.readFirstValue(row as Record<string, unknown>, ['table_name', 'Tables_in_database', 'name'])
          }));

          const columnsQuery = dialect.introspect.listColumns?.(database, database) || `
              SELECT 
                table_schema as schema,
                table_name,
                column_name,
                data_type
              FROM information_schema.columns
              WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
              ORDER BY table_schema, table_name, ordinal_position
            `;
                const columnsResult = await client.query(columnsQuery);
                columns = columnsResult.rows.map((row: any) => ({
              schema: this.readFirstValue(row as Record<string, unknown>, ['schema', 'TABLE_SCHEMA', 'table_schema']),
              tableName: this.readFirstValue(row as Record<string, unknown>, ['table_name', 'TABLE_NAME', 'name']),
              columnName: this.readFirstValue(row as Record<string, unknown>, ['column_name', 'Field', 'name']),
              dataType: this.readFirstValue(row as Record<string, unknown>, ['data_type', 'Type', 'type'])
                }));
              }

        this.tableCache.set(cacheKey, tables);
        this.columnCache.set(cacheKey, columns);
        this.lastCacheUpdate.set(cacheKey, Date.now());
      } finally {
        if (client) client.release();
      }
    } catch (error) {
      console.error('Cache update error:', error);
    }
  }

  private _extractTableNames(sqlText: string): Set<string> {
    const tables = new Set<string>();
    const text = sqlText.toLowerCase();

    // Match FROM clause
    const fromRegex = /from\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi;
    let match;
    while ((match = fromRegex.exec(text)) !== null) {
      const tableName = match[1].split('.').pop() || match[1];
      tables.add(tableName);
    }

    // Match JOIN clauses
    const joinRegex = /join\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi;
    while ((match = joinRegex.exec(text)) !== null) {
      const tableName = match[1].split('.').pop() || match[1];
      tables.add(tableName);
    }

    return tables;
  }

  private _getSqlKeywords(): vscode.CompletionItem[] {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
      'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL',
      'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
      'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
      'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
      'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ];

    return keywords.map(keyword => {
      const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
      item.sortText = `3-${keyword}`; // Lower priority than tables and columns
      return item;
    });
  }

  private _getTableCompletions(tables: TableInfo[], referencedTables: Set<string>): vscode.CompletionItem[] {
    return tables.map(table => {
      const item = new vscode.CompletionItem(
        table.tableName,
        vscode.CompletionItemKind.Class
      );

      item.detail = `Table (${table.schema})`;
      item.documentation = new vscode.MarkdownString(`**Table:** \`${table.schema}.${table.tableName}\``);

      // Higher priority for already referenced tables
      if (referencedTables.has(table.tableName.toLowerCase())) {
        item.sortText = `0-${table.tableName}`;
      } else {
        item.sortText = `1-${table.tableName}`;
      }

      // Add schema prefix as insert text if needed
      item.insertText = table.tableName;
      item.filterText = `${table.schema}.${table.tableName} ${table.tableName}`;

      return item;
    });
  }

  private _getColumnCompletions(
    columns: ColumnInfo[],
    referencedTables: Set<string>,
    lineText: string
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    // Filter columns by referenced tables
    const relevantColumns = columns.filter(col =>
      referencedTables.has(col.tableName.toLowerCase())
    );

    // Add all columns, but prioritize relevant ones
    const allColumns = relevantColumns.length > 0 ? relevantColumns : columns;

    for (const column of allColumns) {
      const item = new vscode.CompletionItem(
        column.columnName,
        vscode.CompletionItemKind.Field
      );

      item.detail = `${column.dataType} (${column.schema}.${column.tableName})`;
      item.documentation = new vscode.MarkdownString(
        `**Column:** \`${column.columnName}\`\n\n` +
        `**Type:** \`${column.dataType}\`\n\n` +
        `**Table:** \`${column.schema}.${column.tableName}\``
      );

      // Highest priority for columns from referenced tables
      if (referencedTables.has(column.tableName.toLowerCase())) {
        item.sortText = `0-${column.columnName}`;
      } else {
        item.sortText = `2-${column.columnName}`;
      }

      completions.push(item);
    }

    return completions;
  }
}
