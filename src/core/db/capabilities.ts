export interface FeatureFlags {
  supportsSchemas: boolean;
  supportsListenNotify: boolean;
  supportsLogicalReplication: boolean;
  supportsTablespaces: boolean;
  supportsEventTriggers: boolean;
  supportsPgCron: boolean;
  supportsForeignDataWrappers: boolean;
}

export const POSTGRES_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: true,
  supportsListenNotify: true,
  supportsLogicalReplication: true,
  supportsTablespaces: true,
  supportsEventTriggers: true,
  supportsPgCron: true,
  supportsForeignDataWrappers: true,
};

export const MYSQL_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: false,
  supportsListenNotify: false,
  supportsLogicalReplication: false,
  supportsTablespaces: false,
  supportsEventTriggers: false,
  supportsPgCron: false,
  supportsForeignDataWrappers: false,
};

export const SQLITE_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: false,
  supportsListenNotify: false,
  supportsLogicalReplication: false,
  supportsTablespaces: false,
  supportsEventTriggers: false,
  supportsPgCron: false,
  supportsForeignDataWrappers: false,
};

export const MSSQL_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: true,
  supportsListenNotify: false,
  supportsLogicalReplication: false,
  supportsTablespaces: false,
  supportsEventTriggers: false,
  supportsPgCron: false,
  supportsForeignDataWrappers: false,
};

export const ORACLE_FEATURE_FLAGS: FeatureFlags = {
  supportsSchemas: true,
  supportsListenNotify: false,
  supportsLogicalReplication: false,
  supportsTablespaces: true,
  supportsEventTriggers: false,
  supportsPgCron: false,
  supportsForeignDataWrappers: false,
};
