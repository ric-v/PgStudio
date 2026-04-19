export const TablespaceSQL = {
  list: () => `
SELECT spcname AS tablespace_name,
       pg_catalog.pg_get_userbyid(spcowner) AS owner,
       pg_catalog.pg_tablespace_location(oid) AS location,
       pg_size_pretty(pg_tablespace_size(spcname)) AS size,
       spcoptions AS options
FROM pg_tablespace
ORDER BY spcname
`,

  getDefinition: (name: string) => `
SELECT spcname AS tablespace_name,
       pg_catalog.pg_get_userbyid(spcowner) AS owner,
       pg_catalog.pg_tablespace_location(oid) AS location,
       pg_size_pretty(pg_tablespace_size(spcname)) AS size,
       pg_tablespace_size(spcname) AS size_bytes,
       spcoptions AS options,
       obj_description(oid, 'pg_tablespace') AS description
FROM pg_tablespace
WHERE spcname = '${name}'
`,

  listObjects: (name: string) => `
-- Objects stored in tablespace ${name}
SELECT nspname AS schema,
       relname AS object_name,
       CASE relkind
         WHEN 'r' THEN 'Table'
         WHEN 'i' THEN 'Index'
         WHEN 'm' THEN 'Materialized View'
         ELSE relkind::text
       END AS object_type
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_tablespace t ON c.reltablespace = t.oid
WHERE t.spcname = '${name}'
ORDER BY schema, object_type, object_name
`,

  create: (name: string, location: string) =>
    `CREATE TABLESPACE "${name}" LOCATION '${location}';`,

  drop: (name: string) =>
    `DROP TABLESPACE IF EXISTS "${name}";`,

  moveTo: (schema: string, table: string, tablespaceName: string) =>
    `ALTER TABLE "${schema}"."${table}" SET TABLESPACE "${tablespaceName}";`,
};
