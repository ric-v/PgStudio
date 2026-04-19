import { ConnectionConfig } from '../common/types';
import { PoolMetrics } from '../core/db/DbDriver';
import { getDriver } from '../core/db/registry';
import type { Client, PoolClient } from 'pg';

const SUPPORTED_ENGINES = ['postgres', 'mysql', 'sqlite', 'mssql', 'oracle'] as const;

export class ConnectionManager {
  private static instance: ConnectionManager;

  private constructor() {}

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  public getPoolMetrics(connectionId: string): PoolMetrics | undefined {
    for (const engine of SUPPORTED_ENGINES) {
      const metrics = getDriver(engine).getPoolMetrics?.(connectionId);
      if (metrics) {
        return metrics;
      }
    }
    return undefined;
  }

  public getAllPoolMetrics(): PoolMetrics[] {
    return SUPPORTED_ENGINES.flatMap((engine) => getDriver(engine).getAllPoolMetrics?.() || []);
  }

  /**
   * Get a pooled client for ephemeral operations.
   * Caller must release() when done.
   */
  public async getPooledClient(config: ConnectionConfig): Promise<PoolClient> {
    const driver = getDriver(config.engine);
    return (await driver.getPooledClient(config)) as unknown as PoolClient;
  }

  /**
   * Get a persistent session client for notebooks and long-running workflows.
   */
  public async getSessionClient(config: ConnectionConfig, sessionId: string): Promise<Client> {
    const driver = getDriver(config.engine);
    return (await driver.getSessionClient(config, sessionId)) as unknown as Client;
  }

  public async closeSession(config: ConnectionConfig, sessionId: string): Promise<void> {
    const driver = getDriver(config.engine);
    await driver.closeSession(config, sessionId);
  }

  /**
   * Close all pools and sessions for a single logical connection config.
   */
  public async closeConnection(config: ConnectionConfig): Promise<void> {
    const driver = getDriver(config.engine);
    await driver.closeConnection(config);
  }

  /**
   * Close all pools/sessions for a connection ID, regardless of selected database.
   */
  public async closeAllConnectionsById(connectionId: string): Promise<void> {
    await Promise.all(SUPPORTED_ENGINES.map((engine) => getDriver(engine).closeAllConnectionsById(connectionId)));
  }

  public async closeAll(): Promise<void> {
    await Promise.all(SUPPORTED_ENGINES.map((engine) => getDriver(engine).closeAll()));
  }
}
