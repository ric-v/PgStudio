"use strict";
// Comprehensive mock of a subset of the `vscode` API used by tests
// This mock focuses on types and members referenced in the codebase and tests.
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickPickItemKind = exports.ViewColumn = exports.Uri = exports.NotebookController = exports.NotebookCell = exports.Position = exports.SnippetString = exports.MarkdownString = exports.CompletionItemKind = exports.CompletionItem = exports.NotebookEditor = exports.NotebookDocument = exports.NotebookCellOutputItem = exports.NotebookCellOutput = exports.WorkspaceEdit = exports.NotebookEdit = exports.NotebookRange = exports.NotebookCellData = exports.NotebookCellKind = exports.TreeItem = exports.TreeItemCollapsibleState = exports.languages = exports.commands = exports.window = exports.env = exports.Disposable = exports.EventEmitter = exports.ThemeIcon = exports.ThemeColor = exports.workspace = exports.ProgressLocation = exports.OutputChannel = void 0;
class OutputChannel {
    appendLine(_s) { }
    show() { }
    dispose() { }
}
exports.OutputChannel = OutputChannel;
exports.ProgressLocation = { Notification: 1, Window: 2, SourceControl: 3 };
exports.workspace = {
    getConfiguration: (_section) => ({ get: (_k, _d) => _d, update: async () => { } }),
    onDidChangeConfiguration: (_cb) => ({ dispose: () => { } }),
    fs: {
        readFile: async (_uri) => new Uint8Array(),
        writeFile: async (_uri, _b) => { }
    },
    notebookDocuments: [],
    onDidOpenNotebookDocument: () => ({ dispose: () => { } }),
    onDidSaveNotebookDocument: () => ({ dispose: () => { } }),
    onDidChangeNotebookDocument: () => ({ dispose: () => { } }),
    onDidCloseNotebookDocument: () => ({ dispose: () => { } }),
    applyEdit: async (_edit) => true
};
class ThemeColor {
    constructor(id) {
        this.id = id;
    }
}
exports.ThemeColor = ThemeColor;
class ThemeIcon {
    constructor(id, color) {
        this.id = id;
        this.color = color;
    }
}
exports.ThemeIcon = ThemeIcon;
class EventEmitter {
    constructor() {
        this.listeners = [];
        this.event = (listener) => { this.listeners.push(listener); return { dispose: () => { } }; };
        this.fire = (e) => { this.listeners.forEach(l => l(e)); };
    }
}
exports.EventEmitter = EventEmitter;
class Disposable {
    dispose() { }
}
exports.Disposable = Disposable;
exports.env = { clipboard: { writeText: async (_s) => { } } };
exports.window = {
    createOutputChannel: (_name) => new OutputChannel(),
    showErrorMessage: async (_msg) => undefined,
    showInformationMessage: async (_msg) => undefined,
    showWarningMessage: async (_msg) => undefined,
    showQuickPick: async (_items, _opts) => undefined,
    showSaveDialog: async (_opts) => undefined,
    createTreeView: (_id, _opts) => ({ reveal: async () => { } }),
    withProgress: async (_opt, _cb) => { return await _cb({ report: (_) => { } }); }
};
exports.commands = { registerCommand: (_name, _cb) => ({ dispose: () => { } }), executeCommand: async (_cmd, ..._args) => undefined };
exports.languages = { registerCompletionItemProvider: (_selector, _provider) => ({ dispose: () => { } }) };
exports.TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
class TreeItem {
    constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
}
exports.TreeItem = TreeItem;
exports.NotebookCellKind = { Markup: 1, Code: 2 };
class NotebookCellData {
    constructor(kind, value, language) {
        this.kind = kind;
        this.value = value;
        this.language = language;
    }
}
exports.NotebookCellData = NotebookCellData;
class NotebookRange {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}
exports.NotebookRange = NotebookRange;
class NotebookEdit {
    constructor(range, newCells) {
        this.range = range;
        this.newCells = newCells;
    }
    static replaceCells(range, newCells) {
        return new NotebookEdit(range, newCells);
    }
    static insertCells(index, newCells) {
        return new NotebookEdit(new NotebookRange(index, index), newCells);
    }
}
exports.NotebookEdit = NotebookEdit;
class WorkspaceEdit {
    constructor() {
        this.map = new Map();
    }
    set(uri, edits) { this.map.set(uri.toString(), edits); }
}
exports.WorkspaceEdit = WorkspaceEdit;
class NotebookCellOutput {
    constructor(items, metadata) {
        this.items = items;
        this.metadata = metadata;
    }
}
exports.NotebookCellOutput = NotebookCellOutput;
class NotebookCellOutputItem {
    constructor(data, mime) {
        this.data = data;
        this.mime = mime;
    }
    static text(v, m) {
        return new NotebookCellOutputItem(Buffer.from(v, 'utf8'), m || 'text/plain');
    }
    static json(o, m) {
        return new NotebookCellOutputItem(Buffer.from(JSON.stringify(o), 'utf8'), m || 'application/json');
    }
    static error(e) {
        return new NotebookCellOutputItem(Buffer.from(String(e), 'utf8'), 'application/vnd.code.notebook.error');
    }
}
exports.NotebookCellOutputItem = NotebookCellOutputItem;
class NotebookDocument {
    constructor(uri, metadata) { this.uri = uri; this.metadata = metadata || {}; }
}
exports.NotebookDocument = NotebookDocument;
class NotebookEditor {
    constructor() {
        this.notebook = new NotebookDocument(new Uri('/tmp/mock'));
    }
}
exports.NotebookEditor = NotebookEditor;
class CompletionItem {
    constructor(label, kind) {
        this.label = label;
        this.kind = kind;
    }
}
exports.CompletionItem = CompletionItem;
exports.CompletionItemKind = { Text: 0, Method: 1, Function: 2, Constructor: 3, Field: 4, Variable: 5, Class: 6, Interface: 7, Module: 8, Property: 9, Unit: 10, Value: 11, Enum: 12, Keyword: 13, Snippet: 14, Color: 15, File: 16, Reference: 17, Folder: 18, EnumMember: 19, Constant: 20, Struct: 21, Event: 22, Operator: 23, TypeParameter: 24 };
class MarkdownString {
    constructor(value) {
        this.value = value;
    }
    appendCodeblock(_v, _lang) { return this; }
    appendMarkdown(_v) { return this; }
    appendText(_v) { return this; }
}
exports.MarkdownString = MarkdownString;
class SnippetString {
    constructor(value) {
        this.value = value;
    }
    appendText(_v) { return this; }
    appendTabstop(_n) { return this; }
    appendPlaceholder(_v, _n) { return this; }
    appendVariable(_n, _d) { return this; }
}
exports.SnippetString = SnippetString;
class Position {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}
exports.Position = Position;
class NotebookCell {
    constructor(document, index, kind) {
        this.document = document;
        this.index = index;
        this.kind = kind;
        this.outputs = [];
    }
}
exports.NotebookCell = NotebookCell;
class NotebookController {
    createNotebookCellExecution(_cell) { return { start: () => { }, end: () => { }, replaceOutput: () => { }, clearOutput: () => { } }; }
}
exports.NotebookController = NotebookController;
class Uri {
    constructor(fsPath) {
        this.fsPath = fsPath;
    }
    toString() { return this.fsPath; }
    static file(path) { return new Uri(path); }
    static parse(s) { return new Uri(s); }
    static joinPath(base, ...segments) { return new Uri([base.fsPath, ...segments].join('/')); }
}
exports.Uri = Uri;
exports.ViewColumn = { One: 1, Two: 2, Three: 3 };
exports.QuickPickItemKind = { Separator: -1, Default: 0 };
// wire up helpers
exports.workspace.applyEdit = async (_e) => true;
exports.window.createWebviewPanel = (_vt, _title, _show, _opts) => ({ webview: { html: undefined, onDidReceiveMessage: (_cb) => ({ dispose: () => { } }), postMessage: async (_m) => true, asWebviewUri: (u) => u }, reveal: (_c) => { }, onDidDispose: (_cb) => ({ dispose: () => { } }) });
// default namespace-like export
const vscode = { Thenable: undefined, Memento: undefined, ExtensionContext: undefined, ProgressLocation: exports.ProgressLocation, workspace: exports.workspace, window: exports.window, commands: exports.commands, languages: exports.languages, EventEmitter, Disposable, TreeItem, TreeItemCollapsibleState: exports.TreeItemCollapsibleState, NotebookCellKind: exports.NotebookCellKind, NotebookCellData, NotebookRange, NotebookEdit, WorkspaceEdit, NotebookCellOutput, NotebookCellOutputItem, NotebookDocument, NotebookEditor, CompletionItem, CompletionItemKind: exports.CompletionItemKind, MarkdownString, SnippetString, Uri, SecretStorage, ThemeColor, ThemeIcon, env: exports.env, ViewColumn: exports.ViewColumn, Webview, WebviewPanel, QuickPickItemKind: exports.QuickPickItemKind, QuickPickItem };
exports.default = vscode;
