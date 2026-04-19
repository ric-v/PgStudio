import mysql, { Pool, PoolConnection, PoolOptions } from 'mysql2/promise';
import * as vscode from 'vscode';

import type { ConnectionConfig } from '../../../../common/types';
import type { DbDriver, DbPooledClient, DbSessionClient, PoolMetrics } from '../../DbDriver';
import { SecretStorageService } from '../../../../services/SecretStorageService';
import { SSHService } from '../../../../services/SSHService';

function toMysqlSqlMode(connection: ConnectionConfig): string[] | undefined {
  if (!connection.readOnlyMode) {
    return undefined;
  }
  return ['STRICT_TRANS_TABLES', 'NO_ENGINE_SUBSTITUTION'];
}

class MySqlPooledClient implements DbPooledClient {
  constructor(private readonly connection: PoolConnection) {}

  async query<T = any>(sql: string, params?: any[]): Promise<any> {
    if (params && params.length > 0) {
      const [rows, fields] = await this.connection.query(sql, params);
      return { rows: rows as T[], fields: fields as any[] };
    }
    const [rows, fields] = await this.connection.query(sql);
    return { rows: rows as T[], fields: fields as any[] };
  }

  release(): void {
    this.connection.release();
  }
}

class MySqlSessionClient implements DbSessionClient {
  constructor(private readonly connection: PoolConnection) {}

  async query<T = any>(sql: string, params?: any[]): Promise<any> {
    if (params && params.length > 0) {
      const [rows, fields] = await this.connection.query(sql, params);
      return { rows: rows as T[], fields: fields as any[] };
    }
    const [rows, fields] = await this.connection.query(sql);
    return { rows: rows as T[], fields: fields as any[] };
  }

  on(event: string, listener: (...args: any[]) => void): void {
    (this.connection as any).on(event, listener);
  }

  async end(): Promise<void> {
    await this.connection.end();
  }
}

export class MySqlDriver implements DbDriver {
  public readonly engine = 'mysql' as const;
  private pools: Map<string, Pool> = new Map();
  private sessions: Map<string, PoolConnection> = new Map();

  public getPoolMetrics(_connectionId: string): PoolMetrics | undefined {
    return undefined;
  }

  public getAllPoolMetrics(): PoolMetrics[] {
    return [];
  }

  public async getPooledClient(config: ConnectionConfig): Promise<DbPooledClient> {
    const key = this.getConnectionKey(config);
    let pool = this.pools.get(key);
    if (!pool) {
      pool = await this.createPool(config);
      this.pools.set(key, pool);
    }

    const connection = await pool.getConnection();
    return new MySqlPooledClient(connection);
  }

  public async getSessionClient(config: ConnectionConfig, sessionId: string): Promise<DbSessionClient> {
    const key = `${this.getConnectionKey(config)}:session:${sessionId}`;
    const existing = this.sessions.get(key);
    if (existing) {
      return new MySqlSessionClient(existing);
    }

    const pool = await this.getPool(config);
    const connection = await pool.getConnection();
    this.sessions.set(key, connection);
    connection.on('end', () => this.sessions.delete(key));
    connection.on('error', () => this.sessions.delete(key));
    return new MySqlSessionClient(connection);
  }

  public async closeSession(config: ConnectionConfig, sessionId: string): Promise<void> {
    const key = `${this.getConnectionKey(config)}:session:${sessionId}`;
    const connection = this.sessions.get(key);
    if (!connection) {
      return;
    }
    this.sessions.delete(key);
    await connection.end();
  }

  public async closeConnection(config: ConnectionConfig): Promise<void> {
    const key = this.getConnectionKey(config);
    const pool = this.pools.get(key);
    if (pool) {
      await pool.end();
      this.pools.delete(key);
    }

    for (const [sessionKey, connection] of this.sessions.entries()) {
      if (sessionKey.startsWith(key)) {
        await connection.end();
        this.sessions.delete(sessionKey);
      }
    }
  }

  public async closeAllConnectionsById(connectionId: string): Promise<void> {
    for (const key of Array.from(this.pools.keys())) {
      if (key.startsWith(`${connectionId}:`)) {
        await this.pools.get(key)?.end();
        this.pools.delete(key);
      }
    }

    for (const key of Array.from(this.sessions.keys())) {
      if (key.startsWith(`${connectionId}:`)) {
        await this.sessions.get(key)?.end();
        this.sessions.delete(key);
      }
    }
  }

  public async closeAll(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.end();
    }
    this.pools.clear();

    for (const connection of this.sessions.values()) {
      await connection.end();
    }
    this.sessions.clear();
  }

  private async getPool(config: ConnectionConfig): Promise<Pool> {
    const key = this.getConnectionKey(config);
    const existing = this.pools.get(key);
    if (existing) {
      return existing;
    }
    const pool = await this.createPool(config);
    this.pools.set(key, pool);
    return pool;
  }

  private async createPool(config: ConnectionConfig): Promise<Pool> {
    const password = await this.resolvePassword(config);
    const poolOptions: PoolOptions = {
      host: config.host,
      port: config.port,
      user: config.username,
      password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      namedPlaceholders: true,
      connectTimeout: (config.connectTimeout || 15) * 1000,
      ssl: config.sslmode === 'disable' ? undefined : this.buildSslOptions(config),
      timezone: 'Z',
      decimalNumbers: true,
      multipleStatements: false,
      ...(toMysqlSqlMode(config) ? { sqlMode: toMysqlSqlMode(config) } : {}),
    };

    if (config.ssh?.enabled) {
      const stream = await SSHService.getInstance().createStream(config.ssh, config.host, config.port);
      poolOptions.stream = stream as any;
    }

    return mysql.createPool(poolOptions);
  }

  private async resolvePassword(config: ConnectionConfig): Promise<string | undefined> {
    if (config.id) {
      const stored = await SecretStorageService.getInstance().getPassword(config.id);
      if (stored) {
        return stored;
      }
    }
    return (config as any).password || undefined;
  }

  private buildSslOptions(config: ConnectionConfig): any {
    if (config.sslmode === 'disable') {
      return undefined;
    }

    const ssl: any = {};
    if (config.sslRootCertPath) {
      ssl.ca = require('fs').readFileSync(config.sslRootCertPath);
    }
    if (config.sslCertPath) {
      ssl.cert = require('fs').readFileSync(config.sslCertPath);
    }
    if (config.sslKeyPath) {
      ssl.key = require('fs').readFileSync(config.sslKeyPath);
    }
    if (config.sslmode === 'verify-ca' || config.sslmode === 'verify-full') {
      ssl.rejectUnauthorized = true;
    }
    return ssl;
  }

  private getConnectionKey(config: ConnectionConfig): string {
    return `${config.id}:${config.database || 'default'}`;
  }
}
