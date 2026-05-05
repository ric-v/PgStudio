import { expect } from 'chai';

import { PlanDiffEngine } from '../../services/PlanDiffEngine';

describe('PlanDiffEngine', () => {
  it('generates cte/function aware summary suggestions', () => {
    const planA: any = {
      'Node Type': 'Nested Loop',
      'Total Cost': 100,
      'Plan Rows': 10,
      'Actual Total Time': 10,
      Plans: [
        {
          'Node Type': 'CTE Scan',
          'Total Cost': 20,
          'Plan Rows': 5,
          'Actual Total Time': 2,
        },
      ],
    };
    const planB: any = {
      'Node Type': 'Nested Loop',
      'Total Cost': 120,
      'Plan Rows': 10,
      'Actual Total Time': 30,
      Plans: [
        {
          'Node Type': 'CTE Scan',
          'Total Cost': 80,
          'Plan Rows': 200,
          'Actual Total Time': 22,
        },
      ],
    };

    const diff = PlanDiffEngine.diffPlans(planA, planB);
    expect(diff.summary.totalTimeDelta).to.be.greaterThan(0);
    expect(diff.summary.suggestion).to.contain('CTE topology changed');
  });
});
