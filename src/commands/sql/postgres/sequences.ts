export const SequenceSQL = {
  list: (schema: string) => `
SELECT sequencename, schemaname,
       start_value, min_value, max_value, increment_by,
       cycle, cache_size, last_value
FROM pg_sequences
WHERE schemaname = '${schema}'
ORDER BY sequencename
`,

  getDefinition: (schema: string, name: string) => `
SELECT s.sequencename, s.schemaname,
       s.start_value, s.min_value, s.max_value, s.increment_by,
       s.cycle, s.cache_size, s.last_value,
       s.sequence_owner,
       pg_size_pretty(pg_total_relation_size(pg_class.oid)) AS size
FROM pg_sequences s
JOIN pg_class ON pg_class.relname = s.sequencename
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
  AND pg_namespace.nspname = s.schemaname
WHERE s.schemaname = '${schema}' AND s.sequencename = '${name}'
`,

  nextValue: (schema: string, name: string) =>
    `SELECT nextval('"${schema}"."${name}"') AS next_value;`,

  currentValue: (schema: string, name: string) =>
    `SELECT last_value, is_called FROM "${schema}"."${name}";`,

  resetValue: (schema: string, name: string, value: number) =>
    `SELECT setval('"${schema}"."${name}"', ${value});`,

  create: (schema: string) => `-- Create a new sequence in schema ${schema}
CREATE SEQUENCE IF NOT EXISTS "${schema}"."new_sequence_name"
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  CACHE 1
  NO CYCLE;
`,

  drop: (schema: string, name: string) =>
    `DROP SEQUENCE IF EXISTS "${schema}"."${name}";`,

  alter: (schema: string, name: string) => `-- Alter sequence ${schema}.${name}
ALTER SEQUENCE "${schema}"."${name}"
  -- INCREMENT BY 1
  -- MINVALUE 1
  -- MAXVALUE 9223372036854775807
  -- START WITH 1
  -- CACHE 1
  -- NO CYCLE
  -- RESTART WITH 1
;
`,
};
