import { expect } from 'chai';

import { DEFAULT_DB_ENGINE, resolveDbEngine } from '../../core/db/DbEngine';
import { getDialect, getDriver } from '../../core/db/registry';
import { UnsupportedDriver } from '../../core/db/drivers/UnsupportedDriver';

describe('core db registry and dialects', () => {
  it('resolves supported engines and falls back to postgres', () => {
    expect(DEFAULT_DB_ENGINE).to.equal('postgres');
    expect(resolveDbEngine()).to.equal('postgres');
    expect(resolveDbEngine('POSTGRES')).to.equal('postgres');
    expect(resolveDbEngine('mysql')).to.equal('mysql');
    expect(resolveDbEngine('sqlite')).to.equal('sqlite');
    expect(resolveDbEngine('mssql')).to.equal('mssql');
    expect(resolveDbEngine('oracle')).to.equal('oracle');
    expect(resolveDbEngine('unknown-engine')).to.equal('postgres');
  });

  it('returns the expected dialect behavior for postgres, mysql, and sqlite', () => {
    const postgres = getDialect('postgres');
    const mysql = getDialect('mysql');
    const sqlite = getDialect('sqlite');
    const mssql = getDialect('mssql');
    const oracle = getDialect('oracle');

    expect(postgres.engine).to.equal('postgres');
    expect(postgres.identifier('user name')).to.equal('"user name"');
    expect(postgres.limitClause(25)).to.equal('LIMIT 25');
    expect(postgres.explain('SELECT 1')).to.contain('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)');
    expect(postgres.introspect.listSchemas?.()).to.contain('information_schema.schemata');
    expect(postgres.introspect.listTables?.('public')).to.contain("table_schema = 'public'");
    expect(postgres.buildSystemPromptAddendum?.()).to.contain('PostgreSQL');

    expect(mysql.engine).to.equal('mysql');
    expect(mysql.identifier('user name')).to.equal('`user name`');
    expect(mysql.limitClause(0)).to.equal('LIMIT 1');
    expect(mysql.explain('SELECT 1')).to.contain('EXPLAIN FORMAT=JSON');
    expect(mysql.introspect.listSchemas?.()).to.equal('SHOW DATABASES;');
    expect(mysql.introspect.listTables?.('appdb')).to.equal('SHOW TABLES FROM `appdb`;');
    expect(mysql.buildSystemPromptAddendum?.()).to.contain('MySQL');

    expect(sqlite.engine).to.equal('sqlite');
    expect(sqlite.identifier('user name')).to.equal('"user name"');
    expect(sqlite.limitClause(5)).to.equal('LIMIT 5');
    expect(sqlite.explain('SELECT 1')).to.contain('EXPLAIN QUERY PLAN');
    expect(sqlite.introspect.listTables?.()).to.contain("sqlite_master");
    expect(sqlite.buildSystemPromptAddendum?.()).to.contain('SQLite');

    expect(mssql.engine).to.equal('mssql');
    expect(mssql.identifier('user name')).to.equal('[user name]');
    expect(mssql.limitClause(5)).to.equal('OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY');
    expect(mssql.explain('SELECT 1')).to.contain('SHOWPLAN_XML');
    expect(mssql.introspect.listSchemas?.()).to.contain('sys.schemas');
    expect(mssql.buildSystemPromptAddendum?.()).to.contain('SQL Server');

    expect(oracle.engine).to.equal('oracle');
    expect(oracle.identifier('User Name')).to.equal('"User Name"');
    expect(oracle.limitClause(3)).to.equal('FETCH FIRST 3 ROWS ONLY');
    expect(oracle.explain('SELECT 1 FROM dual')).to.contain('EXPLAIN PLAN FOR');
    expect(oracle.introspect.listSchemas?.()).to.contain('all_users');
    expect(oracle.buildSystemPromptAddendum?.()).to.contain('Oracle Database');
  });

  it('routes drivers by engine and leaves unsupported engines disabled', async () => {
    expect(getDriver('postgres').engine).to.equal('postgres');
    expect(getDriver('mysql').engine).to.equal('mysql');
    expect(getDriver('sqlite').engine).to.equal('sqlite');
    expect(getDriver('mssql').engine).to.equal('mssql');
    expect(getDriver('oracle').engine).to.equal('oracle');

    const unsupported = getDriver('mssql');
    expect(unsupported).to.be.instanceOf(UnsupportedDriver);
    try {
      await unsupported.getPooledClient({ id: 'x', host: 'localhost', port: 1433 } as any);
      expect.fail('Expected unsupported driver to throw');
    } catch (error: any) {
      expect(String(error?.message ?? error)).to.contain("Engine 'mssql' is not enabled yet");
    }
  });

  it('runs sqlite queries through the runtime sqlite driver', async () => {
    const sqliteDriver = getDriver('sqlite');
    const sqliteConnection = {
      id: 'sqlite-unit',
      engine: 'sqlite' as const,
      host: ':memory:',
      port: 0,
      database: ':memory:',
      username: 'ignored',
    };

    const client = await sqliteDriver.getPooledClient(sqliteConnection as any);
    await client.query('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
    await client.query('INSERT INTO users(name) VALUES (?)', ['alice']);

    const result = await client.query<{ name: string }>('SELECT name FROM users LIMIT 1');
    expect(result.rows).to.have.lengthOf(1);
    expect(result.rows[0].name).to.equal('alice');

    client.release();
    await sqliteDriver.closeConnection(sqliteConnection as any);
  });
});
