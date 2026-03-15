// Comprehensive mock of a subset of the `vscode` API used by tests
// This mock focuses on types and members referenced in the codebase and tests.

export type Thenable<T> = Promise<T>;
declare global { type Thenable<T> = Promise<T>; }

export interface Memento {
  get<T>(key: string, defaultValue?: T): T;
  update(key: string, value: any): Thenable<void>;
}

export interface ExtensionContext {
  subscriptions: { dispose(): void }[];
  workspaceState: Memento;
  globalState: Memento;
  extensionPath?: string;
  extensionUri?: Uri;
  secrets?: {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
}

export class OutputChannel { appendLine(_s: string) { } show() { } dispose() { } }

export const ProgressLocation = { Notification: 1, Window: 2, SourceControl: 3 } as const;

export const workspace = {
  getConfiguration: (_section?: string) => ({ get: <T>(_k: string, _d?: T) => _d as T, update: async () => { } }),
  onDidChangeConfiguration: (_cb?: any) => ({ dispose: () => { } }),
  fs: {
    readFile: async (_uri: any) => new Uint8Array(),
    writeFile: async (_uri: any, _b: Uint8Array) => { }
  },
  notebookDocuments: [] as any[],
  onDidOpenNotebookDocument: () => ({ dispose: () => { } }),
  onDidSaveNotebookDocument: () => ({ dispose: () => { } }),
  onDidChangeNotebookDocument: () => ({ dispose: () => { } }),
  onDidCloseNotebookDocument: () => ({ dispose: () => { } }),
  applyEdit: async (_edit: any) => true
} as any;

export class ThemeColor { constructor(public id: string) { } }
export class ThemeIcon { constructor(public id: string, public color?: ThemeColor) { } }

export class EventEmitter<T = any> {
  private listeners: ((e: T) => any)[] = [];
  event = (listener: (e: T) => any) => { this.listeners.push(listener); return { dispose: () => { } }; };
  fire = (e?: T) => { this.listeners.forEach(l => l(e as T)); };
}

export class Disposable { dispose() { } }

export const env = { clipboard: { writeText: async (_s: string) => { } } } as any;

export const window = {
  createOutputChannel: (_name?: string) => new OutputChannel(),
  showErrorMessage: async (_msg?: string) => undefined,
  showInformationMessage: async (_msg?: string) => undefined,
  showWarningMessage: async (_msg?: string) => undefined,
  showQuickPick: async (_items?: any[], _opts?: any) => undefined,
  showSaveDialog: async (_opts?: any) => undefined,
  createTreeView: (_id: string, _opts?: any) => ({ reveal: async () => { } }),
  withProgress: async (_opt: any, _cb: any) => { return await _cb({ report: (_: any) => { } }); }
} as any;

export const commands = { registerCommand: (_name: string, _cb?: any) => ({ dispose: () => { } }), executeCommand: async (_cmd: string, ..._args: any[]) => undefined } as any;

export const languages = { registerCompletionItemProvider: (_selector: any, _provider: any) => ({ dispose: () => { } }) } as any;

export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 } as const;
export type TreeItemCollapsibleState = typeof TreeItemCollapsibleState[keyof typeof TreeItemCollapsibleState];
export class TreeItem { constructor(public label: string, public collapsibleState?: TreeItemCollapsibleState) { } }

export const NotebookCellKind = { Markup: 1, Code: 2 } as const;
export type NotebookCellKind = typeof NotebookCellKind[keyof typeof NotebookCellKind];

export class NotebookCellData { constructor(public kind: NotebookCellKind, public value: string, public language?: string) { } }
export class NotebookRange { constructor(public start: number, public end: number) { } }
export class NotebookEdit { constructor(public range: NotebookRange, public cells: NotebookCellData[]) { } }
export class WorkspaceEdit { private map = new Map<any, any[]>(); set(uri: Uri, edits: any[]) { this.map.set(uri.toString(), edits); } }

export class NotebookCellOutput { constructor(public items: any[], public metadata?: any) { } }
export class NotebookCellOutputItem { constructor(public data: any, public mime: string) { } static text(v: string, m?: string) { return new NotebookCellOutputItem(v, m || 'text/plain'); } static json(o: any, m?: string) { return new NotebookCellOutputItem(JSON.stringify(o), m || 'application/json'); } static error(e: any) { return new NotebookCellOutputItem(String(e), 'application/vnd.code.notebook.error'); } }

export class NotebookDocument { uri?: Uri; metadata?: any; constructor(uri?: Uri, metadata?: any) { this.uri = uri; this.metadata = metadata || {}; } }
export class NotebookEditor { notebook: NotebookDocument = new NotebookDocument(new Uri('/tmp/mock')); selection?: NotebookRange; }

export class CompletionItem { detail?: string; documentation?: string | MarkdownString; insertText?: string | SnippetString; constructor(public label: string, public kind?: number) { } }
export const CompletionItemKind = { Text: 0, Method: 1, Function: 2, Constructor: 3, Field: 4, Variable: 5, Class: 6, Interface: 7, Module: 8, Property: 9, Unit: 10, Value: 11, Enum: 12, Keyword: 13, Snippet: 14, Color: 15, File: 16, Reference: 17, Folder: 18, EnumMember: 19, Constant: 20, Struct: 21, Event: 22, Operator: 23, TypeParameter: 24 } as const;
export type CompletionItemKind = typeof CompletionItemKind[keyof typeof CompletionItemKind];

export class MarkdownString { constructor(public value?: string) { } appendCodeblock(_v: string, _lang?: string) { return this; } appendMarkdown(_v: string) { return this; } appendText(_v: string) { return this; } }
export class SnippetString { constructor(public value?: string) { } appendText(_v: string) { return this; } appendTabstop(_n?: number) { return this; } appendPlaceholder(_v: string, _n?: number) { return this; } appendVariable(_n: string, _d?: string) { return this; } }

export interface TextDocument { getText(range?: any): string; uri?: Uri; }
export class Position { constructor(public line: number, public character: number) { } }
export interface CancellationToken { readonly isCancellationRequested?: boolean; }
export interface CompletionContext { triggerKind?: number; triggerCharacter?: string; }
export interface CompletionItemProvider { provideCompletionItems(document: TextDocument, position: Position, token?: CancellationToken, context?: CompletionContext): Thenable<any> | any }

export class NotebookCell { outputs: NotebookCellOutput[] = []; constructor(public document: NotebookDocument, public index: number, public kind?: NotebookCellKind) { } }
export class NotebookController { createNotebookCellExecution(_cell: NotebookCell) { return { start: () => { }, end: () => { }, replaceOutput: () => { }, clearOutput: () => { } }; } }

export class NotebookCellOutputItem { /* static helpers above */ }

export class Uri { constructor(public fsPath: string) { } toString() { return this.fsPath; } static file(path: string) { return new Uri(path); } static parse(s: string) { return new Uri(s); } static joinPath(base: Uri, ...segments: string[]) { return new Uri([base.fsPath, ...segments].join('/')); } }

export const ViewColumn = { One: 1, Two: 2, Three: 3 } as const;
export interface Webview { html?: string; onDidReceiveMessage(cb: (m: any) => any): { dispose(): void }; postMessage(m: any): Thenable<boolean>; asWebviewUri(uri: Uri): Uri }
export interface WebviewPanel { webview: Webview; reveal(column?: any): void; onDidDispose(cb: () => any): { dispose(): void } }
export const QuickPickItemKind = { Separator: -1, Default: 0 } as const;
export interface QuickPickItem { label: string; description?: string; detail?: string; original?: any }

// wire up helpers
(workspace as any).applyEdit = async (_e: any) => true;
(window as any).createWebviewPanel = (_vt: string, _title: string, _show: any, _opts?: any) => ({ webview: { html: undefined, onDidReceiveMessage: (_cb: any) => ({ dispose: () => { } }), postMessage: async (_m: any) => true, asWebviewUri: (u: Uri) => u }, reveal: (_c?: any) => { }, onDidDispose: (_cb: any) => ({ dispose: () => { } }) } as any);

// default namespace-like export
const vscode = { Thenable: undefined, Memento: undefined, ExtensionContext: undefined, ProgressLocation, workspace, window, commands, languages, EventEmitter, Disposable, TreeItem, TreeItemCollapsibleState, NotebookCellKind, NotebookCellData, NotebookRange, NotebookEdit, WorkspaceEdit, NotebookCellOutput, NotebookCellOutputItem, NotebookDocument, NotebookEditor, CompletionItem, CompletionItemKind, MarkdownString, SnippetString, Uri, SecretStorage, ThemeColor, ThemeIcon, env, ViewColumn, Webview, WebviewPanel, QuickPickItemKind, QuickPickItem } as any;
export default vscode;
