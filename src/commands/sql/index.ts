/**
 * SQL Templates Index
 * Central export file that currently defaults to PostgreSQL templates.
 */

export * from './postgres';

// Engine-scoped namespaces for incremental multi-database rollout.
export * as PostgresSQL from './postgres';

