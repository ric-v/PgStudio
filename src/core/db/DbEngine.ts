export type DbEngine = 'postgres' | 'mysql' | 'sqlite' | 'mssql' | 'oracle';

export const DEFAULT_DB_ENGINE: DbEngine = 'postgres';

export function resolveDbEngine(engine?: string): DbEngine {
  if (!engine) {
    return DEFAULT_DB_ENGINE;
  }

  const normalized = engine.toLowerCase();
  if (
    normalized === 'postgres' ||
    normalized === 'mysql' ||
    normalized === 'sqlite' ||
    normalized === 'mssql' ||
    normalized === 'oracle'
  ) {
    return normalized;
  }

  return DEFAULT_DB_ENGINE;
}
