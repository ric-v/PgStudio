import * as vscode from 'vscode';
import { DriverRegistry } from '../../core/db/registry';
import { resolveDbEngine, DEFAULT_DB_ENGINE } from '../../core/db/DbEngine';
import { getPgDataTypeName } from '../../common/pgDataTypeNames';

interface NotebookMetadata {
  connectionId: string;
  databaseName: string;
  engine?: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

interface Cell {
  value: string;
  kind?: 'markdown' | 'sql';
  /** Legacy: older saves used "postgres"; normalized to sql on load. */
  language?: 'markdown' | 'sql' | 'postgres';
}

export class PostgresNotebookProvider implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    let metadata: NotebookMetadata | undefined;
    let cells: vscode.NotebookCellData[] = [];

    if (content.byteLength > 0) {
      try {
        const data = JSON.parse(Buffer.from(content).toString());
        if (data.metadata) {
          metadata = data.metadata;
        }
        if (Array.isArray(data.cells)) {
          cells = data.cells.map((cell: Cell) => {
            const isMarkdown = cell.kind === 'markdown';
            return new vscode.NotebookCellData(
              isMarkdown ? vscode.NotebookCellKind.Markup : vscode.NotebookCellKind.Code,
              cell.value,
              isMarkdown ? 'markdown' : 'sql'
            );
          });
        }
      } catch {
        cells = [
          new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            '-- Write your SQL query here\nSELECT NOW();',
            'sql'
          )
        ];
      }
    } else {
      cells = [
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          '-- Write your SQL query here\nSELECT NOW();',
          'sql'
        )
      ];
    }

    const notebookData = new vscode.NotebookData(cells);
    if (metadata) {
      // Ensure engine identifier is stored in notebook metadata
      const engine = resolveDbEngine(metadata.engine || DEFAULT_DB_ENGINE);
      const registry = DriverRegistry.getInstance();
      let engineDisplayName = engine;
      if (registry.isRegistered(engine)) {
        // Use the engine identifier as display name; the full display name
        // is available from the registration but we use a safe accessor
        const registeredEngines = registry.getRegisteredEngines();
        if (registeredEngines.includes(engine)) {
          engineDisplayName = engine.charAt(0).toUpperCase() + engine.slice(1);
        }
      }

      notebookData.metadata = {
        ...metadata,
        engine,
        engineDisplayName,
        custom: {
          cells: [],
          metadata: {
            ...metadata,
            engine,
            engineDisplayName,
            enableScripts: true
          }
        }
      };
    }
    return notebookData;
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    const cells: Cell[] = data.cells.map((cell): Cell => ({
      value: cell.value,
      kind: cell.kind === vscode.NotebookCellKind.Markup ? 'markdown' : 'sql',
      language: cell.kind === vscode.NotebookCellKind.Markup ? 'markdown' : 'sql'
    }));

    const metadata = {
      ...data.metadata,
      custom: {
        cells: cells,
        metadata: {
          ...data.metadata,
          enableScripts: true
        }
      }
    };

    return Buffer.from(JSON.stringify({
      cells,
      metadata
    }));
  }
}

export class PostgresNotebookController {
  readonly controllerId = 'nexql-notebook-controller';
  readonly notebookType = 'nexql-notebook';
  readonly label = 'SQL Notebook';
  readonly supportedLanguages = ['sql'];

  private readonly _controller: vscode.NotebookController;
  private _executionOrder = 0;

  constructor(private client: () => any | undefined) {
    this._controller = vscode.notebooks.createNotebookController(
      this.controllerId,
      this.notebookType,
      this.label
    );

    this._controller.supportedLanguages = this.supportedLanguages;
    this._controller.supportsExecutionOrder = true;
    this._controller.executeHandler = this._execute.bind(this);
  }

  dispose() {
    this._controller.dispose();
  }

  private async _execute(
    cells: vscode.NotebookCell[],
    _notebook: vscode.NotebookDocument,
    _controller: vscode.NotebookController
  ): Promise<void> {
    const client = this.client();
    if (!client) {
      vscode.window.showErrorMessage('Please connect to a database first');
      return;
    }

    for (const cell of cells) {
      const execution = this._controller.createNotebookCellExecution(cell);
      execution.executionOrder = ++this._executionOrder;
      execution.start(Date.now());

      try {
        const result = await client.query(cell.document.getText());

        // Create a JSON output for the custom renderer
        const outputData = {
          columns: result.fields.map((field: { name: string }) => field.name),
          rows: result.rows,
          rowCount: result.rowCount,
          command: result.command,
          columnTypes: result.fields.reduce(
            (acc: Record<string, string>, f: { name: string; dataTypeID: number }) => {
              acc[f.name] = getPgDataTypeName(f.dataTypeID);
              return acc;
            },
            {} as Record<string, string>,
          ),
        };

        execution.replaceOutput([
          new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.json(outputData, 'application/x-nexql-result')
          ])
        ]);
        execution.end(true, Date.now());
      } catch (err) {
        execution.replaceOutput([
          new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.error(err as Error)
          ])
        ]);
        execution.end(false, Date.now());
      }
    }
  }
}
