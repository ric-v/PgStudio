import type { ConnectionConfig } from '../../common/types';
import type { DbEngine } from './DbEngine';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number | null;
  command?: string;
  fields?: any[];
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
}

export interface DbPooledClient extends DbClient {
  release(): void;
}

export interface DbSessionClient extends DbClient {
  on(event: string, listener: (...args: any[]) => void): void;
  end(): Promise<void>;
}

export interface PoolMetrics {
  connectionId: string;
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
  createdAt: number;
  lastActivity: number;
}

export interface DbDriver {
  readonly engine: DbEngine;
  getPooledClient(config: ConnectionConfig): Promise<DbPooledClient>;
  getSessionClient(config: ConnectionConfig, sessionId: string): Promise<DbSessionClient>;
  closeSession(config: ConnectionConfig, sessionId: string): Promise<void>;
  closeConnection(config: ConnectionConfig): Promise<void>;
  closeAllConnectionsById(connectionId: string): Promise<void>;
  closeAll(): Promise<void>;
  getPoolMetrics?(key: string): PoolMetrics | undefined;
  getAllPoolMetrics?(): PoolMetrics[];
}
