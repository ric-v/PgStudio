import { createButton } from '../components/ui';

export const createImportButton = (
  columns: string[],
  tableInfo: any | undefined,
  context?: { postMessage?: (msg: any) => void }
) => {
  const importBtn = createButton('Import', true);
  importBtn.style.position = 'relative';

  if (!tableInfo) {
    importBtn.style.display = 'none';
    return importBtn;
  }

  importBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Delegate to the extension host so it can open the same Import Data wizard
    // used by the table context menu.
    context?.postMessage?.({
      type: 'openImportData',
      table: tableInfo.table,
      schema: tableInfo.schema,
      columns,
    });
  });

  return importBtn;
};

// Keep showImportModal exported for any legacy callers, but it now just triggers the host flow.
export function showImportModal(
  tableColumns: string[],
  tableInfo: any,
  context?: { postMessage?: (msg: any) => void }
) {
  context?.postMessage?.({
    type: 'openImportData',
    table: tableInfo.table,
    schema: tableInfo.schema,
    columns: tableColumns,
  });
}
