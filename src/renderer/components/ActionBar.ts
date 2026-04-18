import { createButton } from './ui';

/**
 * ActionBar component for the Result Panel table data view.
 * Renders a split bar with data actions on the left and AI actions on the right,
 * separated by a visible vertical divider.
 */

export interface ActionBarOptions {
  onSelectAll: () => void;
  onCopy: () => void;
  onImport: () => void;
  onExport: (exportBtn: HTMLElement) => void;
  onSendToChat: () => void;
  onAnalyzeWithAI: () => void;
  onOptimize: () => void;
}

/**
 * Creates an action bar element with data actions (left) and AI actions (right).
 * Layout: [ Select All | Copy | Import | Export ] | [ Send to Chat | Analyze with AI | Optimize ]
 */
export function createActionBar(options: ActionBarOptions): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    gap: 8px;
    font-family: var(--vscode-font-family);
  `;

  // Left group: data actions
  const leftGroup = document.createElement('div');
  leftGroup.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
  `;
  leftGroup.appendChild(createButton('☐ Select All', true, 'neutral'));
  leftGroup.lastElementChild?.addEventListener('click', options.onSelectAll);
  leftGroup.appendChild(createButton('⎘ Copy', true, 'neutral'));
  leftGroup.lastElementChild?.addEventListener('click', options.onCopy);
  leftGroup.appendChild(createButton('⬆ Import', true, 'neutral'));
  leftGroup.lastElementChild?.addEventListener('click', options.onImport);

  // Export button — passed to onExport so the dropdown can anchor to it
  const exportBtn = createButton('↓ Export', true, 'neutral');
  exportBtn.style.position = 'relative';
  exportBtn.onclick = () => options.onExport(exportBtn);
  leftGroup.appendChild(exportBtn);

  // Vertical divider
  const divider = document.createElement('div');
  divider.style.cssText = `
    border-left: 1px solid var(--vscode-panel-border);
    align-self: stretch;
    margin: 2px 4px;
  `;

  // Right group: AI actions
  const rightGroup = document.createElement('div');
  rightGroup.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
  `;
  rightGroup.appendChild(createButton('✦ Send to Chat', true, 'ai'));
  rightGroup.lastElementChild?.addEventListener('click', options.onSendToChat);
  rightGroup.appendChild(createButton('◎ Analyze with AI', true, 'ai'));
  rightGroup.lastElementChild?.addEventListener('click', options.onAnalyzeWithAI);
  rightGroup.appendChild(createButton('⚡ Optimize', true, 'ai'));
  rightGroup.lastElementChild?.addEventListener('click', options.onOptimize);

  container.appendChild(leftGroup);
  container.appendChild(divider);
  container.appendChild(rightGroup);

  return container;
}
