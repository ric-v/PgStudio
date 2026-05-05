import { expect } from 'chai';

import { computePlanHotspots, normalizeExplainPlan } from '../../features/planStudio/planModel';

describe('planModel', () => {
  it('normalizes explain payload and computes hotspots', () => {
    const payload = [{
      Plan: {
        'Node Type': 'Hash Join',
        'Total Cost': 250,
        'Plan Rows': 20,
        'Actual Rows': 18,
        'Actual Total Time': 42,
        Plans: [
          {
            'Node Type': 'Seq Scan',
            'Total Cost': 210,
            'Plan Rows': 100,
            'Actual Rows': 85,
            'Actual Total Time': 31,
            'CTE Name': 'my_cte',
          },
          {
            'Node Type': 'Function Scan',
            'Total Cost': 10,
            'Plan Rows': 5,
            'Actual Rows': 5,
            'Actual Total Time': 2,
            'Function Name': 'public.fn_1',
          },
        ],
      },
    }];

    const normalized = normalizeExplainPlan(payload);
    expect(normalized).to.not.equal(null);
    expect(normalized?.root.nodeType).to.equal('Hash Join');
    expect(normalized?.totalNodes).to.equal(3);
    expect(normalized?.root.children[0].cteName).to.equal('my_cte');
    expect(normalized?.root.children[1].functionName).to.equal('public.fn_1');

    const hotspots = computePlanHotspots(normalized!, 2);
    expect(hotspots).to.have.length(2);
    expect(hotspots[0].nodeType).to.equal('Hash Join');
    expect(hotspots[0].costSharePercent).to.be.greaterThan(50);
  });

  it('returns null for invalid payload', () => {
    expect(normalizeExplainPlan(undefined)).to.equal(null);
    expect(normalizeExplainPlan({ nope: true })).to.equal(null);
    expect(normalizeExplainPlan('not-json')).to.equal(null);
  });
});
