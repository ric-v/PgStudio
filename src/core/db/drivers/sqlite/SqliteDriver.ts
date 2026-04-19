import Database from 'better-sqlite3';

import type { ConnectionConfig } from '../../../../common/types';
import type { DbDriver, DbPooledClient, DbSessionClient, QueryResult } from '../../DbDriver';

function resolveSqlitePath(config: ConnectionConfig): string {
  if (config.database && config.database !== 'postgres') {
    return config.database;
  }

  if (config.host && config.host !== 'localhost') {
    return config.host;
  }

  return ':memory:';
}

function normalizePositionalParameters(sql: string): string {
  if (!/\$\d+/.test(sql)) {
    return sql;
  }

  return sql.replace(/\$\d+/g, '?');
}

class SqlitePooledClient implements DbPooledClient {
  constructor(private readonly db: Database.Database) {}

  public async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const normalizedSql = normalizePositionalParameters(sql);
    const statement = this.db.prepare(normalizedSql);
    const args = params || [];

    if (statement.reader) {
      const rows = statement.all(...args) as T[];
      return { rows, rowCount: rows.length };
    }

    const result = statement.run(...args);
    return {
      rows: [],
      rowCount: typeof result.changes === 'number' ? result.changes : 0,
      command: normalizedSql.trim().split(/\s+/)[0]?.toUpperCase(),
    };
  }

  public release(): void {
    return;
  }
}

class SqliteSessionClient implements DbSessionClient {
  constructor(private readonly db: Database.Database) {}

  public async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const pooled = new SqlitePooledClient(this.db);
    return pooled.query<T>(sql, params);
  }

  public on(_event: string, _listener: (...args: any[]) => void): void {
    return;
  }

  public async end(): Promise<void> {
    return;
  }
}

export class SqliteDriver implements DbDriver {
  public readonly engine = 'sqlite' as const;

  private dbByConnectionKey: Map<string, Database.Database> = new Map();

  public async getPooledClient(config: ConnectionConfig): Promise<DbPooledClient> {
    const db = this.getOrCreateDatabase(config);
    return new SqlitePooledClient(db);
  }

  public async getSessionClient(config: ConnectionConfig, _sessionId: string): Promise<DbSessionClient> {
    const db = this.getOrCreateDatabase(config);
    return new SqliteSessionClient(db);
  }

  public async closeSession(_config: ConnectionConfig, _sessionId: string): Promise<void> {
    return;
  }

  public async closeConnection(config: ConnectionConfig): Promise<void> {
    const key = this.getConnectionKey(config);
    const db = this.dbByConnectionKey.get(key);
    if (!db) {
      return;
    }

    db.close();
    this.dbByConnectionKey.delete(key);
  }

  public async closeAllConnectionsById(connectionId: string): Promise<void> {
    for (const [key, db] of this.dbByConnectionKey.entries()) {
      if (!key.startsWith(`${connectionId}:`)) {
        continue;
      }

      db.close();
      this.dbByConnectionKey.delete(key);
    }
  }

  public async closeAll(): Promise<void> {
    for (const db of this.dbByConnectionKey.values()) {
      db.close();
    }
    this.dbByConnectionKey.clear();
  }

  private getOrCreateDatabase(config: ConnectionConfig): Database.Database {
    const key = this.getConnectionKey(config);
    const existing = this.dbByConnectionKey.get(key);
    if (existing) {
      return existing;
    }

    const db = new Database(resolveSqlitePath(config));
    this.dbByConnectionKey.set(key, db);
    return db;
  }

  private getConnectionKey(config: ConnectionConfig): string {
    const path = resolveSqlitePath(config);
    return `${config.id}:${path}`;
  }
}