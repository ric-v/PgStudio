export const PublicationSQL = {
  list: () => `
SELECT p.pubname AS publication_name,
       p.pubowner::regrole AS owner,
       p.puballtables AS all_tables,
       p.pubinsert AS publish_insert,
       p.pubupdate AS publish_update,
       p.pubdelete AS publish_delete,
       p.pubtruncate AS publish_truncate
FROM pg_publication p
ORDER BY p.pubname
`,

  getDefinition: (name: string) => `
SELECT p.pubname AS publication_name,
       p.pubowner::regrole AS owner,
       p.puballtables AS all_tables,
       p.pubinsert AS publish_insert,
       p.pubupdate AS publish_update,
       p.pubdelete AS publish_delete,
       p.pubtruncate AS publish_truncate,
       pt.schemaname AS table_schema,
       pt.tablename AS table_name
FROM pg_publication p
LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
WHERE p.pubname = '${name}'
ORDER BY pt.schemaname, pt.tablename
`,

  create: (name: string) => `-- Create a new publication named ${name}
-- FOR ALL TABLES publishes all current and future tables
CREATE PUBLICATION "${name}" FOR ALL TABLES;

-- Or publish specific tables:
-- CREATE PUBLICATION "${name}" FOR TABLE schema.table1, schema.table2;

-- Or with specific operations:
-- CREATE PUBLICATION "${name}" FOR ALL TABLES
--   WITH (publish = 'insert, update, delete, truncate');
`,

  drop: (name: string) =>
    `DROP PUBLICATION IF EXISTS "${name}";`,

  addTable: (name: string, schema: string, table: string) =>
    `ALTER PUBLICATION "${name}" ADD TABLE "${schema}"."${table}";`,

  dropTable: (name: string, schema: string, table: string) =>
    `ALTER PUBLICATION "${name}" DROP TABLE "${schema}"."${table}";`,

  listSubscriptions: () => `
SELECT subname AS subscription_name,
       subowner::regrole AS owner,
       subenabled AS enabled,
       subconninfo AS connection_info,
       subslotname AS slot_name,
       subpublications AS publications,
       subsynccommit AS sync_commit
FROM pg_subscription
ORDER BY subname
`,

  getSubscriptionDefinition: (name: string) => `
SELECT subname AS subscription_name,
       subowner::regrole AS owner,
       subenabled AS enabled,
       subconninfo AS connection_info,
       subslotname AS slot_name,
       subpublications AS publications,
       subsynccommit AS sync_commit
FROM pg_subscription
WHERE subname = '${name}'
`,

  createSubscription: (name: string) => `-- Create a new subscription
CREATE SUBSCRIPTION "${name}"
  CONNECTION 'host=publisher_host port=5432 dbname=publisher_db user=replication_user password=secret'
  PUBLICATION publication_name;
`,

  dropSubscription: (name: string) =>
    `DROP SUBSCRIPTION IF EXISTS "${name}";`,

  enableSubscription: (name: string) =>
    `ALTER SUBSCRIPTION "${name}" ENABLE;`,

  disableSubscription: (name: string) =>
    `ALTER SUBSCRIPTION "${name}" DISABLE;`,
};
