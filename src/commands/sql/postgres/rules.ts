export const RuleSQL = {
  list: (schema: string, table: string) => `
SELECT rulename AS rule_name,
       tablename AS table_name,
       schemaname AS schema_name,
       CASE rulecmd
         WHEN 1 THEN 'SELECT'
         WHEN 2 THEN 'UPDATE'
         WHEN 3 THEN 'INSERT'
         WHEN 4 THEN 'DELETE'
         ELSE rulecmd::text
       END AS command,
       ev_enabled AS status,
       pg_get_ruledef(oid, true) AS definition
FROM pg_rules
WHERE schemaname = '${schema}' AND tablename = '${table}'
ORDER BY rulename
`,

  listBySchema: (schema: string) => `
SELECT rulename AS rule_name,
       tablename AS table_name,
       schemaname AS schema_name,
       CASE rulecmd
         WHEN 1 THEN 'SELECT'
         WHEN 2 THEN 'UPDATE'
         WHEN 3 THEN 'INSERT'
         WHEN 4 THEN 'DELETE'
         ELSE rulecmd::text
       END AS command,
       pg_get_ruledef(oid, true) AS definition
FROM pg_rules
WHERE schemaname = '${schema}'
ORDER BY tablename, rulename
`,

  getDefinition: (schema: string, table: string, name: string) => `
SELECT pg_get_ruledef(r.oid, true) AS definition,
       r.rulename AS rule_name,
       c.relname AS table_name,
       n.nspname AS schema_name,
       CASE r.ev_type
         WHEN '1' THEN 'SELECT'
         WHEN '2' THEN 'UPDATE'
         WHEN '3' THEN 'INSERT'
         WHEN '4' THEN 'DELETE'
         ELSE r.ev_type::text
       END AS command,
       r.is_instead AS is_instead
FROM pg_rewrite r
JOIN pg_class c ON r.ev_class = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = '${schema}' AND c.relname = '${table}' AND r.rulename = '${name}'
`,

  drop: (schema: string, table: string, name: string) =>
    `DROP RULE IF EXISTS "${name}" ON "${schema}"."${table}";`,

  dropCascade: (schema: string, table: string, name: string) =>
    `DROP RULE IF EXISTS "${name}" ON "${schema}"."${table}" CASCADE;`,
};
