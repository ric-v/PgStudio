export const TriggerSQL = {
  list: (schema: string, table: string) => `
SELECT trigger_name, event_manipulation, action_timing, event_object_table,
       action_statement, action_orientation,
       CASE tgenabled WHEN 'O' THEN 'ENABLED' WHEN 'D' THEN 'DISABLED' ELSE tgenabled::text END AS trigger_status
FROM information_schema.triggers t
JOIN pg_trigger pt ON pt.tgname = t.trigger_name
JOIN pg_class c ON pt.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE t.trigger_schema = '${schema}' AND t.event_object_table = '${table}'
  AND n.nspname = '${schema}'
ORDER BY trigger_name, event_manipulation
`,

  getDefinition: (schema: string, table: string, triggerName: string) => `
SELECT pg_get_triggerdef(t.oid, true) AS definition,
       t.tgname AS trigger_name,
       c.relname AS table_name,
       n.nspname AS schema_name,
       CASE t.tgenabled WHEN 'O' THEN 'ENABLED' WHEN 'D' THEN 'DISABLED' ELSE t.tgenabled::text END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = '${schema}' AND c.relname = '${table}' AND t.tgname = '${triggerName}'
`,

  drop: (schema: string, table: string, triggerName: string) =>
    `DROP TRIGGER IF EXISTS "${triggerName}" ON "${schema}"."${table}";`,

  enable: (schema: string, table: string, triggerName: string) =>
    `ALTER TABLE "${schema}"."${table}" ENABLE TRIGGER "${triggerName}";`,

  disable: (schema: string, table: string, triggerName: string) =>
    `ALTER TABLE "${schema}"."${table}" DISABLE TRIGGER "${triggerName}";`,

  create: (schema: string, table: string) => `-- Create a new trigger on ${schema}.${table}
CREATE OR REPLACE FUNCTION "${schema}".trigger_function_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger logic here
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_name
  BEFORE INSERT OR UPDATE OR DELETE
  ON "${schema}"."${table}"
  FOR EACH ROW
  EXECUTE FUNCTION "${schema}".trigger_function_name();
`,
};
