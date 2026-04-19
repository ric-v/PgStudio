export const DomainSQL = {
  list: (schema: string) => `
SELECT t.typname AS domain_name,
       n.nspname AS schema_name,
       format_type(t.typbasetype, t.typtypmod) AS base_type,
       t.typnotnull AS not_null,
       pg_get_expr(t.typdefaultbin, 0) AS default_value,
       obj_description(t.oid, 'pg_type') AS description
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typtype = 'd' AND n.nspname = '${schema}'
ORDER BY t.typname
`,

  getDefinition: (schema: string, name: string) => `
SELECT t.typname AS domain_name,
       n.nspname AS schema_name,
       format_type(t.typbasetype, t.typtypmod) AS base_type,
       t.typnotnull AS not_null,
       pg_get_expr(t.typdefaultbin, 0) AS default_value,
       obj_description(t.oid, 'pg_type') AS description,
       c.conname AS constraint_name,
       pg_get_constraintdef(c.oid) AS constraint_def
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
LEFT JOIN pg_constraint c ON c.contypid = t.oid
WHERE t.typtype = 'd' AND n.nspname = '${schema}' AND t.typname = '${name}'
`,

  create: (schema: string) => `-- Create a new domain in schema ${schema}
CREATE DOMAIN "${schema}"."new_domain_name" AS text
  NOT NULL
  DEFAULT 'default_value'
  CONSTRAINT constraint_name CHECK (VALUE ~ '^[A-Za-z0-9]+$');
`,

  drop: (schema: string, name: string) =>
    `DROP DOMAIN IF EXISTS "${schema}"."${name}";`,

  dropCascade: (schema: string, name: string) =>
    `DROP DOMAIN IF EXISTS "${schema}"."${name}" CASCADE;`,
};
