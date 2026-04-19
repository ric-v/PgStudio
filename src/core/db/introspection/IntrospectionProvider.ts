export interface IntrospectionProvider {
  listSchemas?(): string;
  listTables?(schema?: string): string;
  listColumns?(schema: string, table: string): string;
  listIndexes?(schema: string, table: string): string;
  listForeignKeys?(schema: string, table: string): string;
  search?(term: string): string;
}
