import type { DbDialect } from './DbDialect';
import type { DbDriver } from './DbDriver';
import type { DbEngine } from './DbEngine';
import { resolveDbEngine } from './DbEngine';

import { PostgresDriver } from './drivers/postgres/PostgresDriver';
import { PostgresDialect } from './dialects/postgres/PostgresDialect';
import { UnsupportedDriver } from './drivers/UnsupportedDriver';
import { MySqlDialect } from './dialects/mysql/MySqlDialect';
import { SqliteDialect } from './dialects/sqlite/SqliteDialect';
import { MySqlDriver } from './drivers/mysql/MySqlDriver';
import { MssqlDialect } from './dialects/mssql/MssqlDialect';
import { OracleDialect } from './dialects/oracle/OracleDialect';
import { SqliteDriver } from './drivers/sqlite/SqliteDriver';

const postgresDriver = new PostgresDriver();
const mysqlDriver = new MySqlDriver();
const sqliteDriver = new SqliteDriver();
const mssqlDriver = new UnsupportedDriver('mssql');
const oracleDriver = new UnsupportedDriver('oracle');

const drivers: Record<DbEngine, DbDriver> = {
  postgres: postgresDriver,
  mysql: mysqlDriver,
  sqlite: sqliteDriver,
  mssql: mssqlDriver,
  oracle: oracleDriver,
};

const dialects: Record<DbEngine, DbDialect> = {
  postgres: PostgresDialect,
  mysql: MySqlDialect,
  sqlite: SqliteDialect,
  mssql: MssqlDialect,
  oracle: OracleDialect,
};

export function getDriver(engine?: DbEngine | string): DbDriver {
  return drivers[resolveDbEngine(engine)];
}

export function getDialect(engine?: DbEngine | string): DbDialect {
  return dialects[resolveDbEngine(engine)];
}
