import { Client, Pool, PoolClient, ClientConfig, PoolConfig } from 'pg';
import * as vscode from 'vscode';
import * as fs from 'fs';

import type { ConnectionConfig } from '../../../../common/types';
import type { DbDriver, DbPooledClient, DbSessionClient, PoolMetrics } from '../../DbDriver';
import { SecretStorageService } from '../../../../services/SecretStorageService';
import { SSHService } from '../../../../services/SSHService';
import { ErrorService } from '../../../../services/ErrorService';
import { resolvePgPassPassword, pgPassFileDescription } from '../../../../utils/pgPassUtils';

export class PostgresDriver implements DbDriver {
  public readonly engine = 'postgres' as const;

  private pools: Map<string, Pool> = new Map();
  private sessions: Map<string, Client> = new Map();
  private poolMetrics: Map<string, PoolMetrics> = new Map();
  private sslUnsupportedTargets: Set<string> = new Set();

  private readonly IDLE_TIMEOUT = 300000;
  private readonly CLEANUP_INTERVAL = 60000;
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanupRoutine();
  }

  public getPoolMetrics(connectionId: string): PoolMetrics | undefined {
    return this.poolMetrics.get(connectionId);
  }

  public getAllPoolMetrics(): PoolMetrics[] {
    return Array.from(this.poolMetrics.values());
  }

  private startCleanupRoutine(): void {
    this.cleanupTimer = setInterval(() => {
      void this.cleanupIdlePools();
    }, this.CLEANUP_INTERVAL);
    this.cleanupTimer?.unref();
  }

  private async cleanupIdlePools(): Promise<void> {
    const now = Date.now();
    const poolsToClose: string[] = [];

    for (const [key, metrics] of this.poolMetrics.entries()) {
      if (now - metrics.lastActivity > this.IDLE_TIMEOUT && metrics.totalConnections === 0) {
        poolsToClose.push(key);
      }
    }

    for (const key of poolsToClose) {
      const pool = this.pools.get(key);
      if (!pool) {
        continue;
      }
      try {
        await pool.end();
        this.pools.delete(key);
        this.poolMetrics.delete(key);
      } catch (err) {
        console.error(`Error closing idle pool ${key}:`, err);
      }
    }
  }

  public async getPooledClient(config: ConnectionConfig): Promise<DbPooledClient> {
    const key = this.getConnectionKey(config);
    let pool = this.pools.get(key);

    if (!pool) {
      const clientConfig = await this.createClientConfig(config);
      pool = this.createPool(clientConfig, key);
      this.pools.set(key, pool);
    }

    try {
      const client = await pool.connect();
      await this.applyReadOnlyMode(client, config);
      return client as unknown as DbPooledClient;
    } catch (err: any) {
      if (!this.shouldFallback(config, err)) {
        throw err;
      }

      this.markSslUnsupported(config);
      console.info(`[PostgresDriver] SSL unavailable for ${key}; retrying without SSL (${this.formatErrorMessage(err)})`);

      this.pools.delete(key);
      try {
        await pool.end();
      } catch (e) {
        console.error(`Error closing failed SSL pool for ${key}:`, e);
      }

      const clientConfig = await this.createClientConfig(config, true);
      pool = this.createPool(clientConfig, key);
      this.pools.set(key, pool);

      const client = await pool.connect();
      await this.applyReadOnlyMode(client, config);
      return client as unknown as DbPooledClient;
    }
  }

  public async getSessionClient(config: ConnectionConfig, sessionId: string): Promise<DbSessionClient> {
    const key = `${this.getConnectionKey(config)}:session:${sessionId}`;
    if (this.sessions.has(key)) {
      return this.sessions.get(key)! as unknown as DbSessionClient;
    }

    const clientConfig = await this.createClientConfig(config);
    let client = new Client(clientConfig);

    try {
      await client.connect();
      await this.applyReadOnlyMode(client, config);
    } catch (err: any) {
      if (!this.shouldFallback(config, err)) {
        throw err;
      }

      this.markSslUnsupported(config);
      console.info(`[PostgresDriver] Session SSL unavailable for ${key}; retrying without SSL (${this.formatErrorMessage(err)})`);
      const nonSSLConfig = await this.createClientConfig(config, true);
      client = new Client(nonSSLConfig);
      await client.connect();
      await this.applyReadOnlyMode(client, config);
    }

    client.on('end', () => this.sessions.delete(key));
    client.on('error', (err) => {
      console.error(`Session client error for ${key}`, err);
      ErrorService.getInstance().showError(`Session connection error (${config.name}): ${err.message}`);
      this.sessions.delete(key);
    });

    this.sessions.set(key, client);
    return client as unknown as DbSessionClient;
  }

  public async closeSession(config: ConnectionConfig, sessionId: string): Promise<void> {
    const key = `${this.getConnectionKey(config)}:session:${sessionId}`;
    const client = this.sessions.get(key);
    if (!client) {
      return;
    }

    try {
      await client.end();
    } catch (e) {
      console.error(`Error closing session ${key}:`, e);
    }
    this.sessions.delete(key);
  }

  public async closeConnection(config: ConnectionConfig): Promise<void> {
    const baseKey = this.getConnectionKey(config);
    const pool = this.pools.get(baseKey);
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        console.error(`Error closing pool ${baseKey}`, e);
      }
      this.pools.delete(baseKey);
    }

    for (const [key, client] of this.sessions.entries()) {
      if (!key.startsWith(baseKey)) {
        continue;
      }

      try {
        await client.end();
      } catch (e) {
        console.error(`Error closing session ${key}`, e);
      }
      this.sessions.delete(key);
    }
  }

  public async closeAllConnectionsById(connectionId: string): Promise<void> {
    const poolKeysToRemove: string[] = [];
    for (const key of this.pools.keys()) {
      if (key.startsWith(`${connectionId}:`)) {
        poolKeysToRemove.push(key);
      }
    }

    for (const key of poolKeysToRemove) {
      const pool = this.pools.get(key);
      if (!pool) {
        continue;
      }
      await pool.end().catch((e) => console.error(`Error ending pool ${key}`, e));
      this.pools.delete(key);
    }

    const sessionKeysToRemove: string[] = [];
    for (const key of this.sessions.keys()) {
      if (key.startsWith(`${connectionId}:`)) {
        sessionKeysToRemove.push(key);
      }
    }

    for (const key of sessionKeysToRemove) {
      const client = this.sessions.get(key);
      if (!client) {
        continue;
      }
      await client.end().catch((e) => console.error(`Error ending session ${key}`, e));
      this.sessions.delete(key);
    }

    console.log(`Closed resources for ID: ${connectionId}`);
  }

  public async closeAll(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.end().catch((e) => console.error('Error closing pool', e));
    }
    this.pools.clear();

    for (const client of this.sessions.values()) {
      await client.end().catch((e) => console.error('Error closing session', e));
    }
    this.sessions.clear();
  }

  private async applyReadOnlyMode(client: { query: (sql: string) => Promise<any> }, config: ConnectionConfig): Promise<void> {
    if (!config.readOnlyMode) {
      return;
    }

    try {
      await client.query('SET default_transaction_read_only = ON');
    } catch (err) {
      console.warn('Failed to set read-only mode:', err);
    }
  }

  private isSSLFailure(err: any): boolean {
    if (!err) {
      return false;
    }

    const msg = (err.message || '').toString().toLowerCase();
    return msg.includes('server does not support ssl') || err.code === 'ECONNRESET' || err.code === 'EPROTO';
  }

  private shouldFallback(config: ConnectionConfig, err: any): boolean {
    const sslMode = config.sslmode || 'prefer';
    if (sslMode !== 'prefer' && sslMode !== 'allow') {
      return false;
    }
    return this.isSSLFailure(err);
  }

  private formatErrorMessage(err: any): string {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    if (typeof err?.message === 'string' && err.message.length > 0) {
      return err.message;
    }
    return String(err);
  }

  private getSslCapabilityKey(config: ConnectionConfig): string {
    return `${config.host || 'localhost'}:${config.port || 5432}`;
  }

  private isSslKnownUnsupported(config: ConnectionConfig): boolean {
    return this.sslUnsupportedTargets.has(this.getSslCapabilityKey(config));
  }

  private markSslUnsupported(config: ConnectionConfig): void {
    this.sslUnsupportedTargets.add(this.getSslCapabilityKey(config));
  }

  private createPool(clientConfig: ClientConfig, key: string): Pool {
    const poolConfig: PoolConfig = {
      ...clientConfig,
      max: 10,
      idleTimeoutMillis: 30000,
    };

    const pool = new Pool(poolConfig);
    pool.on('error', (err) => {
      console.error(`Pool error for ${key}`, err);
    });

    this.poolMetrics.set(key, {
      connectionId: key.split(':')[0],
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });

    return pool;
  }

  private getConnectionKey(config: ConnectionConfig): string {
    return `${config.id}:${config.database || 'postgres'}`;
  }

  private async createClientConfig(config: ConnectionConfig, forceDisableSSL: boolean = false): Promise<ClientConfig> {
    let password: string | undefined;

    if (config.username && config.id) {
      password = await SecretStorageService.getInstance().getPassword(config.id);
    }

    if (!password && (config as any).password) {
      password = (config as any).password;
    }

    if (!password && config.username) {
      const targetDb = config.database || 'postgres';
      const pgpassPwd = resolvePgPassPassword(config.host, config.port, targetDb, config.username);
      if (pgpassPwd !== undefined) {
        password = pgpassPwd;
        console.log(`[ConnectionManager] Password resolved from .pgpass for ${config.username}@${config.host}:${config.port}/${targetDb}`);
      } else if (targetDb !== 'postgres') {
        const fallback = resolvePgPassPassword(config.host, config.port, 'postgres', config.username);
        if (fallback !== undefined) {
          password = fallback;
          console.log(`[ConnectionManager] Password resolved from .pgpass (postgres fallback) for ${config.username}@${config.host}:${config.port}`);
        }
      }

      if (!password) {
        console.log(`[ConnectionManager] No password found in SecretStorage or .pgpass for ${config.username}@${config.host}. Expected: ${pgPassFileDescription()}`);
      }
    }

    let sslConfig: boolean | any = false;
    const sslMode = config.sslmode || 'prefer';
    const shouldDisableSsl = forceDisableSSL || ((sslMode === 'prefer' || sslMode === 'allow') && this.isSslKnownUnsupported(config));

    if (!shouldDisableSsl && sslMode !== 'disable') {
      sslConfig = {
        rejectUnauthorized: sslMode === 'verify-ca' || sslMode === 'verify-full',
      };

      if (config.sslRootCertPath) {
        try {
          sslConfig.ca = fs.readFileSync(config.sslRootCertPath).toString();
        } catch (e) {
          console.warn('Failed to read SSL CA:', e);
        }
      }
      if (config.sslCertPath) {
        try {
          sslConfig.cert = fs.readFileSync(config.sslCertPath).toString();
        } catch (e) {
          console.warn('Failed to read SSL Cert:', e);
        }
      }
      if (config.sslKeyPath) {
        try {
          sslConfig.key = fs.readFileSync(config.sslKeyPath).toString();
        } catch (e) {
          console.warn('Failed to read SSL Key:', e);
        }
      }
    }

    const clientConfig: ClientConfig = {
      user: config.username || undefined,
      password: password || undefined,
      database: config.database || 'postgres',
      connectionTimeoutMillis: (config.connectTimeout || 15) * 1000,
      statement_timeout: config.statementTimeout || vscode.workspace.getConfiguration('postgresExplorer').get<number>('queryTimeout') || undefined,
      application_name: config.applicationName || 'PgStudio',
      ssl: sslConfig || undefined,
      ...(config.options ? { options: config.options } : {}),
    };

    if (config.ssh && config.ssh.enabled) {
      try {
        const stream = await SSHService.getInstance().createStream(config.ssh, config.host, config.port);
        clientConfig.stream = stream as any;
      } catch (err: any) {
        ErrorService.getInstance().showError(`SSH Connection failed: ${err.message}`);
        throw new Error(`SSH Connection failed: ${err.message}`);
      }
    } else {
      clientConfig.host = config.host;
      clientConfig.port = config.port;
    }

    return clientConfig;
  }
}
