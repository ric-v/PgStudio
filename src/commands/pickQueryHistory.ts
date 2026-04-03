import * as vscode from 'vscode';
import { QueryHistoryService, QueryHistoryItem } from '../services/QueryHistoryService';

const QUERY_PREVIEW_MAX_CHARS = 80;

function truncateQueryForLabel(query: string): string {
  const clean = query.replace(/^(\s*(--.*)|(\/\*[\s\S]*?\*\/)\s*)*/gm, '').trim();
  const flat = clean.replace(/\s+/g, ' ');
  if (flat.length <= QUERY_PREVIEW_MAX_CHARS) {
    return flat || '<empty query>';
  }
  return `${flat.slice(0, QUERY_PREVIEW_MAX_CHARS)}…`;
}

/**
 * Command palette entry: pick a past query and open it in an editor (same as the history tree).
 */
export async function pickQueryHistory(): Promise<void> {
  const items = QueryHistoryService.getInstance().getHistory();
  if (items.length === 0) {
    await vscode.window.showInformationMessage('No query history yet.');
    return;
  }

  const picks = items.map((h: QueryHistoryItem) => ({
    label: truncateQueryForLabel(h.query),
    description: new Date(h.timestamp).toLocaleString(),
    detail: `${h.success ? 'Success' : 'Failed'}${h.connectionName ? ` · ${h.connectionName}` : ''}`,
    item: h,
  }));

  const selected = await vscode.window.showQuickPick(picks, {
    placeHolder: 'Select a query to open in an editor',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (selected) {
    await vscode.commands.executeCommand('postgres-explorer.openQuery', selected.item);
  }
}
