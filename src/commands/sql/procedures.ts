/**
 * SQL Templates for Procedure Operations
 */

export const ProcedureSQL = {
  /**
   * Call procedure
   */
  call: (schema: string, name: string, args: string) =>
    `-- Call procedure\nCALL "${schema}"."${name}"(${args});`,

  /**
   * Create or replace procedure template
   */
  createOrReplace: (schema: string) =>
    `-- Create or replace procedure
CREATE OR REPLACE PROCEDURE "${schema}".procedure_name(IN param1 integer, IN param2 text)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Procedure logic here
    RAISE NOTICE 'param1: %, param2: %', param1, param2;
END;
$$;`,

  /**
   * Drop procedure — primary: DROP, variant: CASCADE
   */
  drop: (schema: string, name: string, args: string) =>
    `-- Drop procedure
DROP PROCEDURE IF EXISTS "${schema}"."${name}"(${args});

-- Use CASCADE to also drop dependent objects
-- DROP PROCEDURE IF EXISTS "${schema}"."${name}"(${args}) CASCADE;`,

  /**
   * Procedure metadata query
   */
  metadata: (schema: string, name: string) =>
    `-- Get procedure details and metadata
SELECT
    p.proname AS procedure_name,
    pg_get_function_arguments(p.oid) AS arguments,
    l.lanname AS language,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
    END AS volatility,
    p.prosecdef AS security_definer,
    p.proisstrict AS strict
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = '${schema}'
  AND p.proname = '${name}'
  AND p.prokind = 'p';`,
};
