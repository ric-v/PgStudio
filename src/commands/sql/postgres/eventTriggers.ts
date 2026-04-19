export const EventTriggerSQL = {
  list: () => `
SELECT evtname AS trigger_name,
       evtevent AS event,
       evtowner::regrole AS owner,
       evtfoid::regproc AS function_name,
       CASE evtenabled
         WHEN 'O' THEN 'ENABLED'
         WHEN 'D' THEN 'DISABLED'
         WHEN 'R' THEN 'REPLICA ONLY'
         WHEN 'A' THEN 'ALWAYS'
         ELSE evtenabled::text
       END AS status,
       obj_description(oid, 'pg_event_trigger') AS description
FROM pg_event_trigger
ORDER BY evtname
`,

  getDefinition: (name: string) => `
SELECT evtname AS trigger_name,
       evtevent AS event,
       evtowner::regrole AS owner,
       evtfoid::regproc AS function_name,
       pg_get_functiondef(evtfoid) AS function_definition,
       CASE evtenabled
         WHEN 'O' THEN 'ENABLED'
         WHEN 'D' THEN 'DISABLED'
         WHEN 'R' THEN 'REPLICA ONLY'
         WHEN 'A' THEN 'ALWAYS'
         ELSE evtenabled::text
       END AS status
FROM pg_event_trigger
WHERE evtname = '${name}'
`,

  create: () => `-- Create a new event trigger
-- Valid events: ddl_command_start, ddl_command_end, table_rewrite, sql_drop
CREATE OR REPLACE FUNCTION event_trigger_function_name()
RETURNS event_trigger AS $$
BEGIN
  RAISE NOTICE 'DDL event: %', tg_event;
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER trigger_name
  ON ddl_command_end
  EXECUTE FUNCTION event_trigger_function_name();
`,

  drop: (name: string) =>
    `DROP EVENT TRIGGER IF EXISTS "${name}";`,

  enable: (name: string) =>
    `ALTER EVENT TRIGGER "${name}" ENABLE;`,

  disable: (name: string) =>
    `ALTER EVENT TRIGGER "${name}" DISABLE;`,

  enableAlways: (name: string) =>
    `ALTER EVENT TRIGGER "${name}" ENABLE ALWAYS;`,

  enableReplica: (name: string) =>
    `ALTER EVENT TRIGGER "${name}" ENABLE REPLICA;`,
};
