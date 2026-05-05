import { PlanDiff, PlanNodeDiff } from '../../services/PlanDiffEngine';

/**
 * Two-pane UI for visualizing plan diffs with delta highlighting
 * Renders in VS Code notebook webview context
 */
export class PlanDiffViewer {
  private planDiff: PlanDiff | null = null;

  constructor(private container: HTMLElement) {}

  /**
   * Render the diff viewer
   */
  public render(diff: PlanDiff): void {
    this.planDiff = diff;
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'plan-diff-viewer';
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--vscode-font-family);
      color: var(--vscode-editor-foreground);
    `;

    // Header
    wrapper.appendChild(this.renderHeader());

    // Summary
    wrapper.appendChild(this.renderSummary());

    // Diff table
    wrapper.appendChild(this.renderDiffTable());

    this.container.appendChild(wrapper);
  }

  /**
   * Render header with title and summary stats
   */
  private renderHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid var(--vscode-widget-border);
      background: color-mix(in srgb, var(--vscode-editor-background) 92%, transparent);
    `;

    const title = document.createElement('h2');
    title.textContent = `📊 Plan Diff: ${this.planDiff?.planName || 'Comparison'}`;
    title.style.cssText = `
      margin: 0;
      font-size: 13px;
      font-weight: 600;
    `;
    header.appendChild(title);

    return header;
  }

  /**
   * Render summary panel
   */
  private renderSummary(): HTMLElement {
    const summary = document.createElement('div');
    summary.style.cssText = `
      padding: 12px 16px;
      background: color-mix(in srgb, var(--vscode-editor-background) 94%, transparent);
      border-bottom: 1px solid var(--vscode-widget-border);
    `;

    const diff = this.planDiff!.summary;

    const stats = document.createElement('div');
    stats.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      font-size: 13px;
    `;

    const costDeltaClass = diff.totalCostDelta > 0 ? 'diff-negative' : 'diff-positive';
    const timeDeltaClass = diff.totalTimeDelta > 0 ? 'diff-negative' : 'diff-positive';

    const createStatCard = (label: string, value: string, className?: string) => {
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 8px;
        background: color-mix(in srgb, var(--vscode-editor-background) 96%, transparent);
        border-left: 3px solid var(--vscode-textLink-foreground);
        border-radius: 6px;
        border: 1px solid var(--vscode-widget-border);
      `;
      card.className = className || '';
      card.innerHTML = `
        <div style="font-weight: 600; color: var(--vscode-editor-foreground);">${label}</div>
        <div style="font-size: 14px; margin-top: 4px;">${value}</div>
      `;
      return card;
    };

    stats.appendChild(createStatCard(
      'Total Cost Δ',
      `${diff.totalCostDelta > 0 ? '+' : ''}${diff.totalCostDelta.toFixed(2)}`,
      costDeltaClass
    ));
    stats.appendChild(createStatCard(
      'Total Time Δ',
      `${diff.totalTimeDelta > 0 ? '+' : ''}${diff.totalTimeDelta.toFixed(2)}ms`,
      timeDeltaClass
    ));
    stats.appendChild(createStatCard('Nodes Added', `${diff.nodesAdded}`));
    stats.appendChild(createStatCard('Nodes Removed', `${diff.nodesRemoved}`));
    stats.appendChild(createStatCard('Nodes Modified', `${diff.nodesModified}`));

    summary.appendChild(stats);

    if (diff.suggestion) {
      const suggestion = document.createElement('div');
      suggestion.style.cssText = `
        margin-top: 12px;
        padding: 8px 12px;
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent);
        border-left: 3px solid var(--vscode-textLink-foreground);
        border-radius: 6px;
        font-size: 12px;
      `;
      suggestion.innerHTML = `💡 <strong>Suggestion:</strong> ${diff.suggestion}`;
      summary.appendChild(suggestion);
    }

    return summary;
  }

  /**
   * Render diff table
   */
  private renderDiffTable(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 12px;
    `;

    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    `;

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.cssText = `
      background: color-mix(in srgb, var(--vscode-editor-background) 90%, transparent);
      border-bottom: 2px solid var(--vscode-widget-border);
      position: sticky;
      top: 0;
    `;
    headerRow.innerHTML = `
      <th style="padding: 8px; text-align: left; font-weight: 600; width: 15%;">Type</th>
      <th style="padding: 8px; text-align: left; font-weight: 600; width: 25%;">Node</th>
      <th style="padding: 8px; text-align: right; font-weight: 600; width: 15%;">Cost Δ</th>
      <th style="padding: 8px; text-align: right; font-weight: 600; width: 15%;">Time Δ (ms)</th>
      <th style="padding: 8px; text-align: right; font-weight: 600; width: 15%;">Rows Δ</th>
      <th style="padding: 8px; text-align: left; font-weight: 600; width: 15%;">Reason</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');
    for (const diff of this.planDiff!.nodeDiffs) {
      const row = this.createDiffRow(diff);
      tbody.appendChild(row);
    }
    table.appendChild(tbody);

    container.appendChild(table);
    return container;
  }

  /**
   * Create a single diff row
   */
  private createDiffRow(diff: PlanNodeDiff): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.style.cssText = `
      border-bottom: 1px solid var(--vscode-widget-border);
      padding: 8px;
      ${this.getRowBackgroundColor(diff.changeType)}
    `;

    const changeIcon = this.getChangeIcon(diff.changeType);

    const costDeltaStr = diff.costDelta !== undefined
      ? `${diff.costDelta > 0 ? '+' : ''}${diff.costDelta.toFixed(2)}`
      : '—';

    const timeDeltaStr = diff.timeDelta !== undefined
      ? `${diff.timeDelta > 0 ? '+' : ''}${diff.timeDelta.toFixed(2)}`
      : '—';

    const rowDeltaStr = diff.rowDelta !== undefined
      ? `${diff.rowDelta > 0 ? '+' : ''}${diff.rowDelta}`
      : '—';

    row.innerHTML = `
      <td style="padding: 8px;">${changeIcon}</td>
      <td style="padding: 8px; font-family: monospace; font-size: 11px;">${this.escapePath(diff.path.join(' > '))}</td>
      <td style="padding: 8px; text-align: right; font-weight: 500;">${this.formatDelta(costDeltaStr)}</td>
      <td style="padding: 8px; text-align: right; font-weight: 500;">${this.formatDelta(timeDeltaStr)}</td>
      <td style="padding: 8px; text-align: right;">${rowDeltaStr}</td>
      <td style="padding: 8px; font-size: 11px; color: #666;">${diff.reason || ''}</td>
    `;

    return row;
  }

  /**
   * Get background color based on change type
   */
  private getRowBackgroundColor(changeType: string): string {
    switch (changeType) {
      case 'added': return 'background: color-mix(in srgb, var(--vscode-testing-iconPassed) 16%, transparent);';
      case 'removed': return 'background: color-mix(in srgb, var(--vscode-errorForeground) 14%, transparent);';
      case 'modified': return 'background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent);';
      default: return 'background: white;';
    }
  }

  /**
   * Get icon for change type
   */
  private getChangeIcon(changeType: string): string {
    switch (changeType) {
      case 'added': return '✨';
      case 'removed': return '❌';
      case 'modified': return '⚠️';
      default: return '➖';
    }
  }

  /**
   * Format delta value with color coding
   */
  private formatDelta(value: string): string {
    if (value === '—') return value;
    
    if (value.startsWith('+')) {
      return `<span style="color: var(--vscode-errorForeground);">${value}</span>`;
    } else if (value.startsWith('-')) {
      return `<span style="color: var(--vscode-testing-iconPassed);">${value}</span>`;
    }
    return value;
  }

  /**
   * Escape HTML in path
   */
  private escapePath(path: string): string {
    return path
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Export diff as JSON
   */
  public export(): PlanDiff | null {
    return this.planDiff;
  }
}
