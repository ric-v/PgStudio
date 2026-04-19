import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { SqlExecutor } from '../../providers/kernel/SqlExecutor';

describe('SqlExecutor auto limit behavior', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(vscode.workspace, 'getConfiguration').returns({
      get: sandbox.stub().callsFake((key: string, defaultValue: any) => {
        if (key === 'postgresExplorer.query.autoLimitEnabled') {
          return true;
        }
        if (key === 'postgresExplorer.performance.defaultLimit') {
          return 25;
        }
        return defaultValue;
      }),
    } as any);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('applies the selected dialect limit and preserves trailing semicolons', () => {
    const executor = new SqlExecutor({ id: 'test-controller', createNotebookCellExecution: sandbox.stub() } as any);

    const limited = (executor as any).applyAutoLimit(
      'SELECT * FROM users;',
      { engine: 'mysql', readOnlyMode: false },
      { engine: 'mysql' },
      { autoLimitSelectResults: 7 }
    );

    expect(limited).to.equal('SELECT * FROM users LIMIT 7;');
  });

  it('leaves non-select statements unchanged', () => {
    const executor = new SqlExecutor({ id: 'test-controller', createNotebookCellExecution: sandbox.stub() } as any);

    const unchanged = (executor as any).applyAutoLimit(
      'UPDATE users SET name = \'x\'',
      { engine: 'sqlite', readOnlyMode: false },
      { engine: 'sqlite' },
      { autoLimitSelectResults: 10 }
    );

    expect(unchanged).to.equal('UPDATE users SET name = \'x\'');
  });
});