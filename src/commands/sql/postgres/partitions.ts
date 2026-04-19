export const PartitionSQL = {
  list: (schema: string, table: string) => `
SELECT c.relname AS partition_name,
       n.nspname AS partition_schema,
       pg_get_expr(c.relpartbound, c.oid, true) AS partition_bound,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
       c.reltuples::bigint AS estimated_rows
FROM pg_inherits i
JOIN pg_class c ON i.inhrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_class p ON i.inhparent = p.oid
JOIN pg_namespace pn ON p.relnamespace = pn.oid
WHERE pn.nspname = '${schema}' AND p.relname = '${table}'
ORDER BY c.relname
`,

  isPartitioned: (schema: string, table: string) => `
SELECT c.relkind = 'p' AS is_partitioned,
       pg_get_partkeydef(c.oid) AS partition_key
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = '${schema}' AND c.relname = '${table}'
`,

  attach: (schema: string, table: string, partitionSchema: string, partitionName: string, partitionBound: string) =>
    `ALTER TABLE "${schema}"."${table}" ATTACH PARTITION "${partitionSchema}"."${partitionName}" ${partitionBound};`,

  detach: (schema: string, table: string, partitionName: string) =>
    `ALTER TABLE "${schema}"."${table}" DETACH PARTITION "${partitionName}";`,

  createRangePartition: (schema: string, table: string) => `-- Create a new range partition on ${schema}.${table}
CREATE TABLE "${schema}"."partition_name" PARTITION OF "${schema}"."${table}"
  FOR VALUES FROM ('start_value') TO ('end_value');
`,

  createListPartition: (schema: string, table: string) => `-- Create a new list partition on ${schema}.${table}
CREATE TABLE "${schema}"."partition_name" PARTITION OF "${schema}"."${table}"
  FOR VALUES IN ('value1', 'value2');
`,
};
