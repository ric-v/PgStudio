import type { FeatureFlags } from './capabilities';
import type { DbEngine } from './DbEngine';
import type { IntrospectionProvider } from './introspection/IntrospectionProvider';

export interface DbDialect {
  readonly engine: DbEngine;
  readonly capabilities: FeatureFlags;
  readonly introspect: IntrospectionProvider;
  readonly sql?: Record<string, unknown>;
  identifier(name: string): string;
  limitClause(n: number): string;
  explain(sql: string): string;
  buildSystemPromptAddendum?(): string;
}
