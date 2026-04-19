import * as vscode from 'vscode';
import { DatabaseTreeItem } from '../providers/DatabaseTreeProvider';
import { DatabaseTreeProvider } from '../providers/DatabaseTreeProvider';
import { QueryHistoryService } from '../services/QueryHistoryService';
import { ChatViewProvider } from '../providers/ChatViewProvider';

import { cmdAiAssist } from '../commands/aiAssist';
import { showColumnProperties, copyColumnName, copyColumnNameQuoted, generateSelectStatement, generateWhereClause, generateAlterColumnScript, generateDropColumnScript, generateRenameColumnScript, addColumnComment, generateIndexOnColumn, viewColumnStatistics, cmdAddColumn } from '../commands/columns';
import { showConstraintProperties, copyConstraintName, generateDropConstraintScript, generateAlterConstraintScript, validateConstraint, generateAddConstraintScript, viewConstraintDependencies, cmdConstraintOperations, cmdAddConstraint } from '../commands/constraints';
import { cmdConnectDatabase, cmdDisconnectConnection, cmdDisconnectDatabase, cmdReconnectConnection, cmdDuplicateConnection, showConnectionSafety, revealInExplorer } from '../commands/connection';
import { cmdImportConnectionFromDatabaseUrl } from '../commands/importConnectionFromDatabaseUrl';
import { showIndexProperties, copyIndexName, generateDropIndexScript, generateReindexScript, generateScriptCreate, analyzeIndexUsage, generateAlterIndexScript, addIndexComment, cmdIndexOperations, cmdAddIndex } from '../commands/indexes';
import { cmdAddObjectInDatabase, cmdBackupDatabase, cmdCreateDatabase, cmdDatabaseDashboard, cmdDatabaseDashboardFromPalette, cmdDatabaseOperations, cmdDeleteDatabase, cmdDisconnectDatabase as cmdDisconnectDatabaseLegacy, cmdGenerateCreateScript, cmdMaintenanceDatabase, cmdPsqlTool, cmdQueryTool, cmdRestoreDatabase, cmdScriptAlterDatabase, cmdShowConfiguration } from '../commands/database';
import { cmdDropExtension, cmdEnableExtension, cmdExtensionOperations, cmdRefreshExtension } from '../commands/extensions';
import { cmdCreateForeignTable, cmdDropForeignTable, cmdEditForeignTable, cmdForeignTableOperations, cmdRefreshForeignTable, cmdShowForeignTableProperties, cmdViewForeignTableData } from '../commands/foreignTables';
import { cmdForeignDataWrapperOperations, cmdShowForeignDataWrapperProperties, cmdCreateForeignServer, cmdForeignServerOperations, cmdShowForeignServerProperties, cmdDropForeignServer, cmdCreateUserMapping, cmdUserMappingOperations, cmdShowUserMappingProperties, cmdDropUserMapping, cmdRefreshForeignDataWrapper, cmdRefreshForeignServer, cmdRefreshUserMapping } from '../commands/foreignDataWrappers';
import { cmdCallFunction, cmdCreateFunction, cmdDropFunction, cmdEditFunction, cmdFunctionOperations, cmdRefreshFunction, cmdShowFunctionProperties } from '../commands/functions';
import { cmdCallProcedure, cmdCreateProcedure, cmdDropProcedure, cmdEditProcedure, cmdProcedureOperations, cmdRefreshProcedure, cmdShowProcedureProperties } from '../commands/procedures';
import { cmdCreateMaterializedView, cmdDropMatView, cmdEditMatView, cmdMatViewOperations, cmdRefreshMatView, cmdViewMatViewData, cmdViewMatViewProperties } from '../commands/materializedViews';
import { cmdNewNotebook, cmdExplainQuery, cmdJumpToSection } from '../commands/notebook';
import { cmdExportNotebook } from '../commands/notebookExport';
import { cmdCreateObjectInSchema, cmdCreateSchema, cmdSchemaOperations, cmdShowSchemaProperties, cmdPasteTable } from '../commands/schema';
import {
  cmdCreateTable, cmdDropTable, cmdEditTable, cmdInsertTable, cmdMaintenanceAnalyze, cmdMaintenanceReindex, cmdMaintenanceVacuum, cmdScriptCreate, cmdScriptDelete, cmdScriptInsert, cmdScriptSelect, cmdScriptUpdate, cmdShowTableProperties, cmdTableOperations, cmdTruncateTable, cmdUpdateTable, cmdViewTableData, cmdTableProfile, cmdTableActivity, cmdQuickCloneTable, cmdExportTable, cmdIndexUsage, cmdTableDefinition
} from '../commands/tables';
import { cmdAllOperationsTypes, cmdCreateType, cmdDropType, cmdEditTypes, cmdRefreshType, cmdShowTypeProperties } from '../commands/types';
import { cmdAddRole, cmdAddUser, cmdDropRole, cmdEditRole, cmdGrantRevokeRole, cmdRefreshRole, cmdRoleOperations, cmdShowRoleProperties } from '../commands/usersRoles';
import { cmdCreateView, cmdDropView, cmdEditView, cmdRefreshView, cmdScriptCreate as cmdViewScriptCreate, cmdScriptSelect as cmdViewScriptSelect, cmdShowViewProperties, cmdViewData, cmdViewOperations } from '../commands/views';

import { AiSettingsPanel } from '../features/aiAssistant/settings/aiSettingsPanel';
import { ConnectionFormPanel } from '../features/connections/connectionForm';
import { ConnectionManagementPanel } from '../features/connections/connectionManagement';
import { ConnectionUtils } from '../utils/connectionUtils';

// Phase 7: Advanced Power User & AI features
import {
  switchConnectionProfile,
  createConnectionProfile,
  deleteConnectionProfile,
  saveQueryToLibrary,
  saveQueryToLibraryUI,
  loadSavedQuery,
  loadSavedQueryUI,
  viewSavedQuery,
  deleteSavedQuery,
  copySavedQuery,
  editSavedQuery,
  openSavedQueryInNotebook,
  exportSavedQueries,
  importSavedQueries,
  searchSavedQueries,
  showQueryRecommendations,
  exportConnectionProfiles,
  importConnectionProfiles,
} from '../commands/phase7';
import { SavedQueriesTreeProvider } from '../providers/Phase7TreeProviders';
import { pickQueryHistory } from '../commands/pickQueryHistory';

// Visual Schema Design
import {
  cmdOpenTableDesigner,
  cmdCreateTableVisual,
  cmdOpenSchemaDiff,
  cmdOpenSchemaDiffFromPalette,
  cmdOpenErd,
  cmdImportData,
} from '../commands/schemaDesigner';
import { NotebookTreeItem, NotebooksTreeProvider } from '../providers/NotebooksTreeProvider';

// Phase 2: New object types
import { cmdListTriggers, cmdCreateTrigger, cmdDropTrigger, cmdEnableTrigger, cmdDisableTrigger, cmdShowTriggerProperties, cmdTriggerOperations } from '../commands/triggers';
import { cmdListSequences, cmdCreateSequence, cmdDropSequence, cmdSequenceNextValue, cmdShowSequenceProperties, cmdSequenceOperations } from '../commands/sequences';
import { cmdListPartitions, cmdDetachPartition, cmdShowPartitionProperties, cmdCreatePartition } from '../commands/partitions';
import { cmdListDomains, cmdCreateDomain, cmdDropDomain, cmdShowDomainProperties } from '../commands/domains';
import { cmdListAggregates, cmdDropAggregate, cmdShowAggregateProperties, cmdCreateAggregate } from '../commands/aggregates';
import { cmdListEventTriggers, cmdCreateEventTrigger, cmdDropEventTrigger, cmdEnableEventTrigger, cmdDisableEventTrigger, cmdShowEventTriggerProperties, cmdEventTriggerOperations } from '../commands/eventTriggers';
import {
  cmdListCronJobs,
  cmdInstallPgCron,
  cmdScheduleCronJob,
  cmdShowCronJobProperties,
  cmdUnscheduleCronJob,
} from '../commands/pgCron';
import { cmdListRules, cmdDropRule, cmdShowRuleProperties, cmdRuleOperations } from '../commands/rules';
import { cmdListTablespaces, cmdShowTablespaceProperties, cmdTablespaceOperations } from '../commands/tablespaces';
import { cmdListPublications, cmdCreatePublication, cmdDropPublication, cmdShowPublicationProperties, cmdListSubscriptions, cmdDropSubscription, cmdShowSubscriptionProperties, cmdPublicationOperations } from '../commands/publications';
import { cmdDropPolicy } from '../commands/rlsPolicies';
import { cmdOpenListenNotify, cmdOpenListenNotifyFromPalette } from '../commands/listenNotify';
import { cmdSearchSchema } from '../commands/schemaSearch';
import { WorkspaceStateService } from '../services/WorkspaceStateService';
import { switchWorkspaceDefaultConnection } from '../commands/workspaceConnection';

export function getCommandSpecs(
  context: vscode.ExtensionContext,
  databaseTreeProvider: DatabaseTreeProvider,
  chatViewProviderInstance: ChatViewProvider | undefined,
  outputChannel: vscode.OutputChannel,
  savedQueriesTreeProvider?: SavedQueriesTreeProvider,
  notebooksTreeProvider?: NotebooksTreeProvider
): Array<{ command: string; callback: (...args: any[]) => any }> {
  const commands = [
    {
      command: 'nexql.addConnection',
      callback: () => {
        // Explicitly pass undefined to force "Add" mode, ignoring any arguments VS Code might pass
        ConnectionFormPanel.show(context.extensionUri, context, undefined);
      }
    },
    {
      command: 'nexql.importConnectionFromDatabaseUrl',
      callback: () => cmdImportConnectionFromDatabaseUrl(context, databaseTreeProvider)
    },
    {
      command: 'nexql.editConnection',
      callback: (item: DatabaseTreeItem) => {
        if (!item || !item.connectionId) return;
        const connection = ConnectionUtils.findConnection(item.connectionId);
        if (connection) {
          ConnectionFormPanel.show(context.extensionUri, context, connection);
        }
      }
    },
    {
      command: 'nexql.duplicateConnection',
      callback: async (item: DatabaseTreeItem) => {
        await cmdDuplicateConnection(item, context, databaseTreeProvider);
      }
    },
    {
      command: 'nexql.refreshConnections',
      callback: () => {
        databaseTreeProvider.refresh();
      }
    },
    {
      command: 'nexql.clearHistory',
      callback: async () => {
        await QueryHistoryService.getInstance().clear();
        vscode.window.showInformationMessage('Query history cleared');
      }
    },
    {
      command: 'nexql.pickQueryHistory',
      callback: () => pickQueryHistory()
    },
    {
      command: 'nexql.copyQuery',
      callback: async (item: any) => {
        // Handle both direct string (from context menu if configured that way) or TreeItem
        const query = typeof item === 'string' ? item : item?.query;
        if (query) {
          await vscode.env.clipboard.writeText(query);
          vscode.window.showInformationMessage('Query copied to clipboard');
        }
      }
    },
    {
      command: 'nexql.deleteHistoryItem',
      callback: async (item: any) => {
        if (item && item.id) {
          await QueryHistoryService.getInstance().delete(item.id);
        }
      }
    },
    {
      command: 'nexql.openQuery',
      callback: async (item: any) => {
        const query = typeof item === 'string' ? item : item?.query;
        if (query) {
          const doc = await vscode.workspace.openTextDocument({
            content: query,
            language: 'sql'
          });
          await vscode.window.showTextDocument(doc);
        }
      }
    },
    {
      command: 'nexql.explainQuery',
      callback: async (cellUri: vscode.Uri, analyze: boolean) => {
        await cmdExplainQuery(cellUri, analyze);
      }
    },
    {
      command: 'nexql.tableProfile',
      callback: async (item: DatabaseTreeItem) => await cmdTableProfile(item, context)
    },
    {
      command: 'nexql.tableActivity',
      callback: async (item: DatabaseTreeItem) => await cmdTableActivity(item, context)
    },
    {
      command: 'nexql.indexUsage',
      callback: async (item: DatabaseTreeItem) => await cmdIndexUsage(item, context)
    },
    {
      command: 'nexql.tableDefinition',
      callback: async (item: DatabaseTreeItem) => await cmdTableDefinition(item, context)
    },
    {
      command: 'nexql.generateQuery',
      callback: async () => {
        if (!chatViewProviderInstance) {
          vscode.window.showErrorMessage('AI Chat is not initialized');
          return;
        }

        // Step 1: Get all connections
        const connections = vscode.workspace.getConfiguration().get<any[]>('nexql.connections') || [];

        if (connections.length === 0) {
          vscode.window.showErrorMessage('No database connections found. Please add a connection first.');
          return;
        }

        // Step 2: Let user select connection
        const connectionItems = connections.map(conn => ({
          label: conn.name,
          description: `${conn.host}:${conn.port}/${conn.database}`,
          connection: conn
        }));

        const selectedConnection = await vscode.window.showQuickPick(connectionItems, {
          placeHolder: 'Select a database connection',
          title: 'Generate Query - Select Database'
        });

        if (!selectedConnection) {
          return;
        }

        // Step 3: Fetch database objects (tables, views, functions)
        try {
          const dbObjects = await databaseTreeProvider.getDbObjectsForConnection(selectedConnection.connection);

          if (!dbObjects || dbObjects.length === 0) {
            vscode.window.showWarningMessage('No tables, views, or functions found in this database.');
            // Continue anyway, let user describe query without schema
            const input = await vscode.window.showInputBox({
              prompt: 'Describe the SQL query you want to generate',
              placeHolder: 'e.g., Show me top 10 users by order count'
            });

            if (input) {
              vscode.commands.executeCommand('nexql.chatView.focus');
              await chatViewProviderInstance.handleGenerateQuery(input);
            }
            return;
          }

          // Step 4: Let user select relevant objects
          const objectItems = dbObjects.map(obj => ({
            label: `${obj.type === 'table' ? '📋' : obj.type === 'view' ? '👁️' : '⚙️'} ${obj.schema}.${obj.name}`,
            description: obj.type,
            picked: false,
            object: obj
          }));

          const selectedObjects = await vscode.window.showQuickPick(objectItems, {
            placeHolder: 'Select tables, views, or functions (multi-select)',
            title: 'Generate Query - Select Database Objects',
            canPickMany: true
          });

          if (!selectedObjects || selectedObjects.length === 0) {
            const proceed = await vscode.window.showWarningMessage(
              'No objects selected. Generate query without schema context?',
              'Yes', 'No'
            );

            if (proceed !== 'Yes') {
              return;
            }
          }

          // Step 5: Get query description
          const input = await vscode.window.showInputBox({
            prompt: 'Describe the SQL query you want to generate',
            placeHolder: 'e.g., Show me top 10 users by order count in the last month'
          });

          if (input) {
            // Focus the chat view
            vscode.commands.executeCommand('nexql.chatView.focus');

            // Send to AI with schema context
            const schemaContext = selectedObjects ? selectedObjects.map(item => item.object) : undefined;
            await chatViewProviderInstance.handleGenerateQuery(input, schemaContext);
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(`Failed to fetch database objects: ${error.message}`);
        }
      }
    },
    {
      command: 'nexql.optimizeQuery',
      callback: async () => {
        if (!chatViewProviderInstance) {
          vscode.window.showErrorMessage('AI Chat is not initialized');
          return;
        }

        let query = '';
        const activeNotebookEditor = vscode.window.activeNotebookEditor;
        if (activeNotebookEditor && activeNotebookEditor.selections.length > 0) {
          const cellIndex = activeNotebookEditor.selections[0].start;
          const cell = activeNotebookEditor.notebook.cellAt(cellIndex);
          query = cell.document.getText().trim();
        }

        if (!query) {
          query = (await vscode.window.showInputBox({
            prompt: 'Paste or type the SQL query you want to optimize',
            placeHolder: 'SELECT ...'
          }))?.trim() || '';
        }

        if (!query) {
          vscode.window.showWarningMessage('No query provided for optimization.');
          return;
        }

        await vscode.commands.executeCommand('nexql.chatView.focus');
        await chatViewProviderInstance.handleOptimizeQuery(query);
      }
    },
    {
      command: 'nexql.addToFavorites',
      callback: async (item: DatabaseTreeItem) => {
        if (item) {
          await databaseTreeProvider.addToFavorites(item);
        }
      }
    },
    {
      command: 'nexql.removeFromFavorites',
      callback: async (item: DatabaseTreeItem) => {
        if (item) {
          await databaseTreeProvider.removeFromFavorites(item);
        }
      }
    },
    {
      command: 'nexql.manageConnections',
      callback: () => {
        ConnectionManagementPanel.show(context.extensionUri, context);
      }
    },
    {
      command: 'nexql.aiSettings',
      callback: () => {
        AiSettingsPanel.show(context.extensionUri, context);
      }
    },
    {
      command: 'nexql.connect',
      callback: async (item: any) => await cmdConnectDatabase(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.disconnect',
      callback: async () => {
        databaseTreeProvider.refresh();
        vscode.window.showInformationMessage('Disconnected from PostgreSQL database');
      }
    },
    {
      command: 'nexql.queryTable',
      callback: async (item: any) => {
        if (!item || !item.schema) {
          return;
        }

        const query = `SELECT * FROM ${item.schema}.${item.label} LIMIT 100;`;
        const notebook = await vscode.workspace.openNotebookDocument('nexql-notebook', new vscode.NotebookData([
          new vscode.NotebookCellData(vscode.NotebookCellKind.Code, query, 'sql')
        ]));
        await vscode.window.showNotebookDocument(notebook);
      }
    },
    {
      command: 'nexql.newNotebook',
      callback: async (item: any) => await cmdNewNotebook(item, context)
    },
    {
      command: 'nexql.jumpToSection',
      callback: async () => await cmdJumpToSection()
    },
    {
      command: 'nexql.exportNotebook',
      callback: () => cmdExportNotebook()
    },
    {
      command: 'nexql.notebooks.refresh',
      callback: () => notebooksTreeProvider?.refresh()
    },
    {
      command: 'nexql.notebooks.open',
      callback: async (item: NotebookTreeItem) => {
        if (item?.uri) {
          const doc = await vscode.workspace.openNotebookDocument(item.uri);
          await vscode.window.showNotebookDocument(doc, { preserveFocus: false });
        }
      }
    },
    {
      command: 'nexql.notebooks.rename',
      callback: async (item: NotebookTreeItem) => {
        if (!item?.uri) { return; }
        const oldName = (item.label as string);
        const newName = await vscode.window.showInputBox({
          prompt: 'New notebook name',
          value: oldName,
          validateInput: v => v && /^[a-zA-Z0-9_-]+$/.test(v) ? null : 'Use only letters, numbers, hyphens, underscores'
        });
        if (!newName || newName === oldName) { return; }
        const newUri = vscode.Uri.joinPath(item.uri, '..', `${newName}.pgsql`);
        await vscode.workspace.fs.rename(item.uri, newUri, { overwrite: false });
        notebooksTreeProvider?.refresh();
      }
    },
    {
      command: 'nexql.notebooks.delete',
      callback: async (item: NotebookTreeItem) => {
        if (!item?.uri) { return; }
        const confirm = await vscode.window.showWarningMessage(
          `Delete "${item.label as string}.pgsql"? This cannot be undone.`,
          { modal: true }, 'Delete'
        );
        if (confirm !== 'Delete') { return; }
        await vscode.workspace.fs.delete(item.uri, { recursive: false });
        notebooksTreeProvider?.refresh();
      }
    },
    {
      command: 'nexql.notebooks.deleteFolder',
      callback: async (item: NotebookTreeItem) => {
        if (!item?.uri) { return; }
        const folderName = item.label as string;
        const confirm = await vscode.window.showWarningMessage(
          `Delete folder "${folderName}" and all notebooks inside it? This cannot be undone.`,
          { modal: true },
          'Delete Folder'
        );
        if (confirm !== 'Delete Folder') { return; }
        await vscode.workspace.fs.delete(item.uri, { recursive: true, useTrash: false });
        notebooksTreeProvider?.refresh();
      }
    },
    {
      command: 'nexql.refresh',
      callback: () => databaseTreeProvider.refresh()
    },
    // Add database commands
    {
      command: 'nexql.createInDatabase',
      callback: async (item: DatabaseTreeItem) => await cmdAddObjectInDatabase(item, context)
    },
    {
      command: 'nexql.createDatabase',
      callback: async (item: DatabaseTreeItem) => await cmdCreateDatabase(item, context)
    },
    {
      command: 'nexql.dropDatabase',
      callback: async (item: DatabaseTreeItem) => await cmdDeleteDatabase(item, context)
    },
    {
      command: 'nexql.scriptAlterDatabase',
      callback: async (item: DatabaseTreeItem) => await cmdScriptAlterDatabase(item, context)
    },
    {
      command: 'nexql.databaseOperations',
      callback: async (item: DatabaseTreeItem) => await cmdDatabaseOperations(item, context)
    },
    {
      command: 'nexql.showDashboard',
      callback: async (item: DatabaseTreeItem) => await cmdDatabaseDashboard(item, context)
    },
    {
      command: 'postgres-explorer.showDashboardFromPalette',
      callback: () => cmdDatabaseDashboardFromPalette(context)
    },
    {
      command: 'nexql.openListenNotify',
      callback: async (item: DatabaseTreeItem) => await cmdOpenListenNotify(item, context)
    },
    {
      command: 'nexql.openListenNotifyFromPalette',
      callback: () => cmdOpenListenNotifyFromPalette(context)
    },
    {
      command: 'nexql.backupDatabase',
      callback: async (item: DatabaseTreeItem) => await cmdBackupDatabase(item, context)
    },
    {
      command: 'nexql.restoreDatabase',
      callback: async (item: DatabaseTreeItem) => await cmdRestoreDatabase(item, context)
    },
    {
      command: 'nexql.generateCreateScript',
      callback: async (item: DatabaseTreeItem) => await cmdGenerateCreateScript(item, context)
    },
    {
      command: 'nexql.disconnectDatabase',
      callback: async (item: DatabaseTreeItem) => await cmdDisconnectDatabaseLegacy(item, context)
    },
    {
      command: 'nexql.maintenanceDatabase',
      callback: async (item: DatabaseTreeItem) => await cmdMaintenanceDatabase(item, context)
    },
    {
      command: 'nexql.queryTool',
      callback: async (item: DatabaseTreeItem) => await cmdQueryTool(item, context)
    },
    {
      command: 'nexql.psqlTool',
      callback: async (item: DatabaseTreeItem) => await cmdPsqlTool(item, context)
    },
    {
      command: 'nexql.showConfiguration',
      callback: async (item: DatabaseTreeItem) => await cmdShowConfiguration(item, context)
    },
    // Add schema commands
    {
      command: 'nexql.createSchema',
      callback: async (item: DatabaseTreeItem) => await cmdCreateSchema(item, context)
    },
    {
      command: 'nexql.createInSchema',
      callback: async (item: DatabaseTreeItem) => await cmdCreateObjectInSchema(item, context)
    },
    {
      command: 'nexql.schemaOperations',
      callback: async (item: DatabaseTreeItem) => await cmdSchemaOperations(item, context)
    },
    {
      command: 'nexql.showSchemaProperties',
      callback: async (item: DatabaseTreeItem) => await cmdShowSchemaProperties(item, context)
    },
    // Add table commands
    {
      command: 'nexql.editTable',
      callback: async (item: DatabaseTreeItem) => await cmdEditTable(item, context)
    },
    {
      command: 'nexql.viewTableData',
      callback: async (item: DatabaseTreeItem) => {
        await databaseTreeProvider.addToRecent(item);
        await cmdViewTableData(item, context);
      }
    },
    {
      command: 'nexql.dropTable',
      callback: async (item: DatabaseTreeItem) => await cmdDropTable(item, context)
    },
    {
      command: 'nexql.tableOperations',
      callback: async (item: DatabaseTreeItem) => await cmdTableOperations(item, context)
    },
    {
      command: 'nexql.truncateTable',
      callback: async (item: DatabaseTreeItem) => await cmdTruncateTable(item, context)
    },
    {
      command: 'nexql.quickClone',
      callback: async (item: DatabaseTreeItem) => await cmdQuickCloneTable(item, context)
    },
    {
      command: 'nexql.insertData',
      callback: async (item: DatabaseTreeItem) => await cmdInsertTable(item, context)
    },
    {
      command: 'nexql.exportTable',
      callback: async (item: DatabaseTreeItem) => await cmdExportTable(item, context)
    },
    {
      command: 'nexql.updateData',
      callback: async (item: DatabaseTreeItem) => await cmdUpdateTable(item, context)
    },
    {
      command: 'nexql.showTableProperties',
      callback: async (item: DatabaseTreeItem) => await cmdShowTableProperties(item, context)
    },
    // Add script commands
    {
      command: 'nexql.scriptSelect',
      callback: async (item: DatabaseTreeItem) => await cmdScriptSelect(item, context)
    },
    {
      command: 'nexql.scriptInsert',
      callback: async (item: DatabaseTreeItem) => await cmdScriptInsert(item, context)
    },
    {
      command: 'nexql.scriptUpdate',
      callback: async (item: DatabaseTreeItem) => await cmdScriptUpdate(item, context)
    },
    {
      command: 'nexql.scriptDelete',
      callback: async (item: DatabaseTreeItem) => await cmdScriptDelete(item, context)
    },
    {
      command: 'nexql.scriptCreate',
      callback: async (item: DatabaseTreeItem) => await cmdScriptCreate(item, context)
    },
    // Add maintenance commands
    {
      command: 'nexql.maintenanceVacuum',
      callback: async (item: DatabaseTreeItem) => await cmdMaintenanceVacuum(item, context)
    },
    {
      command: 'nexql.maintenanceAnalyze',
      callback: async (item: DatabaseTreeItem) => await cmdMaintenanceAnalyze(item, context)
    },
    {
      command: 'nexql.maintenanceReindex',
      callback: async (item: DatabaseTreeItem) => await cmdMaintenanceReindex(item, context)
    },

    // Add view commands
    {
      command: 'nexql.refreshView',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshView(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.editViewDefinition',
      callback: async (item: DatabaseTreeItem) => await cmdEditView(item, context)
    },
    {
      command: 'nexql.viewViewData',
      callback: async (item: DatabaseTreeItem) => {
        await databaseTreeProvider.addToRecent(item);
        await cmdViewData(item, context);
      }
    },
    {
      command: 'nexql.dropView',
      callback: async (item: DatabaseTreeItem) => await cmdDropView(item, context)
    },
    {
      command: 'nexql.viewOperations',
      callback: async (item: DatabaseTreeItem) => await cmdViewOperations(item, context)
    },
    {
      command: 'nexql.showViewProperties',
      callback: async (item: DatabaseTreeItem) => await cmdShowViewProperties(item, context)
    },
    {
      command: 'nexql.viewScriptSelect',
      callback: async (item: DatabaseTreeItem) => await cmdViewScriptSelect(item, context)
    },
    {
      command: 'nexql.viewScriptCreate',
      callback: async (item: DatabaseTreeItem) => await cmdViewScriptCreate(item, context)
    },
    // Add function commands
    {
      command: 'nexql.refreshFunction',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshFunction(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.showFunctionProperties',
      callback: async (item: DatabaseTreeItem) => {
        await databaseTreeProvider.addToRecent(item);
        await cmdShowFunctionProperties(item, context);
      }
    },
    {
      command: 'nexql.functionOperations',
      callback: async (item: DatabaseTreeItem) => await cmdFunctionOperations(item, context)
    },
    {
      command: 'nexql.createReplaceFunction',
      callback: async (item: DatabaseTreeItem) => await cmdEditFunction(item, context)
    },
    {
      command: 'nexql.callFunction',
      callback: async (item: DatabaseTreeItem) => await cmdCallFunction(item, context)
    },
    {
      command: 'nexql.dropFunction',
      callback: async (item: DatabaseTreeItem) => await cmdDropFunction(item, context)
    },
    // Add procedure commands
    {
      command: 'nexql.refreshProcedure',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshProcedure(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.showProcedureProperties',
      callback: async (item: DatabaseTreeItem) => {
        await databaseTreeProvider.addToRecent(item);
        await cmdShowProcedureProperties(item, context);
      }
    },
    {
      command: 'nexql.procedureOperations',
      callback: async (item: DatabaseTreeItem) => await cmdProcedureOperations(item, context)
    },
    {
      command: 'nexql.createReplaceProcedure',
      callback: async (item: DatabaseTreeItem) => await cmdEditProcedure(item, context)
    },
    {
      command: 'nexql.callProcedure',
      callback: async (item: DatabaseTreeItem) => await cmdCallProcedure(item, context)
    },
    {
      command: 'nexql.dropProcedure',
      callback: async (item: DatabaseTreeItem) => await cmdDropProcedure(item, context)
    },
    {
      command: 'nexql.createProcedure',
      callback: async (item: DatabaseTreeItem) => await cmdCreateProcedure(item, context)
    },
    // Add materialized view commands
    {
      command: 'nexql.refreshMaterializedView',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshMatView(item, context)
    },
    {
      command: 'nexql.editMatView',
      callback: async (item: DatabaseTreeItem) => await cmdEditMatView(item, context)
    },
    {
      command: 'nexql.editMaterializedView',
      callback: async (item: DatabaseTreeItem) => await cmdEditMatView(item, context)
    },
    {
      command: 'nexql.viewMaterializedViewData',
      callback: async (item: DatabaseTreeItem) => await cmdViewMatViewData(item, context)
    },
    {
      command: 'nexql.showMaterializedViewProperties',
      callback: async (item: DatabaseTreeItem) => await cmdViewMatViewProperties(item, context)
    },
    {
      command: 'nexql.dropMatView',
      callback: async (item: DatabaseTreeItem) => await cmdDropMatView(item, context)
    },
    {
      command: 'nexql.materializedViewOperations',
      callback: async (item: DatabaseTreeItem) => await cmdMatViewOperations(item, context)
    },
    // Add type commands
    {
      command: 'nexql.refreshType',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshType(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.typeOperations',
      callback: async (item: DatabaseTreeItem) => await cmdAllOperationsTypes(item, context)
    },
    {
      command: 'nexql.editType',
      callback: async (item: DatabaseTreeItem) => await cmdEditTypes(item, context)
    },
    {
      command: 'nexql.showTypeProperties',
      callback: async (item: DatabaseTreeItem) => await cmdShowTypeProperties(item, context)
    },
    {
      command: 'nexql.dropType',
      callback: async (item: DatabaseTreeItem) => await cmdDropType(item, context)
    },
    // Add foreign table commands
    {
      command: 'nexql.refreshForeignTable',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshForeignTable(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.foreignTableOperations',
      callback: async (item: DatabaseTreeItem) => await cmdForeignTableOperations(item, context)
    },
    {
      command: 'nexql.editForeignTable',
      callback: async (item: DatabaseTreeItem) => await cmdEditForeignTable(item, context)
    },
    {
      command: 'nexql.showForeignTableProperties',
      callback: async (item: DatabaseTreeItem) => await cmdShowForeignTableProperties(item, context)
    },
    {
      command: 'nexql.viewForeignTableData',
      callback: async (item: DatabaseTreeItem) => await cmdViewForeignTableData(item, context)
    },
    {
      command: 'nexql.dropForeignTable',
      callback: async (item: DatabaseTreeItem) => await cmdDropForeignTable(item, context)
    },
    // Add role/user commands
    {
      command: 'nexql.refreshRole',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshRole(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.createUser',
      callback: async (item: DatabaseTreeItem) => await cmdAddUser(item, context)
    },
    {
      command: 'nexql.createRole',
      callback: async (item: DatabaseTreeItem) => await cmdAddRole(item, context)
    },
    {
      command: 'nexql.editRole',
      callback: async (item: DatabaseTreeItem) => await cmdEditRole(item, context)
    },
    {
      command: 'nexql.grantRevoke',
      callback: async (item: DatabaseTreeItem) => await cmdGrantRevokeRole(item, context)
    },
    {
      command: 'nexql.dropRole',
      callback: async (item: DatabaseTreeItem) => await cmdDropRole(item, context)
    },
    {
      command: 'nexql.roleOperations',
      callback: async (item: DatabaseTreeItem) => await cmdRoleOperations(item, context)
    },
    {
      command: 'nexql.showRoleProperties',
      callback: async (item: DatabaseTreeItem) => await cmdShowRoleProperties(item, context)
    },
    // Add extension commands
    {
      command: 'nexql.refreshExtension',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshExtension(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.enableExtension',
      callback: async (item: DatabaseTreeItem) => await cmdEnableExtension(item, context)
    },
    {
      command: 'nexql.extensionOperations',
      callback: async (item: DatabaseTreeItem) => await cmdExtensionOperations(item, context)
    },
    {
      command: 'nexql.dropExtension',
      callback: async (item: DatabaseTreeItem) => await cmdDropExtension(item, context)
    },
    // Add connection commands
    {
      command: 'nexql.disconnectConnection',
      callback: async (item: DatabaseTreeItem) => await cmdDisconnectConnection(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.reconnectConnection',
      callback: async (item: DatabaseTreeItem) => await cmdReconnectConnection(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.deleteConnection',
      callback: async (item: DatabaseTreeItem) => await cmdDisconnectDatabase(item, context, databaseTreeProvider)
    },

    {
      command: 'nexql.createTable',
      callback: async (item: DatabaseTreeItem) => await cmdCreateTable(item, context)
    },
    {
      command: 'nexql.createView',
      callback: async (item: DatabaseTreeItem) => await cmdCreateView(item, context)
    },
    {
      command: 'nexql.createFunction',
      callback: async (item: DatabaseTreeItem) => await cmdCreateFunction(item, context)
    },
    {
      command: 'nexql.createMaterializedView',
      callback: async (item: DatabaseTreeItem) => await cmdCreateMaterializedView(item, context)
    },
    {
      command: 'nexql.createType',
      callback: async (item: DatabaseTreeItem) => await cmdCreateType(item, context)
    },
    {
      command: 'nexql.createForeignTable',
      callback: async (item: DatabaseTreeItem) => await cmdCreateForeignTable(item, context)
    },
    // Foreign Data Wrapper commands
    {
      command: 'nexql.foreignDataWrapperOperations',
      callback: async (item: DatabaseTreeItem) => await cmdForeignDataWrapperOperations(item, context)
    },
    {
      command: 'nexql.showForeignDataWrapperProperties',
      callback: async (item: DatabaseTreeItem) => await cmdShowForeignDataWrapperProperties(item, context)
    },
    {
      command: 'nexql.refreshForeignDataWrapper',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshForeignDataWrapper(item, context, databaseTreeProvider)
    },
    // Foreign Server commands
    {
      command: 'nexql.createForeignServer',
      callback: async (item: DatabaseTreeItem) => await cmdCreateForeignServer(item, context)
    },
    {
      command: 'nexql.foreignServerOperations',
      callback: async (item: DatabaseTreeItem) => await cmdForeignServerOperations(item, context)
    },
    {
      command: 'nexql.showForeignServerProperties',
      callback: async (item: DatabaseTreeItem) => await cmdShowForeignServerProperties(item, context)
    },
    {
      command: 'nexql.dropForeignServer',
      callback: async (item: DatabaseTreeItem) => await cmdDropForeignServer(item, context)
    },
    {
      command: 'nexql.refreshForeignServer',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshForeignServer(item, context, databaseTreeProvider)
    },
    // User Mapping commands
    {
      command: 'nexql.createUserMapping',
      callback: async (item: DatabaseTreeItem) => await cmdCreateUserMapping(item, context)
    },
    {
      command: 'nexql.userMappingOperations',
      callback: async (item: DatabaseTreeItem) => await cmdUserMappingOperations(item, context)
    },
    {
      command: 'nexql.showUserMappingProperties',
      callback: async (item: DatabaseTreeItem) => await cmdShowUserMappingProperties(item, context)
    },
    {
      command: 'nexql.dropUserMapping',
      callback: async (item: DatabaseTreeItem) => await cmdDropUserMapping(item, context)
    },
    {
      command: 'nexql.refreshUserMapping',
      callback: async (item: DatabaseTreeItem) => await cmdRefreshUserMapping(item, context, databaseTreeProvider)
    },
    {
      command: 'nexql.createRole',
      callback: async (item: DatabaseTreeItem) => await cmdAddRole(item, context)
    },
    {
      command: 'nexql.enableExtension',
      callback: async (item: DatabaseTreeItem) => await cmdEnableExtension(item, context)
    },

    {
      command: 'nexql.aiAssist',
      callback: async (cell: vscode.NotebookCell) => await cmdAiAssist(cell, context, outputChannel)
    },

    {
      command: 'nexql.chatWithQuery',
      callback: async (cell: vscode.NotebookCell) => {
        // Get the query from the active cell
        let query = '';
        let results = '';

        if (cell) {
          query = cell.document.getText();
          // Check if there are outputs from previous execution
          if (cell.outputs && cell.outputs.length > 0) {
            const output = cell.outputs[0];
            for (const item of output.items) {
              if (item.mime === 'application/x-nexql-result' || item.mime === 'application/json') {
                try {
                  const data = JSON.parse(new TextDecoder().decode(item.data));
                  if (data.rows && data.rows.length > 0) {
                    results = `\nResults (${data.rows.length} rows): ${JSON.stringify(data.rows.slice(0, 5), null, 2)}${data.rows.length > 5 ? '\n... and more' : ''}`;
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        } else {
          // Fallback to active notebook editor
          const activeEditor = vscode.window.activeNotebookEditor;
          if (activeEditor) {
            const selections = activeEditor.selections;
            if (selections && selections.length > 0) {
              const cellIndex = selections[0].start;
              const activeCell = activeEditor.notebook.cellAt(cellIndex);
              query = activeCell.document.getText();
            }
          }
        }

        if (!query) {
          vscode.window.showWarningMessage('No query found in the active cell.');
          return;
        }

        // Focus the chat view and send the query
        await vscode.commands.executeCommand('nexql.chatView.focus');

        // Send message to chat view with query context
        const message = `Help me with this SQL query:\n\`\`\`sql\n${query}\n\`\`\`${results}`;

        // Use the chat view provider to send the message
        if (chatViewProviderInstance) {
          chatViewProviderInstance.sendToChat({ query, results, message });
        }
      }
    },

    {
      command: 'nexql.sendToChat',
      callback: async (data: { query: string; results?: string; message: string }) => {
        if (chatViewProviderInstance) {
          await chatViewProviderInstance.sendToChat(data);
        }
      }
    },

    {
      command: 'nexql.attachToChat',
      callback: async (item: DatabaseTreeItem) => {
        if (!chatViewProviderInstance) {
          vscode.window.showWarningMessage('SQL Assistant is not available');
          return;
        }
        if (!item || !item.connectionId || !item.databaseName) {
          vscode.window.showErrorMessage('Invalid database object');
          return;
        }

        // Resolve connection name from config
        const connections = vscode.workspace.getConfiguration().get<any[]>('nexql.connections') || [];
        const conn = connections.find(c => c.id === item.connectionId);
        const connectionName = conn?.name || conn?.host || 'Unknown';

        // Convert DatabaseTreeItem to DbObject
        const dbObject: any = {
          name: item.label,
          type: item.type,
          schema: item.schema || '',
          database: item.databaseName,
          connectionId: item.connectionId,
          connectionName: connectionName,
          breadcrumb: [connectionName, item.databaseName, item.schema, item.label].filter(Boolean).join(' > ')
        };

        await chatViewProviderInstance.attachDbObject(dbObject);
      }
    },

    // Column commands
    {
      command: 'nexql.showColumnProperties',
      callback: async (item: DatabaseTreeItem) => await showColumnProperties(item)
    },
    {
      command: 'nexql.copyColumnName',
      callback: async (item: DatabaseTreeItem) => await copyColumnName(item)
    },
    {
      command: 'nexql.copyColumnNameQuoted',
      callback: async (item: DatabaseTreeItem) => await copyColumnNameQuoted(item)
    },
    {
      command: 'nexql.generateSelectStatement',
      callback: async (item: DatabaseTreeItem) => await generateSelectStatement(item)
    },
    {
      command: 'nexql.openColumnNotebook',
      callback: async (item: DatabaseTreeItem) => await showColumnProperties(item)
    },
    {
      command: 'nexql.generateWhereClause',
      callback: async (item: DatabaseTreeItem) => await generateWhereClause(item)
    },
    {
      command: 'nexql.generateAlterColumnScript',
      callback: async (item: DatabaseTreeItem) => await generateAlterColumnScript(item)
    },
    {
      command: 'nexql.generateDropColumnScript',
      callback: async (item: DatabaseTreeItem) => await generateDropColumnScript(item)
    },
    {
      command: 'nexql.generateRenameColumnScript',
      callback: async (item: DatabaseTreeItem) => await generateRenameColumnScript(item)
    },
    {
      command: 'nexql.addColumnComment',
      callback: async (item: DatabaseTreeItem) => await addColumnComment(item)
    },
    {
      command: 'nexql.generateIndexOnColumn',
      callback: async (item: DatabaseTreeItem) => await generateIndexOnColumn(item)
    },
    {
      command: 'nexql.viewColumnStatistics',
      callback: async (item: DatabaseTreeItem) => await viewColumnStatistics(item)
    },

    // Constraint commands
    {
      command: 'nexql.showConstraintProperties',
      callback: async (item: DatabaseTreeItem) => await showConstraintProperties(item)
    },
    {
      command: 'nexql.copyConstraintName',
      callback: async (item: DatabaseTreeItem) => await copyConstraintName(item)
    },
    {
      command: 'nexql.generateDropConstraintScript',
      callback: async (item: DatabaseTreeItem) => await generateDropConstraintScript(item)
    },
    {
      command: 'nexql.generateAlterConstraintScript',
      callback: async (item: DatabaseTreeItem) => await generateAlterConstraintScript(item)
    },
    {
      command: 'nexql.validateConstraint',
      callback: async (item: DatabaseTreeItem) => await validateConstraint(item)
    },
    {
      command: 'nexql.generateAddConstraintScript',
      callback: async (item: DatabaseTreeItem) => await generateAddConstraintScript(item)
    },
    {
      command: 'nexql.viewConstraintDependencies',
      callback: async (item: DatabaseTreeItem) => await viewConstraintDependencies(item)
    },
    {
      command: 'nexql.constraintOperations',
      callback: async (item: DatabaseTreeItem) => await cmdConstraintOperations(item, context)
    },

    // Index commands
    {
      command: 'nexql.showIndexProperties',
      callback: async (item: DatabaseTreeItem) => await showIndexProperties(item)
    },
    {
      command: 'nexql.copyIndexName',
      callback: async (item: DatabaseTreeItem) => await copyIndexName(item)
    },
    {
      command: 'nexql.generateDropIndexScript',
      callback: async (item: DatabaseTreeItem) => await generateDropIndexScript(item)
    },
    {
      command: 'nexql.generateReindexScript',
      callback: async (item: DatabaseTreeItem) => await generateReindexScript(item)
    },
    {
      command: 'nexql.generateScriptCreate',
      callback: async (item: DatabaseTreeItem) => await generateScriptCreate(item)
    },
    {
      command: 'nexql.analyzeIndexUsage',
      callback: async (item: DatabaseTreeItem) => await analyzeIndexUsage(item)
    },
    {
      command: 'nexql.generateAlterIndexScript',
      callback: async (item: DatabaseTreeItem) => await generateAlterIndexScript(item)
    },
    {
      command: 'nexql.addIndexComment',
      callback: async (item: DatabaseTreeItem) => await addIndexComment(item)
    },
    {
      command: 'nexql.indexOperations',
      callback: async (item: DatabaseTreeItem) => await cmdIndexOperations(item, context)
    },
    {
      command: 'nexql.addColumn',
      callback: async (item: DatabaseTreeItem) => await cmdAddColumn(item)
    },
    {
      command: 'nexql.addConstraint',
      callback: async (item: DatabaseTreeItem) => await cmdAddConstraint(item)
    },
    {
      command: 'nexql.addIndex',
      callback: async (item: DatabaseTreeItem) => await cmdAddIndex(item)
    },

    // Breadcrumb navigation commands
    {
      command: 'nexql.switchConnection',
      callback: async () => {
        const editor = ConnectionUtils.getActivePostgresNotebook();
        if (!editor) {
          vscode.window.showWarningMessage('No active PostgreSQL notebook.');
          return;
        }

        const metadata = editor.notebook.metadata as any;
        const selected = await ConnectionUtils.showConnectionPicker(metadata?.connectionId);

        if (selected) {
          await ConnectionUtils.updateNotebookMetadata(editor.notebook, {
            connectionId: selected.id,
            databaseName: selected.database,
            host: selected.host,
            port: selected.port,
            username: selected.username
          });
          await WorkspaceStateService.getInstance().recordConnectionSwitch(selected.id, selected.database);
          vscode.window.showInformationMessage(`Switched to: ${selected.name || selected.host}`);
        }
      }
    },
    {
      command: 'nexql.showConnectionSafety',
      callback: showConnectionSafety
    },
    {
      command: 'nexql.revealInExplorer',
      callback: () => revealInExplorer(databaseTreeProvider)
    },
    {
      command: 'nexql.navigateBreadcrumb',
      callback: async (args: { type: string; connectionId?: string; database?: string; schema?: string; object?: string }) => {
        // Reveal the item in the database tree based on breadcrumb segment
        if (args?.type === 'connection' && args.connectionId) {
          // Focus database explorer and reveal connection
          await vscode.commands.executeCommand('nexqlExplorer.focus');
        }
        // Future: could expand tree to specific schema/table
      }
    },
    {
      command: 'nexql.copyBreadcrumbPath',
      callback: async (args: { connectionName?: string; database?: string; schema?: string; object?: string }) => {
        const parts = [
          args?.connectionName,
          args?.database,
          args?.schema,
          args?.object
        ].filter(Boolean);

        if (parts.length > 0) {
          const path = parts.join(' ▸ ');
          await vscode.env.clipboard.writeText(path);
          vscode.window.showInformationMessage('Breadcrumb path copied to clipboard');
        }
      }
    },
    {
      command: 'nexql.switchDatabase',
      callback: async () => {
        const editor = ConnectionUtils.getActivePostgresNotebook();
        if (!editor) {
          vscode.window.showWarningMessage('No active PostgreSQL notebook.');
          return;
        }

        const metadata = editor.notebook.metadata as any;
        if (!metadata?.connectionId) {
          vscode.window.showWarningMessage('No connection configured for this notebook.');
          return;
        }

        const connection = ConnectionUtils.findConnection(metadata.connectionId);
        if (!connection) {
          vscode.window.showErrorMessage('Connection not found.');
          return;
        }

        const selectedDb = await ConnectionUtils.showDatabasePicker(connection, metadata.databaseName);

        if (selectedDb && selectedDb !== metadata.databaseName) {
          await ConnectionUtils.updateNotebookMetadata(editor.notebook, { databaseName: selectedDb });
          await WorkspaceStateService.getInstance().recordDatabaseSwitch(metadata.connectionId, selectedDb);
          vscode.window.showInformationMessage(`Switched to database: ${selectedDb}`);
        }
      }
    },
    {
      command: 'nexql.switchWorkspaceDefaultConnection',
      callback: () => switchWorkspaceDefaultConnection()
    },
    // Phase 7: Connection Profiles
    {
      command: 'nexql.switchConnectionProfile',
      callback: () => switchConnectionProfile()
    },
    {
      command: 'nexql.createConnectionProfile',
      callback: () => createConnectionProfile()
    },
    {
      command: 'nexql.deleteConnectionProfile',
      callback: () => deleteConnectionProfile()
    },
    // Phase 7: Saved Queries
    {
      command: 'nexql.saveQueryToLibrary',
      callback: () => saveQueryToLibrary()
    },
    {
      command: 'nexql.loadSavedQuery',
      callback: () => loadSavedQuery()
    },
    {
      command: 'nexql.exportSavedQueries',
      callback: () => exportSavedQueries()
    },
    {
      command: 'nexql.importSavedQueries',
      callback: () => importSavedQueries()
    },
    {
      command: 'nexql.searchSavedQueries',
      callback: () => searchSavedQueries()
    },
    {
      command: 'nexql.showQueryRecommendations',
      callback: () => showQueryRecommendations()
    },
    {
      command: 'nexql.saveQueryToLibraryUI',
      callback: () => saveQueryToLibraryUI()
    },
    {
      command: 'nexql.viewSavedQuery',
      callback: (query: any) => viewSavedQuery(query)
    },
    {
      command: 'nexql.copySavedQuery',
      callback: (query: any) => copySavedQuery(query)
    },
    {
      command: 'nexql.editSavedQuery',
      callback: (query: any) => editSavedQuery(query)
    },
    {
      command: 'nexql.openSavedQueryInNotebook',
      callback: (query: any) => openSavedQueryInNotebook(query)
    },
    {
      command: 'nexql.deleteSavedQuery',
      callback: (query: any) => deleteSavedQuery(query)
    },
    {
      command: 'nexql.loadSavedQueryUI',
      callback: () => loadSavedQueryUI()
    },

    // Visual Schema Design (Phase 7 Roadmap)
    {
      command: 'nexql.openTableDesigner',
      callback: (item: DatabaseTreeItem) => cmdOpenTableDesigner(item, context)
    },
    {
      command: 'nexql.createTableVisual',
      callback: (item: DatabaseTreeItem) => cmdCreateTableVisual(item, context)
    },
    {
      command: 'nexql.openSchemaDiff',
      callback: (item: DatabaseTreeItem) => cmdOpenSchemaDiff(item, context)
    },
    {
      command: 'nexql.openSchemaDiffFromPalette',
      callback: () => cmdOpenSchemaDiffFromPalette(context)
    },
    // D2: ERD
    {
      command: 'nexql.openErd',
      callback: (item: DatabaseTreeItem) => cmdOpenErd(item, context)
    },
    // Import Data
    {
      command: 'nexql.importData',
      callback: (item: DatabaseTreeItem) => cmdImportData(item, context)
    },
    // D3: Profile export/import
    {
      command: 'nexql.exportConnectionProfiles',
      callback: () => exportConnectionProfiles()
    },
    {
      command: 'nexql.importConnectionProfiles',
      callback: () => importConnectionProfiles()
    },
    {
      command: 'nexql.viewMaintenanceVacuum',
      callback: async () => {
        vscode.window.showInformationMessage('VACUUM is not applicable to regular views. Use this on tables or materialized views.');
      }
    },
    {
      command: 'nexql.viewMaintenanceAnalyze',
      callback: async () => {
        vscode.window.showInformationMessage('ANALYZE is not applicable to regular views. Use this on tables or materialized views.');
      }
    },

    // Phase 2: Triggers
    { command: 'nexql.listTriggers', callback: async (item: DatabaseTreeItem) => await cmdListTriggers(item, context) },
    { command: 'nexql.createTrigger', callback: async (item: DatabaseTreeItem) => await cmdCreateTrigger(item, context) },
    { command: 'nexql.dropTrigger', callback: async (item: DatabaseTreeItem) => await cmdDropTrigger(item, context) },
    { command: 'nexql.enableTrigger', callback: async (item: DatabaseTreeItem) => await cmdEnableTrigger(item, context) },
    { command: 'nexql.disableTrigger', callback: async (item: DatabaseTreeItem) => await cmdDisableTrigger(item, context) },
    { command: 'nexql.showTriggerProperties', callback: async (item: DatabaseTreeItem) => await cmdShowTriggerProperties(item, context) },
    { command: 'nexql.triggerOperations', callback: async (item: DatabaseTreeItem) => await cmdTriggerOperations(item, context) },

    // Phase 2: Sequences
    { command: 'nexql.listSequences', callback: async (item: DatabaseTreeItem) => await cmdListSequences(item, context) },
    { command: 'nexql.createSequence', callback: async (item: DatabaseTreeItem) => await cmdCreateSequence(item, context) },
    { command: 'nexql.dropSequence', callback: async (item: DatabaseTreeItem) => await cmdDropSequence(item, context) },
    { command: 'nexql.sequenceNextValue', callback: async (item: DatabaseTreeItem) => await cmdSequenceNextValue(item, context) },
    { command: 'nexql.showSequenceProperties', callback: async (item: DatabaseTreeItem) => await cmdShowSequenceProperties(item, context) },
    { command: 'nexql.sequenceOperations', callback: async (item: DatabaseTreeItem) => await cmdSequenceOperations(item, context) },

    // Phase 2: Partitions
    { command: 'nexql.listPartitions', callback: async (item: DatabaseTreeItem) => await cmdListPartitions(item, context) },
    { command: 'nexql.detachPartition', callback: async (item: DatabaseTreeItem) => await cmdDetachPartition(item, context) },
    { command: 'nexql.showPartitionProperties', callback: async (item: DatabaseTreeItem) => await cmdShowPartitionProperties(item, context) },
    { command: 'nexql.createPartition', callback: async (item: DatabaseTreeItem) => await cmdCreatePartition(item, context) },

    // Phase 2: Domains
    { command: 'nexql.listDomains', callback: async (item: DatabaseTreeItem) => await cmdListDomains(item, context) },
    { command: 'nexql.createDomain', callback: async (item: DatabaseTreeItem) => await cmdCreateDomain(item, context) },
    { command: 'nexql.dropDomain', callback: async (item: DatabaseTreeItem) => await cmdDropDomain(item, context) },
    { command: 'nexql.showDomainProperties', callback: async (item: DatabaseTreeItem) => await cmdShowDomainProperties(item, context) },

    // Phase 2: Aggregates
    { command: 'nexql.listAggregates', callback: async (item: DatabaseTreeItem) => await cmdListAggregates(item, context) },
    { command: 'nexql.createAggregate', callback: async (item: DatabaseTreeItem) => await cmdCreateAggregate(item, context) },
    { command: 'nexql.dropAggregate', callback: async (item: DatabaseTreeItem) => await cmdDropAggregate(item, context) },
    { command: 'nexql.showAggregateProperties', callback: async (item: DatabaseTreeItem) => await cmdShowAggregateProperties(item, context) },

    // Phase 2: Event Triggers
    { command: 'nexql.listEventTriggers', callback: async (item: DatabaseTreeItem) => await cmdListEventTriggers(item, context) },
    { command: 'nexql.createEventTrigger', callback: async (item: DatabaseTreeItem) => await cmdCreateEventTrigger(item, context) },
    { command: 'nexql.dropEventTrigger', callback: async (item: DatabaseTreeItem) => await cmdDropEventTrigger(item, context) },
    { command: 'nexql.enableEventTrigger', callback: async (item: DatabaseTreeItem) => await cmdEnableEventTrigger(item, context) },
    { command: 'nexql.disableEventTrigger', callback: async (item: DatabaseTreeItem) => await cmdDisableEventTrigger(item, context) },
    { command: 'nexql.showEventTriggerProperties', callback: async (item: DatabaseTreeItem) => await cmdShowEventTriggerProperties(item, context) },
    { command: 'nexql.eventTriggerOperations', callback: async (item: DatabaseTreeItem) => await cmdEventTriggerOperations(item, context) },
    { command: 'nexql.listCronJobs', callback: async (item: DatabaseTreeItem) => await cmdListCronJobs(item, context) },
    { command: 'nexql.installPgCron', callback: async (item: DatabaseTreeItem) => await cmdInstallPgCron(item, context) },
    { command: 'nexql.scheduleCronJob', callback: async (item: DatabaseTreeItem) => await cmdScheduleCronJob(item, context) },
    { command: 'nexql.showCronJobProperties', callback: async (item: DatabaseTreeItem) => await cmdShowCronJobProperties(item, context) },
    { command: 'nexql.unscheduleCronJob', callback: async (item: DatabaseTreeItem) => await cmdUnscheduleCronJob(item, context) },

    // Phase 2: Rules
    { command: 'nexql.listRules', callback: async (item: DatabaseTreeItem) => await cmdListRules(item, context) },
    { command: 'nexql.dropRule', callback: async (item: DatabaseTreeItem) => await cmdDropRule(item, context) },
    { command: 'nexql.showRuleProperties', callback: async (item: DatabaseTreeItem) => await cmdShowRuleProperties(item, context) },
    { command: 'nexql.ruleOperations', callback: async (item: DatabaseTreeItem) => await cmdRuleOperations(item, context) },

    // Phase 2: Tablespaces
    { command: 'nexql.listTablespaces', callback: async (item: DatabaseTreeItem) => await cmdListTablespaces(item, context) },
    { command: 'nexql.showTablespaceProperties', callback: async (item: DatabaseTreeItem) => await cmdShowTablespaceProperties(item, context) },
    { command: 'nexql.tablespaceOperations', callback: async (item: DatabaseTreeItem) => await cmdTablespaceOperations(item, context) },

    // Phase 2: Publications & Subscriptions
    { command: 'nexql.listPublications', callback: async (item: DatabaseTreeItem) => await cmdListPublications(item, context) },
    { command: 'nexql.createPublication', callback: async (item: DatabaseTreeItem) => await cmdCreatePublication(item, context) },
    { command: 'nexql.dropPublication', callback: async (item: DatabaseTreeItem) => await cmdDropPublication(item, context) },
    { command: 'nexql.showPublicationProperties', callback: async (item: DatabaseTreeItem) => await cmdShowPublicationProperties(item, context) },
    { command: 'nexql.publicationOperations', callback: async (item: DatabaseTreeItem) => await cmdPublicationOperations(item, context) },
    { command: 'nexql.listSubscriptions', callback: async (item: DatabaseTreeItem) => await cmdListSubscriptions(item, context) },
    { command: 'nexql.dropSubscription', callback: async (item: DatabaseTreeItem) => await cmdDropSubscription(item, context) },
    { command: 'nexql.dropPolicy', callback: async (item: DatabaseTreeItem) => await cmdDropPolicy(item, context) },
    { command: 'nexql.showSubscriptionProperties', callback: async (item: DatabaseTreeItem) => await cmdShowSubscriptionProperties(item, context) },

    // Phase 2: Schema Search
    { command: 'nexql.searchSchema', callback: async () => await cmdSearchSchema() },
  ];

  return commands;
}
