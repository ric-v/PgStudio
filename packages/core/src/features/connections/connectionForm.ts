import * as vscode from "vscode";
import { ConnectionManager } from "../../services/ConnectionManager";
import { SecretStorageService } from "../../services/SecretStorageService";
import { DEFAULT_DB_ENGINE, resolveDbEngine } from "../../core/db/DbEngine";
import { DriverRegistry } from "../../core/db/registry";
import type { ConnectionFormFieldDefinition } from "../../core/types/connectionForm";
import type { CloudAuthContext } from "../../core/connection/cloudAuth/types";
import { parseCloudAuth } from "../../core/connection/cloudAuth";

export interface ConnectionInfo {
  id: string;
  name: string;
  engine?: "postgres" | "mysql" | "sqlite" | "mssql" | "oracle";
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  group?: string;
  // Safety & confidence features
  environment?: "production" | "staging" | "development";
  readOnlyMode?: boolean;
  // Advanced connection options
  sslmode?:
    | "disable"
    | "allow"
    | "prefer"
    | "require"
    | "verify-ca"
    | "verify-full";
  sslCertPath?: string;
  sslKeyPath?: string;
  sslRootCertPath?: string;
  statementTimeout?: number;
  connectTimeout?: number;
  applicationName?: string;
  options?: string;
  ssh?: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
  };
  /** Planned IAM flows; connections still use password or pgpass today. */
  cloudAuth?: CloudAuthContext;
}

async function writeConnectionsToWorkspace(
  extensionContext: vscode.ExtensionContext,
  connections: ConnectionInfo[],
): Promise<void> {
  try {
    const connectionsForSettings = connections.map(
      ({ password, ...connWithoutPassword }) => connWithoutPassword,
    );
    await vscode.workspace
      .getConfiguration()
      .update(
        "nexql.connections",
        connectionsForSettings,
        vscode.ConfigurationTarget.Global,
      );

    for (const conn of connections) {
      if (conn.password) {
        await SecretStorageService.getInstance().setPassword(conn.id, conn.password);
      }
    }
  } catch (error) {
    console.error("Failed to store connections:", error);
    const existingConnections =
      vscode.workspace
        .getConfiguration()
        .get<any[]>("nexql.connections") || [];
    const sanitizedConnections = existingConnections.map(
      ({ password, ...connWithoutPassword }) => connWithoutPassword,
    );
    await vscode.workspace
      .getConfiguration()
      .update(
        "nexql.connections",
        sanitizedConnections,
        vscode.ConfigurationTarget.Global,
      );
    throw error;
  }
}

/** Append or replace a connection by id (password stored in SecretStorage). */
export async function appendWorkspaceConnection(
  extensionContext: vscode.ExtensionContext,
  connection: ConnectionInfo,
): Promise<void> {
  const existing =
    vscode.workspace
      .getConfiguration()
      .get<ConnectionInfo[]>("nexql.connections") || [];
  const merged = [...existing.filter((c) => c.id !== connection.id), connection];
  await writeConnectionsToWorkspace(extensionContext, merged);
}

export class ConnectionFormPanel {
  public static currentPanel: ConnectionFormPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private readonly _extensionContext: vscode.ExtensionContext,
    private readonly _connectionToEdit?: ConnectionInfo,
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._initialize();

    // Listen to DriverRegistry engine changes to update the engine selector
    const registryDisposable = DriverRegistry.getInstance().onDidChangeEngines(() => {
      this._sendRegisteredEngines();
    });
    this._disposables.push(registryDisposable);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        const buildVersionQuery = (engine: string): string => {
          switch (engine) {
            case "mysql":
              return "SELECT VERSION() AS version";
            case "sqlite":
              return "SELECT sqlite_version() AS version";
            case "mssql":
              return "SELECT @@VERSION AS version";
            case "oracle":
              return "SELECT banner AS version FROM v$version WHERE rownum = 1";
            default:
              return "SELECT version()";
          }
        };

        const isUnsupportedRuntimeEngine = (engine: string): boolean => {
          return engine === "mssql" || engine === "oracle";
        };

        const runTest = async (connection: any, isSave: boolean) => {
          const engine = resolveDbEngine(connection.engine || DEFAULT_DB_ENGINE);

          // Validate that the engine is registered in the DriverRegistry
          const registry = DriverRegistry.getInstance();
          if (!registry.isRegistered(engine)) {
            const extensionName = `NexQL - ${engine.charAt(0).toUpperCase() + engine.slice(1)}`;
            const action = await vscode.window.showErrorMessage(
              `The database engine "${engine}" is not available. ` +
                `Please install the "${extensionName}" extension to connect to ${engine} databases.`,
              "Open Marketplace"
            );
            if (action === "Open Marketplace") {
              await vscode.commands.executeCommand(
                "workbench.extensions.search",
                `nexql ${engine}`
              );
            }
            throw new Error(
              `Engine "${engine}" is not registered. Install the "${extensionName}" extension.`
            );
          }

          const driverConfig: ConnectionInfo = {
            id: this._connectionToEdit
              ? this._connectionToEdit.id
              : `test-${Date.now().toString()}`,
            engine,
            name: connection.name,
            host: connection.host,
            port: connection.port,
            username: connection.username || undefined,
            password: connection.password || undefined,
            database: connection.database || undefined,
            group: connection.group || undefined,
            environment: connection.environment || undefined,
            readOnlyMode: connection.readOnlyMode || undefined,
            sslmode: connection.sslmode || undefined,
            sslCertPath: connection.sslCertPath || undefined,
            sslKeyPath: connection.sslKeyPath || undefined,
            sslRootCertPath: connection.sslRootCertPath || undefined,
            statementTimeout: connection.statementTimeout || undefined,
            connectTimeout: connection.connectTimeout || undefined,
            applicationName: connection.applicationName || undefined,
            options: connection.options || undefined,
            ssh: connection.ssh,
          };

          if (isUnsupportedRuntimeEngine(engine)) {
            if (!isSave) {
              throw new Error(
                `${engine.toUpperCase()} runtime driver is not enabled yet`,
              );
            }
            // Persist now; runtime connectivity for these engines is not enabled yet.
            return true;
          }

          // Drop any pool cached under this ID from earlier tree/refresh calls so
          // this test reflects the exact credentials the user just typed. Without
          // this, a pool created earlier with a stale password (e.g. undefined
          // before SecretStorage migration) would be reused and keep failing.
          try {
            await ConnectionManager.getInstance().closeAllConnectionsById(
              driverConfig.id,
            );
          } catch (e) {
            console.warn("[ConnectionForm] Failed to close stale pools before test:", e);
          }

          let pooledClient: any;
          try {
            pooledClient = await ConnectionManager.getInstance().getPooledClient(
              driverConfig as any,
            );

            if (isSave) {
              await pooledClient.query("SELECT 1");
            } else {
              const result = await pooledClient.query(buildVersionQuery(engine));
              return result.rows?.[0]?.version || "Connected";
            }

            return true;
          } catch (err: any) {
            if (isSave && isUnsupportedRuntimeEngine(engine)) {
              return true;
            }
            throw err;
          } finally {
            try {
              if (pooledClient?.release) {
                pooledClient.release();
              }
            } catch {
              // Ignore release errors in test flow.
            }
          }
        };

        switch (message.command) {
          case "getRegisteredEngines":
            this._sendRegisteredEngines();
            break;

          case "getFormFields": {
            const engine = resolveDbEngine(message.engine || DEFAULT_DB_ENGINE);
            const registry = DriverRegistry.getInstance();
            let fields: ConnectionFormFieldDefinition[] = [];
            if (registry.isRegistered(engine)) {
              fields = registry.getConnectionFormFields(engine);
            }
            this._panel.webview.postMessage({
              type: "formFields",
              engine,
              fields,
            });
            break;
          }

          case "testConnection":
            try {
              const version = await runTest(message.connection, false);
              this._panel.webview.postMessage({
                type: "testSuccess",
                version: version,
              });
            } catch (err: any) {
              this._panel.webview.postMessage({
                type: "testError",
                error: err.message,
              });
            }
            break;

          case "saveConnection":
            try {
              await runTest(message.connection, true);

              const connections = this.getStoredConnections();
              const cloudAuthParsed = parseCloudAuth(
                message.connection.cloudAuth,
              );
              const newConnection: ConnectionInfo = {
                id: this._connectionToEdit
                  ? this._connectionToEdit.id
                  : Date.now().toString(),
                name: message.connection.name,
                engine: resolveDbEngine(
                  message.connection.engine ||
                    this._connectionToEdit?.engine ||
                    DEFAULT_DB_ENGINE,
                ),
                host: message.connection.host,
                port: message.connection.port,
                username: message.connection.username || undefined,
                password: message.connection.password || undefined,
                database: message.connection.database,
                group: message.connection.group || undefined,
                // Safety & confidence features
                environment: message.connection.environment || undefined,
                readOnlyMode: message.connection.readOnlyMode || undefined,
                // Advanced options
                sslmode: message.connection.sslmode || undefined,
                sslCertPath: message.connection.sslCertPath || undefined,
                sslKeyPath: message.connection.sslKeyPath || undefined,
                sslRootCertPath:
                  message.connection.sslRootCertPath || undefined,
                statementTimeout:
                  message.connection.statementTimeout || undefined,
                connectTimeout: message.connection.connectTimeout || undefined,
                applicationName:
                  message.connection.applicationName || undefined,
                options: message.connection.options || undefined,
                ssh: message.connection.ssh,
                ...(cloudAuthParsed.kind !== "none"
                  ? { cloudAuth: cloudAuthParsed }
                  : {}),
              };

              if (this._connectionToEdit) {
                const index = connections.findIndex(
                  (c) => c.id === this._connectionToEdit!.id,
                );
                if (index !== -1) {
                  connections[index] = newConnection;
                } else {
                  connections.push(newConnection);
                }
              } else {
                connections.push(newConnection);
              }

              await this.storeConnections(connections);

              // Close any active connections for this ID to ensure pool is refreshed with new settings
              try {
                // Use the ID of the connection we just saved
                await ConnectionManager.getInstance().closeAllConnectionsById(
                  newConnection.id,
                );
              } catch (e) {
                console.error("Failed to close stale connections:", e);
              }

              vscode.window.showInformationMessage(
                `Connection ${this._connectionToEdit ? "updated" : "saved"} successfully!`,
              );
              vscode.commands.executeCommand(
                "nexql.refreshConnections",
              );
              this._panel.dispose();
            } catch (err: any) {
              const errorMessage = err?.message || "Unknown error occurred";
              vscode.window.showErrorMessage(
                `Failed to connect: ${errorMessage}`,
              );
            }
            break;
        }
      },
      undefined,
      this._disposables,
    );
  }

  public static show(
    extensionUri: vscode.Uri,
    extensionContext: vscode.ExtensionContext,
    connectionToEdit?: ConnectionInfo,
  ) {
    if (ConnectionFormPanel.currentPanel) {
      // Check if we are switching contexts (Add <-> Edit) or Edit <-> Edit (different ID)
      const current = ConnectionFormPanel.currentPanel;
      const currentId = current._connectionToEdit?.id;
      const newId = connectionToEdit?.id;

      if (currentId !== newId) {
        // Context switch detected - dispose old panel so we create a fresh one
        current.dispose();
      } else {
        // Same context - just reveal
        current._panel.reveal();
        return;
      }
    }

    const panel = vscode.window.createWebviewPanel(
      "connectionForm",
      connectionToEdit ? "Edit Connection" : "Add SQL Connection",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      },
    );

    ConnectionFormPanel.currentPanel = new ConnectionFormPanel(
      panel,
      extensionUri,
      extensionContext,
      connectionToEdit,
    );
  }

  private async _initialize() {
    // The message handler is already set up in the constructor
    await this._update();
  }

  private async _update() {
    this._panel.webview.html = await this._getHtmlForWebview(
      this._panel.webview,
    );
  }

  private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    const logoPath = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "resources",
        "postgres-vsc-icon.png",
      ),
    );
    const nonce = this._getNonce();
    const cspSource = webview.cspSource;

    let connectionData: any = null;
    if (this._connectionToEdit) {
      // Get the password from secret storage
      const password = await SecretStorageService.getInstance().getPassword(
        this._connectionToEdit.id,
      );
      connectionData = {
        ...this._connectionToEdit,
        password,
      };
    }

    // Dynamic content for placeholders
    const pageTitle = this._connectionToEdit
      ? "Edit Connection"
      : "Add SQL Connection";
    const headerTitle = this._connectionToEdit
      ? "Edit Connection"
      : "New Connection";
    const submitButtonText = this._connectionToEdit
      ? "Save Changes"
      : "Add Connection";

    try {
      // Load template files
      const templatesDir = vscode.Uri.joinPath(
        this._extensionUri,
        "templates",
        "connection-form",
      );

      const [htmlBuffer, cssBuffer, jsBuffer] = await Promise.all([
        vscode.workspace.fs.readFile(
          vscode.Uri.joinPath(templatesDir, "index.html"),
        ),
        vscode.workspace.fs.readFile(
          vscode.Uri.joinPath(templatesDir, "styles.css"),
        ),
        vscode.workspace.fs.readFile(
          vscode.Uri.joinPath(templatesDir, "scripts.js"),
        ),
      ]);

      let html = new TextDecoder().decode(htmlBuffer);
      const css = new TextDecoder().decode(cssBuffer);
      let js = new TextDecoder().decode(jsBuffer);

      // Build CSP string
      const csp = `default-src 'none'; img-src ${cspSource} https:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;

      // Replace JavaScript placeholder for connection data with regex to be safe against spacing issues
      // const connectionDataJs = JSON.stringify(connectionData) || 'null';
      // js = js.replace(/{{\s*CONNECTION_DATA\s*}}/, () => connectionDataJs);
      // Safe replacement using a function to avoid special replacement patterns in the data string
      js = js.replace(
        /{{\s*CONNECTION_DATA\s*}}/,
        () => JSON.stringify(connectionData) || "null",
      );
      console.log("Connection form template loaded and processed");

      // Replace HTML placeholders
      html = html.replace("{{CSP}}", csp);
      html = html.replace("{{INLINE_STYLES}}", () => css);
      html = html.replace("{{INLINE_SCRIPTS}}", () => js);
      html = html.replace(/\{\{NONCE\}\}/g, nonce);
      html = html.replace("{{LOGO_URI}}", logoPath.toString());
      html = html.replace("{{PAGE_TITLE}}", () => pageTitle);
      html = html.replace("{{HEADER_TITLE}}", () => headerTitle);
      html = html.replace("{{SUBMIT_BUTTON_TEXT}}", () => submitButtonText);

      return html;
    } catch (error) {
      console.error("Failed to load connection form templates:", error);
      return `<!DOCTYPE html>
      <html>
      <body>
        <h1>Error loading Connection Form</h1>
        <p>Could not load template files. Please check that the extension is installed correctly.</p>
        <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
      </body>
      </html>`;
    }
  }

  private _getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private getStoredConnections(): ConnectionInfo[] {
    const connections =
      vscode.workspace
        .getConfiguration()
        .get<ConnectionInfo[]>("nexql.connections") || [];
    return connections;
  }

  private async storeConnections(connections: ConnectionInfo[]): Promise<void> {
    await writeConnectionsToWorkspace(this._extensionContext, connections);
  }

  /**
   * Sends the list of registered engines to the webview for the engine selector dropdown.
   */
  private _sendRegisteredEngines(): void {
    const registry = DriverRegistry.getInstance();
    const engines = registry.getRegisteredEngines().map((engine) => {
      return { id: engine, displayName: engine.charAt(0).toUpperCase() + engine.slice(1) };
    });
    this._panel.webview.postMessage({
      type: "registeredEngines",
      engines,
    });
  }

  private dispose() {
    ConnectionFormPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
