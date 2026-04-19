import type { ConnectionConfig } from '../../../common/types';
import type { DbDriver, DbPooledClient, DbSessionClient } from '../DbDriver';
import type { DbEngine } from '../DbEngine';

export class UnsupportedDriver implements DbDriver {
  constructor(public readonly engine: DbEngine) {}

  public async getPooledClient(_config: ConnectionConfig): Promise<DbPooledClient> {
    throw new Error(`Engine '${this.engine}' is not enabled yet. PostgreSQL is currently supported.`);
  }

  public async getSessionClient(_config: ConnectionConfig, _sessionId: string): Promise<DbSessionClient> {
    throw new Error(`Engine '${this.engine}' is not enabled yet. PostgreSQL is currently supported.`);
  }

  public async closeSession(_config: ConnectionConfig, _sessionId: string): Promise<void> {
    return;
  }

  public async closeConnection(_config: ConnectionConfig): Promise<void> {
    return;
  }

  public async closeAllConnectionsById(_connectionId: string): Promise<void> {
    return;
  }

  public async closeAll(): Promise<void> {
    return;
  }
}
