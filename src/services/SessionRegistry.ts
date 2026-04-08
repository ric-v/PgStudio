import * as vscode from 'vscode';

/**
 * Singleton registry mapping connectionId to the currently open NotebookDocument.
 * Satisfies Requirements 2.4 and 4.1 — tracks at most one open scratch notebook per connection.
 */
class SessionRegistryClass {
  private static instance: SessionRegistryClass;
  private readonly map = new Map<string, vscode.NotebookDocument>();

  private constructor() {}

  static getInstance(): SessionRegistryClass {
    if (!SessionRegistryClass.instance) {
      SessionRegistryClass.instance = new SessionRegistryClass();
    }
    return SessionRegistryClass.instance;
  }

  get(connectionId: string): vscode.NotebookDocument | undefined {
    return this.map.get(connectionId);
  }

  set(connectionId: string, doc: vscode.NotebookDocument): void {
    this.map.set(connectionId, doc);
  }

  delete(connectionId: string): void {
    this.map.delete(connectionId);
  }

  has(connectionId: string): boolean {
    return this.map.has(connectionId);
  }

  entries(): IterableIterator<[string, vscode.NotebookDocument]> {
    return this.map.entries();
  }
}

export const SessionRegistry = SessionRegistryClass.getInstance();

/**
 * Returns the URI for the persistent scratch notebook file for a given connection + database.
 * Path: `{globalStorageUri}/{connectionName}/{databaseName}/scratch.pgsql`
 */
export function getScratchUri(globalStorageUri: vscode.Uri, connectionId: string, databaseName: string, connectionName?: string): vscode.Uri {
  const safeName = (connectionName ?? connectionId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDb = databaseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return vscode.Uri.joinPath(globalStorageUri, safeName, safeDb, 'scratch.pgsql');
}

/**
 * Returns the URI for a new numbered notebook file that does not yet exist on disk.
 * Pattern: `{globalStorageUri}/{connectionName}/{databaseName}/{n}.pgsql`  (n = 1, 2, 3 …)
 */
export async function getNewNotebookUri(globalStorageUri: vscode.Uri, databaseName: string, connectionName?: string): Promise<vscode.Uri> {
  const safeName = (connectionName ?? 'notebook').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDb = databaseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  let n = 1;
  while (true) {
    const uri = vscode.Uri.joinPath(globalStorageUri, safeName, safeDb, `${n}.pgsql`);
    try {
      await vscode.workspace.fs.stat(uri);
      n++;
    } catch {
      return uri;
    }
  }
}

/**
 * Returns the URI of the highest-numbered existing notebook for this connection+db,
 * or undefined if none exist yet.
 */
export async function getLatestNumberedUri(globalStorageUri: vscode.Uri, databaseName: string, connectionName?: string): Promise<vscode.Uri | undefined> {
  const safeName = (connectionName ?? 'notebook').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDb = databaseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  let last: vscode.Uri | undefined;
  let n = 1;
  while (true) {
    const uri = vscode.Uri.joinPath(globalStorageUri, safeName, safeDb, `${n}.pgsql`);
    try {
      await vscode.workspace.fs.stat(uri);
      last = uri;
      n++;
    } catch {
      return last;
    }
  }
}

/**
 * Returns true if the given notebook URI belongs to the connection+db folder.
 */
export function isNotebookForSession(uri: vscode.Uri, databaseName: string, connectionName?: string, connectionId?: string): boolean {
  const safeName = (connectionName ?? connectionId ?? 'notebook').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDb = databaseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  // URI path must contain /{safeName}/{safeDb}/ as a segment
  const segment = `/${safeName}/${safeDb}/`;
  return uri.path.includes(segment);
}
