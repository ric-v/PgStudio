export const AggregateSQL = {
  list: (schema: string) => `
SELECT p.proname AS aggregate_name,
       n.nspname AS schema_name,
       pg_get_function_arguments(p.oid) AS arguments,
       format_type(p.prorettype, NULL) AS return_type,
       obj_description(p.oid, 'pg_proc') AS description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prokind = 'a' AND n.nspname = '${schema}'
ORDER BY p.proname
`,

  getDefinition: (schema: string, name: string) => `
SELECT p.proname AS aggregate_name,
       n.nspname AS schema_name,
       pg_get_function_arguments(p.oid) AS arguments,
       format_type(p.prorettype, NULL) AS return_type,
       format_type(a.aggtranstype, NULL) AS transition_type,
       p2.proname AS transition_function,
       p3.proname AS final_function,
       a.agginitval AS initial_value,
       obj_description(p.oid, 'pg_proc') AS description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_aggregate a ON a.aggfnoid = p.oid
LEFT JOIN pg_proc p2 ON p2.oid = a.aggtransfn
LEFT JOIN pg_proc p3 ON p3.oid = a.aggfinalfn
WHERE p.prokind = 'a' AND n.nspname = '${schema}' AND p.proname = '${name}'
`,

  drop: (schema: string, name: string, argTypes: string = '*') =>
    `DROP AGGREGATE IF EXISTS "${schema}"."${name}"(${argTypes});`,

  create: (schema: string) => `-- Create a new aggregate function in schema ${schema}
CREATE AGGREGATE "${schema}"."new_aggregate_name" (
  SFUNC = transition_function,      -- state transition function
  STYPE = state_data_type,          -- state data type
  FINALFUNC = final_function,       -- optional final function
  INITCOND = 'initial_value'        -- optional initial condition
);
`,
};
